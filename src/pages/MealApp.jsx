// Last Updated: 2026-04-22 - Fixed bazar and pdf issues
import React, { useMemo, useRef, useState, useEffect, useTransition, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast, useConfirm } from '../contexts/ToastContext';
import { db } from '../firebase/db';

import {
  Users, ShoppingCart, Utensils, LayoutDashboard, Plus, Minus, Trash2, Calendar as CalendarIcon,
  Wallet, CreditCard, Lock, Unlock, ShieldCheck, AlertCircle, LogOut, Settings,
  AlertTriangle, Zap, History, Bell, Crown, Printer, RotateCcw, TrendingUp, TrendingDown,
  FileText, CheckCircle, XCircle, Clock, X, UserPlus, Star, Wifi, WifiOff, MessageSquare, MessageCircle, CheckSquare, CalendarCheck, Phone, Edit, Save, AlignLeft, Menu, User, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, setDoc, collection, onSnapshot, deleteDoc, addDoc, updateDoc, writeBatch, getDocs, getDoc, query, where, arrayUnion } from 'firebase/firestore';
import Loader, { SmoothLoader } from '../components/Loader';
import { sendEmail } from '../services/emailService';
import { MEMBER_NAME_MAX_LENGTH, clampMemberName } from '../constants/memberLimits';
import { getWhatsAppSupportUrl } from '../constants/support';
import { writeJoinKeyIndex } from '../utils/groupLookup';
import { generateGeminiText } from '../services/geminiService';
import { computeAdvancedMealRateProjection } from '../utils/mealRateForecast';

// --- Empty State Component ---
const EmptyState = ({ icon: Icon, title, subtitle, color = 'indigo', action }) => {
  const cm = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-500', border: 'border-indigo-200', sub: 'text-indigo-300' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-500', border: 'border-rose-200', sub: 'text-rose-300' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-200', sub: 'text-emerald-300' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-200', sub: 'text-amber-300' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200', sub: 'text-slate-300' },
  };
  const c = cm[color] || cm.indigo;
  return (
    <div className={`flex flex-col items-center justify-center py-14 px-6 rounded-3xl border-2 border-dashed ${c.border} ${c.bg}`}>
      <div className={`w-16 h-16 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center mb-4 shadow-sm ${c.text} transform transition-transform hover:scale-110 duration-300`}>
        {Icon && <Icon size={32} strokeWidth={1.5} />}
      </div>
      <p className={`font-black text-base ${c.text} mb-1 text-center`}>{title}</p>
      {subtitle && <p className={`text-xs font-medium text-center max-w-[200px] md:max-w-[300px] ${c.sub}`}>{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

// --- Helper: Robust Safe Data Rendering (CRASH PROTECTION) ---
const safeStr = (val) => {
  if (val === null || val === undefined) return "";
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return String(val);
  return "";
};

/** Member profile modal: scrollable list areas for long monthly data */
const MEMBER_DETAIL_LIST_SCROLL =
  'space-y-2 max-h-[min(45dvh,20rem)] min-h-0 overflow-y-auto overscroll-y-contain pr-1 scroll-smooth border border-slate-100 rounded-xl p-1 bg-slate-50/50';
const MEMBER_DETAIL_SCROLL_HINT =
  '\u09AC\u09C7\u09B6\u09BF \u09A6\u09BF\u09A8 \u09B9\u09B2\u09C7 \u09A8\u09BF\u099A\u09C7\u09B0 \u09AC\u0995\u09CD\u09B8\u09C7 \u09B8\u09CD\u0995\u09CD\u09B0\u09B2 \u0995\u09B0\u09C1\u09A8';

/** Old app default; if saved in mess_config it hid the real name from `groups`. */
const LEGACY_PLACEHOLDER_MESS_NAME = 'তালুকদার মিল ম্যানেজার';

const convertBengaliToEnglishNumbers = (str) => {
  if (str === null || str === undefined) return '';
  const bengaliNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(str).replace(/[০-৯]/g, (match) => bengaliNumbers.indexOf(match));
};

const toBengaliNumber = (str) => {
  const bengaliNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(str).replace(/[0-9]/g, (match) => bengaliNumbers[match]);
};

const toBengaliMonth = (monthCode) => {
  const [year, month] = monthCode.split('-');
  const months = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  return `${months[parseInt(month) - 1]} ${toBengaliNumber(year)}`;
};

const safeNum = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  const englishVal = convertBengaliToEnglishNumbers(val);
  const n = Number(englishVal);
  return isNaN(n) ? 0 : n;
};

const getMonthKey = (dateVal) => {
  if (!dateVal) return '';
  try {
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}/.test(dateVal)) {
      return dateVal.slice(0, 7);
    }
    const d = dateVal && typeof dateVal.toDate === 'function'
      ? dateVal.toDate()
      : new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  } catch (e) {
    return '';
  }
};

const formatDate = (dateVal, toBengali = false) => {
  if (!dateVal) return "";
  try {
    let d;
    if (dateVal && typeof dateVal.toDate === 'function') {
      d = dateVal.toDate();
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) return "";
    const enDate = d.toLocaleDateString('en-GB');
    return toBengali ? toBengaliNumber(enDate) : enDate;
  } catch (e) {
    return "";
  }
};

const parseGeminiJsonResponse = (text) => {
  if (!text) throw new Error('AI response খালি এসেছে।');
  const cleaned = String(text).replace(/```json|```/gi, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : cleaned);
};

const TAB_DATA_REQUIREMENTS = {
  dashboard: ['meals', 'bazar', 'deposits', 'fines', 'billTracking'],
  bills: ['deposits', 'fines', 'billTracking'],
  meals: ['meals'],
  bazar: ['bazar', 'bazarRequests'],
  fine: ['fines'],
  vote: ['polls'],
  bua: ['bua'],
  menu: ['weeklyMenu'],
  deposit: ['deposits'],
  settings: ['joinRequests', 'meals', 'bazar', 'deposits', 'fines', 'billTracking'],
  members: ['joinRequests', 'meals', 'bazar', 'deposits', 'fines', 'billTracking'],
};

export default function MealApp() {
  const { groupId: rawGroupId } = useParams();
  // URL format: "mess-name--firebaseId" → extract the real Firebase ID after the last '--'
  const appId = rawGroupId?.includes('--') ? rawGroupId.split('--').pop() : rawGroupId;
  const { currentUser, userProfile, logout } = useAuth();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const [trialDaysLeft, setTrialDaysLeft] = useState(30);
  const [showTrialPopup, setShowTrialPopup] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); }
  }, []);

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [members, setMembers] = useState([]);
  const [bazarList, setBazarList] = useState([]);
  const [bazarRequests, setBazarRequests] = useState([]);
  const [meals, setMeals] = useState({});
  const [deposits, setDeposits] = useState([]);
  const [fines, setFines] = useState([]);
  const [bills, setBills] = useState({ wifi: 0, current: 0, rent: 0, maid: 0, pcCharge: 0 });
  const [billTracking, setBillTracking] = useState({});
  const [joinRequests, setJoinRequests] = useState([]);
  const [polls, setPolls] = useState([]);
  const [buaData, setBuaData] = useState([]);
  const [weeklyMenu, setWeeklyMenu] = useState({});
  const [isGeneratingMenu, setIsGeneratingMenu] = useState(false);
  const [geminiKeyModal, setGeminiKeyModal] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [permError, setPermError] = useState(null);
  const [isManager, setIsManager] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [idError, setIdError] = useState(false);
  const [premiumPrice, setPremiumPrice] = useState(299);


  const [newMemberName, setNewMemberName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showResetModal, setShowResetModal] = useState(false);
  const [bazarRows, setBazarRows] = useState([{ id: 1, item: '', amount: '', qty: '' }]);
  const [bazarPhotoBase64, setBazarPhotoBase64] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [bazarSearchDate, setBazarSearchDate] = useState('');
  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const [bazarSearchMember, setBazarSearchMember] = useState('');
  const [selectedBazarDetail, setSelectedBazarDetail] = useState(null);
  const [isEditingBazar, setIsEditingBazar] = useState(false);
  const [editedBazarPhotoBase64, setEditedBazarPhotoBase64] = useState('');
  const [selectedMemberDetail, setSelectedMemberDetail] = useState(null);
  const [editingMemberContact, setEditingMemberContact] = useState(false);
  const [editContactData, setEditContactData] = useState({ name: '', phone: '', whatsapp: '', email: '' });
  const [messName, setMessName] = useState('');
  const [dueDates, setDueDates] = useState({ meal: "5", rent: "8", wifi: "15", current: "25", maid: "5" });
  const [mealStep, setMealStep] = useState(Number(localStorage.getItem('mealStep')) || 1);
  useEffect(() => { localStorage.setItem('mealStep', mealStep); }, [mealStep]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [groupPlan, setGroupPlan] = useState('free');
  const [showBazarMemberModal, setShowBazarMemberModal] = useState(false);
  const [newMemberData, setNewMemberData] = useState({ name: '', phone: '', email: '' });
  const [selectedBazarMembers, setSelectedBazarMembers] = useState([]);
  const [bazarFilter, setBazarFilter] = useState('all'); // all, cash, credit
  const [pendingReq, setPendingReq] = useState(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositMemberId, setDepositMemberId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [showMealRateForecastModal, setShowMealRateForecastModal] = useState(false);
  const [mealRateForecastLoading, setMealRateForecastLoading] = useState(false);
  const [mealRateForecastError, setMealRateForecastError] = useState('');
  const [mealRateForecastResult, setMealRateForecastResult] = useState(null);
  const [mobileExtraNavOpen, setMobileExtraNavOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState('connecting');
  const [pendingWrites, setPendingWrites] = useState(0);
  const [recentlySavedMeals, setRecentlySavedMeals] = useState({});
  const [isBazarSubmitting, setIsBazarSubmitting] = useState(false);
  const [isBazarReqSubmitting, setIsBazarReqSubmitting] = useState(false);
  const [isFineSubmitting, setIsFineSubmitting] = useState(false);
  const [isTabPending, startTabTransition] = useTransition();
  const mobileExtraNavRef = useRef(null);
  const joinIndexWrittenForAppId = useRef(null);
  const activeDataNeeds = TAB_DATA_REQUIREMENTS[activeTab] || [];

  const runInBackground = (task, rollback) => {
    setPendingWrites((count) => count + 1);
    Promise.resolve()
      .then(task)
      .catch((error) => {
        console.error(error);
        rollback?.(error);
      })
      .finally(() => {
        setPendingWrites((count) => Math.max(0, count - 1));
      });
  };

  const switchTab = (nextTab) => {
    startTabTransition(() => {
      setActiveTab(nextTab);
    });
  };

  const mobileExtraTabs = isManager
    ? [
      { id: 'bills', icon: FileText, label: 'ফিক্সড বিল' },
      { id: 'fine', icon: AlertTriangle, label: 'দণ্ড' },
      { id: 'vote', icon: CheckSquare, label: 'ভোটিং' },
      { id: 'bua', icon: CalendarCheck, label: 'বুয়া ট্র্যাকার' },
      { id: 'menu', icon: CalendarIcon, label: 'মেনু' },
      { id: 'settings', icon: Settings, label: 'সেটিংস' },
    ]
    : [
      { id: 'bills', icon: FileText, label: 'ফিক্সড বিল' },
      { id: 'fine', icon: AlertTriangle, label: 'দণ্ড' },
      { id: 'vote', icon: CheckSquare, label: 'ভোটিং' },
      { id: 'bua', icon: CalendarCheck, label: 'বুয়া ট্র্যাকার' },
    ];

  useEffect(() => {
    if (!mobileExtraNavOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileExtraNavOpen(false);
    };
    const onPointer = (e) => {
      if (mobileExtraNavRef.current && !mobileExtraNavRef.current.contains(e.target)) {
        setMobileExtraNavOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer, { passive: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [mobileExtraNavOpen]);

  useEffect(() => {
    setMobileExtraNavOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!showMealRateForecastModal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowMealRateForecastModal(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showMealRateForecastModal]);

  // Mobile WebApp Zoom Block (Specific for App Shell/Dashboard)
  useEffect(() => {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) return;

    const originalContent = viewportMeta.getAttribute('content');
    // Lock zoom for better app-like experience
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover');

    return () => {
      // Restore original viewport when leaving the app shell
      viewportMeta.setAttribute('content', originalContent || 'width=device-width, initial-scale=1');
    };
  }, []);

  useEffect(() => {
    if (!selectedMonth) return;
    if (!selectedDate || !selectedDate.startsWith(selectedMonth)) {
      setSelectedDate(`${selectedMonth}-01`);
    }
  }, [selectedMonth]);

  // Auth & Init
  useEffect(() => {
    // Auth is managed by AuthContext now. We just ensure we stop loading.
    const backupTimer = setTimeout(() => setLoading(false), 2000);
    if (!currentUser) {
      navigate('/');
    } else {
      setUser(currentUser);

      // Plan logic...

      const fetchPrice = async () => {
        try {
          const snap = await getDoc(doc(db, 'system', 'pricing'));
          if (snap.exists()) setPremiumPrice(snap.data().premiumPrice || 299);
        } catch (e) {
          console.error("Failed to fetch price:", e);
        }
      };
      fetchPrice();

      // Auth is handled. Trial/plan is handled in group data listener.
    }
    return () => clearTimeout(backupTimer);
  }, [currentUser, userProfile, navigate]);

  // Data Listeners
  useEffect(() => {
    if (!user) return;

    const fetchRole = () => {
      return onSnapshot(doc(db, 'groups', appId), (groupSnap) => {
        if (groupSnap.exists()) {
          setIdError(false);
          const gData = groupSnap.data();
          const expectedKey = appId.toLowerCase();
          if (!gData.joinLookupKey || gData.joinLookupKey !== expectedKey) {
            updateDoc(doc(db, 'groups', appId), { joinLookupKey: expectedKey }).catch((err) =>
              console.warn('joinLookupKey sync skipped:', err)
            );
          }
          if (joinIndexWrittenForAppId.current !== appId) {
            joinIndexWrittenForAppId.current = appId;
            writeJoinKeyIndex(appId).catch((err) => console.warn('join_key_index sync skipped:', err));
          }
          const hostCheck = gData.ownerId === user.uid || user.email === 'shipontalukdaroffice@gmail.com';
          setIsHost(hostCheck);
          const isManagerCheck = hostCheck || (gData.managers && gData.managers.includes(user.uid));
          setIsManager(Boolean(isManagerCheck));

          // Handle Free Trial / Plan Logic
          const currentPlan = gData.plan || 'free';
          setGroupPlan(currentPlan);

          if (currentPlan === 'free') {
            let createdTime;
            try {
              if (gData.trialStartedAt) {
                createdTime = new Date(gData.trialStartedAt).getTime();
              } else {
                createdTime = new Date(gData.createdAt || Date.now()).getTime();
              }
              const daysPassed = Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24));
              setTrialDaysLeft(Math.max(0, 30 - daysPassed));
            } catch (e) {
              console.error("Trial date calculation error:", e);
            }
          }
        } else {
          setIdError(true);
          setLoading(false);
        }
      }, (e) => {
        console.error("Error fetching group role:", e);
        if (e.code === 'permission-denied') {
          // Might be because group doesn't exist AND we don't have access to non-existent docs
          // But usually snapshot for non-existent doc works and returns exists() false
        }
      });
    };
    const unsubGroupRole = fetchRole();

    const handleError = (name) => (err) => {
      console.error(`${name} sync error:`, err);
      if (err.code === 'permission-denied') {
        setPermError(`Permission Error: ${name}`);
        setLoading(false);
      }
    };


    const unsubBills = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'fixed_bills'), (s) => {
      if (s.exists()) {
        const data = s.data();
        setBills({
          wifi: safeNum(data.wifi),
          current: safeNum(data.current),
          rent: safeNum(data.rent),
          maid: safeNum(data.maid),
          pcCharge: safeNum(data.pcCharge)
        });
      }
    }, handleError("Bills"));

    const unsubNotice = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'notice_config'), (s) => {
      if (s.exists()) setNotice(safeStr(s.data().text));
    }, handleError("Notice"));

    const unsubMessConfig = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'mess_config'), (s) => {
      if (s.exists() && s.data().name) {
        const n = safeStr(s.data().name);
        if (n && n !== LEGACY_PLACEHOLDER_MESS_NAME) {
          setMessName(n);
          if (isManager) {
            getDoc(doc(db, 'groups', appId))
              .then((gs) => {
                if (!gs.exists()) return;
                if (safeStr(gs.data().name) === n) return;
                return updateDoc(doc(db, 'groups', appId), { name: n });
              })
              .catch((err) => console.warn('sync groups.name from mess_config', err));
          }
        }
      }
    }, handleError("MessConfig"));

    const unsubGroupName = onSnapshot(doc(db, 'groups', appId), (gs) => {
      if (gs.exists() && gs.data().name) {
        const g = safeStr(gs.data().name);
        setMessName((prev) => {
          if (!g) return prev;
          if (!prev || prev === LEGACY_PLACEHOLDER_MESS_NAME) return g;
          return prev;
        });
      }
    }, handleError("GroupName"));

    const unsubDueDates = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'due_dates_config'), (s) => {
      if (s.exists()) {
        const d = s.data();
        setDueDates({
          meal: safeStr(d.meal) || "5",
          rent: safeStr(d.rent) || "8",
          wifi: safeStr(d.wifi) || "15",
          current: safeStr(d.current) || "25",
          maid: safeStr(d.maid) || "5"
        });
      }
    }, handleError("DueDatesConfig"));

    const unsubMembers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'members'), (s) => {
      setMembers(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, handleError("Members"));

    let unsubBazar = () => { };
    if (activeDataNeeds.includes('bazar')) {
      unsubBazar = onSnapshot(
        collection(db, 'artifacts', appId, 'public', 'data', 'bazar'),
        (s) => setBazarList(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        handleError("Bazar")
      );
    }

    let unsubBazarRequests = () => { };
    if (activeDataNeeds.includes('bazarRequests')) {
      unsubBazarRequests = onSnapshot(
        collection(db, 'artifacts', appId, 'public', 'data', 'bazar_requests'),
        (s) => setBazarRequests(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        handleError("BazarRequests")
      );
    }

    let unsubJoinReq = () => { };
    if (isManager || activeDataNeeds.includes('joinRequests')) {
      unsubJoinReq = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'join_requests'), (s) => {
        setJoinRequests(s.docs.map(d => ({ id: d.id, ...d.data() })));
      }, handleError("JoinRequests"));
    }

    let unsubMeals = () => { };
    if (activeDataNeeds.includes('meals')) {
      unsubMeals = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'meals'), (s) => {
        const m = {};
        s.docs.forEach(d => m[d.id] = d.data());
        setMeals(m);
      }, handleError("Meals"));
    }

    let unsubPolls = () => { };
    if (activeDataNeeds.includes('polls')) {
      unsubPolls = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'polls'), (s) => {
        setPolls(s.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    let unsubBua = () => { };
    if (activeDataNeeds.includes('bua')) {
      unsubBua = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'bua_attendance'), (s) => {
        setBuaData(s.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    let unsubWeeklyMenu = () => { };
    if (activeDataNeeds.includes('weeklyMenu')) {
      unsubWeeklyMenu = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'weekly_menu'), (s) => {
        if (s.exists()) setWeeklyMenu(s.data()); else setWeeklyMenu({});
      });
    }

    let unsubDeposits = () => { };
    if (activeDataNeeds.includes('deposits')) {
      unsubDeposits = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'deposits'), (s) => setDeposits(s.docs.map(d => ({ id: d.id, ...d.data() }))), handleError("Deposits"));
    }

    let unsubFines = () => { };
    if (activeDataNeeds.includes('fines')) {
      unsubFines = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'fines'), (s) => setFines(s.docs.map(d => ({ id: d.id, ...d.data() }))), handleError("Fines"));
    }

    let unsubBillTracking = () => { };
    if (activeDataNeeds.includes('billTracking')) {
      unsubBillTracking = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'bill_tracking'), (s) => {
        const trackingData = {};
        s.docs.forEach(d => { trackingData[d.id] = d.data(); });
        setBillTracking(trackingData);
      }, handleError("Bill Tracking"));
    }

    const unsubPendingReq = onSnapshot(query(collection(db, 'subscription_requests'), where('uid', '==', currentUser.uid)), (s) => {
      if (!s.empty) setPendingReq(s.docs[0].data());
      else setPendingReq(null);
    }, handleError("PendingReq"));

    return () => {
      unsubGroupRole();
      unsubBills(); unsubNotice(); unsubMembers(); unsubBazar();
      unsubBazarRequests();
      unsubJoinReq(); unsubPolls(); unsubBua(); unsubWeeklyMenu();
      unsubMeals(); unsubDeposits(); unsubFines(); unsubBillTracking(); unsubPendingReq(); unsubGroupName();
    };
  }, [user, activeTab, isManager, currentUser?.uid, appId]);

  // Sync browser tab title + PWA display name with mess name
  useEffect(() => {
    const titleBase =
      messName && messName !== LEGACY_PLACEHOLDER_MESS_NAME ? messName : 'Meal Manager';
    document.title = messName && messName !== LEGACY_PLACEHOLDER_MESS_NAME ? `${messName} | Meal Manager` : 'Meal Manager';
    const iosMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (iosMeta) iosMeta.setAttribute('content', titleBase);
    const appMeta = document.querySelector('meta[name="application-name"]');
    if (appMeta) appMeta.setAttribute('content', titleBase);
  }, [messName]);
  // --- ACTIONS ---

  const updateMenuMeal = async (day, mealType, value) => {
    if (!isManager) return;
    const newMenuData = { ...weeklyMenu };
    if (!newMenuData[day]) newMenuData[day] = {};
    newMenuData[day][mealType] = value;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'weekly_menu'), newMenuData);
  };

  const generateAIMenu = () => {
    alert('Gemini API key সেভ হয়েছে। এখন আবার AI feature চালান।');
  };

  const generateSpecificMeal = async (day, mealType) => {
    setIsGeneratingMenu(`${day}-${mealType}`);

    const randomSeed = Math.floor(Math.random() * 10000);
    let promptText = "";
    if (mealType === 'lunch') {
      promptText = `[Random Seed: ${randomSeed}] Suggest a highly affordable, low-budget healthy Bangladeshi lunch menu. Be CREATIVE and varied (e.g. maybe broiler chicken today, pangas fish tomorrow, egg curry next, mixed veg, etc.). Avoid expensive items like Rui/Beef. Do NOT just suggest egg and rice every time. Return ONLY a single line of 2-3 items comma separated in Bengali (e.g. সাদা ভাত, রুই বাদে অন্য সস্তা মাছ বা মাংস, ডাল). No extra text.`;
    } else {
      promptText = `[Random Seed: ${randomSeed}] Suggest a highly affordable, low-budget healthy Bangladeshi dinner menu. Be CREATIVE and varied (e.g. different types of bhorta, cheap seasonal veg, dal, different bhaji, or egg). Do NOT repeat the usual. Return ONLY a single line of 2-3 items comma separated in Bengali. No extra text.`;
    }

    try {
      const suggestedText = (await generateGeminiText({
        prompt: promptText,
        temperature: 1.2,
      })).replace(/["\n\r*]/g, '').trim();
      await updateMenuMeal(day, mealType, suggestedText);
    } catch (e) {
      console.error(e);
      alert("AI suggestion failed: " + e.message);
    }
    setIsGeneratingMenu(false);
  };

  const createPoll = async (e) => {
    e.preventDefault();
    if (!isManager) return;
    const q = e.target.question.value;
    const o1 = e.target.opt1.value;
    const o2 = e.target.opt2.value;
    if (!q || !o1 || !o2) return;

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'polls'), {
      question: q,
      options: [
        { id: 1, text: o1, votes: [] },
        { id: 2, text: o2, votes: [] }
      ],
      createdAt: new Date().toISOString()
    });
    e.target.reset();
  };

  const castVote = async (pollId, optionId, currentOptions) => {
    const updatedOptions = currentOptions.map(opt => {
      let newVotes = opt.votes.filter(uid => uid !== user.uid);
      if (opt.id === optionId && !opt.votes.includes(user.uid)) {
        newVotes.push(user.uid);
      }
      return { ...opt, votes: newVotes };
    });
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'polls', pollId), {
      options: updatedOptions
    });
  };

  const deletePoll = async (pollId) => {
    if (await showConfirm({ title: 'পোল ডিলিট', message: 'পোলটি ডিলিট করতে চান?', danger: true })) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'polls', pollId));
      showToast('পোল ডিলিট করা হয়েছে', 'success');
    }
  };

  const updateBuaAttendance = async (dateStr, isPresent) => {
    if (!isManager) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bua_attendance', dateStr), {
      date: dateStr,
      isPresent: isPresent
    });
  };

  const updateNotice = async (e) => {
    e.preventDefault();
    const noticeText = e.target.noticeText.value;
    if (!noticeText.trim()) return;

    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'notice_config'), { text: noticeText });

    const membersWithEmails = members.filter(m => m.email);
    if (membersWithEmails.length > 0) {
      let emailsSent = 0;
      for (const m of membersWithEmails) {
        try {
          const reqHtml = `<div style="font-family:sans-serif; padding:20px; color:#333;">
            <h2 style="color:#ef4444;">জরুরী নোটিশ 📢</h2>
            <p>প্রিয় ${m.name},</p>
            <p>মেসের ম্যানেজার একটি নতুন নোটিশ দিয়েছেন:</p>
            <div style="background:#fef2f2; border-left:4px solid #ef4444; padding:15px; border-radius:5px; font-weight:bold; margin:15px 0;">
              ${noticeText}
            </div>
            <p>ধন্যবাদ!</p>
            <div style="margin: 25px 0;">
               <a href="${window.location.origin}" style="display:inline-block; padding:12px 24px; background-color:#4f46e5; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:bold;">Login to Dashboard</a>
            </div>
            <hr style="border:1px solid #eee; margin:20px 0;" />
            <p style="font-size:12px; color:#999;">Meal Manager</p>
          </div>`;
          await sendEmail(m.email, 'Meal Manager - Emergency Notice', reqHtml);
          emailsSent++;
        } catch (err) {
          console.error("Notice Email error:", err);
        }
      }
      alert(`নোটিশ আপডেট হয়েছে এবং ${emailsSent} জনকে ইমেইলে জানানো হয়েছে!`);
    } else {
      alert("নোটিশ আপডেট হয়েছে! (কারো ইমেইল না থাকায় মেইল পাঠানো যায়নি)");
    }
    e.target.reset();
  };

  const updateDueDates = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'due_dates_config'), {
      meal: e.target.meal.value,
      wifi: e.target.wifi.value,
      current: e.target.current.value,
      rent: e.target.rent.value,
      maid: e.target.maid.value || "5"
    });
    alert("শেষ তারিখ আপডেট সফল!");
  };

  const updateBills = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'fixed_bills'), {
      wifi: Number(e.target.wifi.value),
      current: Number(e.target.current.value),
      rent: Number(e.target.rent.value),
      pcCharge: Number(e.target.pcCharge.value),
      maid: Number(e.target.maid?.value || 0)
    });
    alert("বিল আপডেট সফল!");
  };

  const toggleBillStatus = async (memberId, type) => {
    if (!isManager) return;
    const docId = `${memberId}_${selectedMonth}`;
    const currentData = billTracking[docId] || {};
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bill_tracking', docId), {
      ...currentData,
      [type]: !currentData[type],
      memberId,
      month: selectedMonth
    }, { merge: true });
  };

  const addMember = async (e) => {
    if (e) e.preventDefault();
    const name = clampMemberName(newMemberData.name);
    if (!name) return;
    try {
      // ✅ ডুপ্লিকেট email চেক
      const trimmedEmail = newMemberData.email.trim();
      const trimmedEmailLower = trimmedEmail.toLowerCase();
      if (trimmedEmailLower) {
        const emailExists = members.some(
          m => m.email && m.email.trim().toLowerCase() === trimmedEmailLower
        );
        if (emailExists) {
          alert(`⚠️ এই ইমেইল (${trimmedEmail}) দিয়ে ইতিমধ্যে একজন মেম্বার আছেন! ডুপ্লিকেট তৈরি হবে না।`);
          return;
        }
      }

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'members'), {
        name,
        phone: newMemberData.phone.trim(),
        email: trimmedEmail,
        isManagerTag: false,
        createdAt: new Date().toISOString()
      });

      if (trimmedEmail) {
        try {
          await updateDoc(doc(db, 'groups', appId), {
            invitedEmails: arrayUnion(trimmedEmail)
          });
        } catch (err) { console.error("Error adding invited email", err); }
      }

      setNewMemberData({ name: '', phone: '', email: '' });
      setShowAddMemberModal(false);
      alert('নতুন মেম্বার সফলভাবে যোগ করা হয়েছে!');
    } catch (err) {
      alert('সমস্যা হয়েছে: ' + err.message);
    }
  };


  const toggleManagerTag = async (id, status) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', id), { isManagerTag: !status });
  };

  const toggleManagerRole = async (memberUid) => {
    if (!isHost) {
      alert("Only the host can assign managers!");
      return;
    }
    const groupRef = doc(db, 'groups', appId);
    const snap = await getDoc(groupRef);
    if (snap.exists()) {
      let m = snap.data().managers || [];
      if (m.includes(memberUid)) m = m.filter(uid => uid !== memberUid);
      else m.push(memberUid);
      await updateDoc(groupRef, { managers: m });
    }
  };

  const togglePcUser = async (id, status) => {
    if (!isManager) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', id), { isPcUser: !status });
  };

  const updateMemberContactDetails = async () => {
    if (!isManager || !selectedMemberDetail) return;
    const name = clampMemberName(editContactData.name);
    if (!name) {
      alert('\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09AE\u09C7\u09AE\u09CD\u09AC\u09BE\u09B0\u09C7\u09B0 \u09A8\u09BE\u09AE \u09A6\u09BF\u09A8\u0964');
      return;
    }
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', selectedMemberDetail.id), {
        name,
        phone: editContactData.phone,
        whatsapp: editContactData.whatsapp,
        email: editContactData.email
      });
      setSelectedMemberDetail({
        ...selectedMemberDetail,
        name,
        phone: editContactData.phone,
        whatsapp: editContactData.whatsapp,
        email: editContactData.email
      });
      setEditingMemberContact(false);
      alert("তথ্য আপডেট করা হয়েছে!");
    } catch (e) {
      console.error(e);
      alert("আপডেট ব্যর্থ হয়েছে!");
    }
  };

  const deleteMember = async (id) => {
    if (window.confirm("মেম্বার ডিলিট করতে চান?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', id));
  };

  const updateMeal = async (mId, count) => {
    const nextCount = Number(count);
    const previousDayMeals = meals[selectedDate] || {};
    const previousCount = previousDayMeals[mId] || 0;

    setMeals((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [mId]: nextCount,
      },
    }));

    setRecentlySavedMeals(prev => ({ ...prev, [mId]: true }));
    setTimeout(() => {
      setRecentlySavedMeals(prev => {
        const next = { ...prev };
        delete next[mId];
        return next;
      });
    }, 1600);

    runInBackground(
      () =>
        setDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'meals', selectedDate),
          { [mId]: nextCount },
          { merge: true }
        ),
      () => {
        setMeals((prev) => ({
          ...prev,
          [selectedDate]: {
            ...(prev[selectedDate] || {}),
            [mId]: previousCount,
          },
        }));
        alert("মিল আপডেট করতে সমস্যা হয়েছে।");
      }
    );
  };

  const addDeposit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const optimisticDeposit = {
      id: `temp-deposit-${Date.now()}`,
      memberId: form.memberId.value,
      amount: Number(form.amount.value),
      date: new Date().toISOString(),
      isPendingSync: true,
    };
    setDeposits((prev) => [optimisticDeposit, ...prev]);
    form.reset();
    showToast('টাকা জমা সফল হয়েছে!', 'success');
    runInBackground(
      () =>
        addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'deposits'), {
          memberId: optimisticDeposit.memberId,
          amount: optimisticDeposit.amount,
          date: optimisticDeposit.date,
        }),
      () => {
        setDeposits((prev) => prev.filter((item) => item.id !== optimisticDeposit.id));
        showToast("জমা সেভ করতে সমস্যা হয়েছে।", 'error');
      }
    );
  };
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) { setBazarPhotoBase64(''); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800; const MAX_HEIGHT = 800;
        let width = img.width; let height = img.height;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        setBazarPhotoBase64(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const addBazar = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const bazarType = formData.get('type') || 'cash';

    const validRows = bazarRows.filter(r => r.item.trim() && r.amount && r.qty.trim());
    if (validRows.length === 0) { alert("অন্তত একটি বাজার আইটেম দিন"); return; }
    if (selectedBazarMembers.length === 0) { alert("অন্তত একজনকে নির্বাচন করুন"); return; }

    const totalAmount = validRows.reduce((sum, row) => sum + safeNum(row.amount), 0);
    const combinedItemName = validRows.map(row => `${row.item} (${row.qty})`).join(', ');
    const memberCount = selectedBazarMembers.length;
    const splitAmount = Number((totalAmount / memberCount).toFixed(2));
    const bazarPhoto = bazarPhotoBase64 || null;
    const selectedMembers = [...selectedBazarMembers];
    const optimisticEntries = selectedMembers.map((mId, index) => ({
      id: `temp-bazar-${Date.now()}-${index}`,
      item: combinedItemName,
      items: validRows.map(row => ({ name: row.item, amount: safeNum(row.amount), qty: row.qty })),
      amount: splitAmount,
      totalAmount,
      memberId: mId,
      sharedWith: selectedMembers,
      sharedCount: memberCount,
      date: form.date.value,
      type: bazarType,
      photo: bazarPhoto,
      isPendingSync: true,
    }));

    setBazarList((prev) => [...optimisticEntries, ...prev]);
    setBazarRows([{ id: Date.now(), item: '', amount: '', qty: '' }]);
    setBazarPhotoBase64('');
    setSelectedBazarMembers([]);
    form.reset();
    setIsBazarSubmitting(true);

    runInBackground(
      async () => {
        const promises = optimisticEntries.map(entry => {
          const { id, isPendingSync, ...data } = entry;
          return setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bazar', id), data);
        });
        await Promise.all(promises);
        setIsBazarSubmitting(false);
        showToast('বাজার সেভ হয়েছে!', 'success');
      },
      (err) => {
        const optimisticIds = new Set(optimisticEntries.map((item) => item.id));
        setBazarList((prev) => prev.filter((item) => !optimisticIds.has(item.id)));
        setIsBazarSubmitting(false);
        showToast(`বাজার সেভ করতে সমস্যা হয়েছে: ${err.message || 'Unknown error'}`, 'error');
      }
    );
  };

  const submitBazarRequest = async (e) => {
    e.preventDefault();
    const form = e.target;
    const validRows = bazarRows.filter(r => r.item.trim() && r.amount && r.qty.trim());
    if (validRows.length === 0) { alert("অন্তত একটি বাজার আইটেম দিন"); return; }
    if (!loggedInMember) { alert("আপনার মেম্বার প্রোফাইল পাওয়া যায়নি।"); return; }

    const totalAmount = validRows.reduce((sum, row) => sum + safeNum(row.amount), 0);
    const combinedItemName = validRows.map(row => `${row.item} (${row.qty})`).join(', ');
    const optimisticRequest = {
      id: `temp-bazar-request-${Date.now()}`,
      item: combinedItemName,
      items: validRows.map(row => ({ name: row.item, amount: safeNum(row.amount), qty: row.qty })),
      amount: totalAmount,
      memberId: loggedInMember.id,
      memberName: safeStr(loggedInMember.name),
      memberUid: currentUser?.uid || '',
      date: form.date.value,
      type: new FormData(form).get('type') || 'cash',
      photo: bazarPhotoBase64 || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      isPendingSync: true,
    };

    setBazarRequests((prev) => [optimisticRequest, ...prev]);
    setBazarRows([{ id: Date.now(), item: '', amount: '', qty: '' }]);
    setBazarPhotoBase64('');
    form.reset();
    setIsBazarReqSubmitting(true);

    runInBackground(
      () =>
        addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bazar_requests'), {
          item: optimisticRequest.item,
          items: optimisticRequest.items,
          amount: optimisticRequest.amount,
          memberId: optimisticRequest.memberId,
          memberName: optimisticRequest.memberName,
          memberUid: optimisticRequest.memberUid,
          date: optimisticRequest.date,
          type: optimisticRequest.type,
          photo: optimisticRequest.photo,
          status: optimisticRequest.status,
          createdAt: optimisticRequest.createdAt,
        }).then(() => {
          setIsBazarReqSubmitting(false);
          showToast('বাজার রিকোয়েস্ট পাঠানো হয়েছে!', 'success');
        }),
      () => {
        setBazarRequests((prev) => prev.filter((item) => item.id !== optimisticRequest.id));
        setIsBazarReqSubmitting(false);
        showToast("বাজার রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।", 'error');
      }
    );
  };

  const handleApproveBazarRequest = async (req) => {
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bazar'), {
        item: req.item,
        items: req.items || [],
        amount: safeNum(req.amount),
        memberId: req.memberId,
        date: req.date,
        type: req.type || 'cash',
        photo: req.photo || null,
        approvedFromRequest: true,
        approvedAt: new Date().toISOString()
      });
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bazar_requests', req.id));
      alert("বাজার রিকোয়েস্ট approve করা হয়েছে।");
    } catch (e) {
      console.error(e);
      alert("রিকোয়েস্ট approve করতে সমস্যা হয়েছে।");
    }
  };

  const handleRejectBazarRequest = async (reqId) => {
    if (!window.confirm("এই বাজার রিকোয়েস্ট reject করতে চান?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bazar_requests', reqId));
    } catch (e) {
      console.error(e);
      alert("রিকোয়েস্ট reject করতে সমস্যা হয়েছে।");
    }
  };

  const removeBazar = async (bazarId) => {
    if (!isManager) return;
    if (!window.confirm("এই বাজার এন্ট্রি delete করতে চান?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bazar', bazarId));
      if (selectedBazarDetail?.id === bazarId) setSelectedBazarDetail(null);
    } catch (e) {
      console.error(e);
      alert("বাজার delete করতে সমস্যা হয়েছে।");
    }
  };

  const addFine = async (e) => {
    e.preventDefault();
    setIsFineSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'fines'), {
        memberId: e.target.memberId.value,
        reason: e.target.reason.value,
        mealCount: Number(e.target.mealCount.value || 2),
        date: e.target.date.value || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });
      e.target.reset();
      showToast('দণ্ড সফলভাবে যোগ হয়েছে!', 'success');
    } catch (err) {
      showToast('দণ্ড যোগ করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setIsFineSubmitting(false);
    }
  };

  const removeFine = async (fineId) => {
    if (!window.confirm("এই দণ্ড মাফ করতে চান?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'fines', fineId));
    } catch (e) {
      console.error(e);
      alert("দণ্ড মাফ করতে সমস্যা হয়েছে।");
    }
  };

  const resetMonth = async () => {
    if (!window.confirm("সতর্কতা: এটি বর্তমান মাসের সকল ডাটা মুছে ফেলবে।")) return;
    setLoading(true);
    try {
      const batchDelete = async (colName) => {
        const q = collection(db, 'artifacts', appId, 'public', 'data', colName);
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      };
      await Promise.all([batchDelete('bazar'), batchDelete('meals'), batchDelete('deposits'), batchDelete('fines'), batchDelete('bill_tracking')]);
      alert("ডাটা রিসেট সম্পন্ন!");
      setShowResetModal(false);
    } catch (e) { alert("Reset Error: " + e.message); }
    setLoading(false);
  };

  // --- Calculations ---
  const monthlyMealEntries = useMemo(
    () => Object.entries(meals).filter(([dateKey]) => dateKey.startsWith(selectedMonth)),
    [meals, selectedMonth]
  );
  const monthlyDeposits = useMemo(
    () => deposits.filter((d) => getMonthKey(d.date || d.createdAt) === selectedMonth),
    [deposits, selectedMonth]
  );
  const monthlyFines = useMemo(
    () => fines.filter((f) => getMonthKey(f.date || f.createdAt) === selectedMonth),
    [fines, selectedMonth]
  );
  const monthlyBazarList = useMemo(
    () => bazarList.filter((b) => getMonthKey(b.date || b.createdAt) === selectedMonth),
    [bazarList, selectedMonth]
  );

  const mealTotalsByMember = useMemo(() => {
    const totals = {};
    monthlyMealEntries.forEach(([, day]) => {
      Object.entries(day).forEach(([memberId, count]) => {
        totals[memberId] = (totals[memberId] || 0) + safeNum(count);
      });
    });
    return totals;
  }, [monthlyMealEntries]);
  const depositsByMember = useMemo(() => {
    const totals = {};
    monthlyDeposits.forEach((deposit) => {
      totals[deposit.memberId] = (totals[deposit.memberId] || 0) + safeNum(deposit.amount);
    });
    return totals;
  }, [monthlyDeposits]);
  const finesByMember = useMemo(() => {
    const grouped = {};
    monthlyFines.forEach((fine) => {
      if (!grouped[fine.memberId]) grouped[fine.memberId] = [];
      grouped[fine.memberId].push(fine);
    });
    return grouped;
  }, [monthlyFines]);
  const cashBazar = useMemo(
    () => monthlyBazarList.filter((i) => i.type === 'cash' || !i.type).reduce((a, b) => a + safeNum(b.amount), 0),
    [monthlyBazarList]
  );
  const totalBazarAmount = useMemo(
    () => monthlyBazarList.reduce((a, b) => a + safeNum(b.amount), 0),
    [monthlyBazarList]
  );
  const totalFineMeals = useMemo(
    () => monthlyFines.reduce((sum, fine) => sum + safeNum(fine.mealCount || 2), 0),
    [monthlyFines]
  );
  const totalMealsFromRecords = useMemo(
    () => Object.values(mealTotalsByMember).reduce((acc, count) => acc + safeNum(count), 0),
    [mealTotalsByMember]
  );
  const totalMealFactor = totalMealsFromRecords + totalFineMeals;
  // মিল রেট = মোট বাজার (নগদ + বাকি) ÷ মোট মিল (fine সহ)
  const mealRateValue = totalMealFactor > 0 ? totalBazarAmount / totalMealFactor : 0;
  const mealRate = mealRateValue.toFixed(2);

  const pcUsersCount = useMemo(() => members.filter((m) => m.isPcUser).length, [members]);
  const totalCurrentBill = safeNum(bills.current);
  const pcChargePerUser = safeNum(bills.pcCharge);
  const baseCurrentShare = members.length > 0 ? (totalCurrentBill - (pcChargePerUser * pcUsersCount)) / members.length : 0;

  const sharePerHead = useMemo(() => ({
    wifi: members.length > 0 ? (safeNum(bills.wifi) / members.length) : 0,
    currentBase: baseCurrentShare,
    pcCharge: pcChargePerUser,
    rent: members.length > 0 ? (safeNum(bills.rent) / members.length) : 0,
    maid: members.length > 0 ? (safeNum(bills.maid) / members.length) : 0,
  }), [baseCurrentShare, bills.current, bills.maid, bills.pcCharge, bills.rent, bills.wifi, members.length, pcChargePerUser]);
  const baseBillPerHead = (sharePerHead.wifi + sharePerHead.currentBase + sharePerHead.rent + sharePerHead.maid).toFixed(2);

  const totalDeposits = useMemo(
    () => monthlyDeposits.reduce((a, b) => a + safeNum(b.amount), 0),
    [monthlyDeposits]
  );
  const fundStatus = (totalDeposits - cashBazar).toFixed(2);

  const getDaysLeftInMonth = () => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return lastDay.getDate() - today.getDate();
  };
  const daysLeft = getDaysLeftInMonth();

  const loggedInMember = useMemo(
    () => members.find((m) => m.uid === currentUser?.uid || (m.email && currentUser?.email && m.email.toLowerCase() === currentUser.email.toLowerCase())),
    [currentUser?.email, currentUser?.uid, members]
  );

  const memberStatsMap = useMemo(() => {
    const stats = {};

    members.forEach((member) => {
      const memberId = member.id;
      const mMeals = mealTotalsByMember[memberId] || 0;
      const memberFines = finesByMember[memberId] || [];
      const mDeposits = depositsByMember[memberId] || 0;
      const mFineMeals = memberFines.reduce((sum, fine) => sum + safeNum(fine.mealCount || 2), 0);
      const totalMeals = mMeals + mFineMeals;
      const mealCostFloat = Number((totalMeals * mealRateValue).toFixed(2));
      const mealBalanceFloat = mDeposits - mealCostFloat;

      const docId = `${memberId}_${selectedMonth}`;
      const bStatus = billTracking[docId] || {};
      let billPaid = 0;
      let billDue = 0;
      const myCurrentShare = sharePerHead.currentBase + (member.isPcUser ? sharePerHead.pcCharge : 0);

      if (bStatus.wifi) billPaid += sharePerHead.wifi; else billDue += sharePerHead.wifi;
      if (bStatus.current) billPaid += myCurrentShare; else billDue += myCurrentShare;
      if (bStatus.rent) billPaid += sharePerHead.rent; else billDue += sharePerHead.rent;
      if (bStatus.maid) billPaid += sharePerHead.maid; else billDue += sharePerHead.maid;

      stats[memberId] = {
        meals: mMeals,
        fineMeals: mFineMeals,
        mealCost: mealCostFloat.toFixed(2),
        paid: mDeposits,
        balance: mealBalanceFloat.toFixed(2),
        billPaid: billPaid.toFixed(2),
        billDue: Math.abs(billDue).toFixed(2),
        overallBalance: (mealBalanceFloat - billDue).toFixed(2),
      };
    });

    return stats;
  }, [billTracking, depositsByMember, finesByMember, mealRateValue, mealTotalsByMember, members, selectedMonth, sharePerHead]);

  const getMemberStats = (memberId) =>
    memberStatsMap[memberId] || {
      meals: 0,
      fineMeals: 0,
      mealCost: '0.00',
      paid: 0,
      balance: '0.00',
      billPaid: '0.00',
      billDue: '0.00',
      overallBalance: '0.00',
    };

  // Members account: sort by net due (negative overallBalance), highest first
  const membersSortedByTotalDueDesc = useMemo(() => [...members].sort((a, b) => {
    const stA = getMemberStats(a.id);
    const stB = getMemberStats(b.id);
    const dueA = Math.max(0, -Number(stA.overallBalance));
    const dueB = Math.max(0, -Number(stB.overallBalance));
    if (dueB !== dueA) return dueB - dueA;
    return safeStr(a.name).localeCompare(safeStr(b.name), 'bn');
  }), [members, memberStatsMap]);

  // Deposit tab: sort by amount deposited this month (highest first = most active/reliable)
  const membersSortedByDepositDesc = useMemo(() => [...members].sort((a, b) => {
    const dA = monthlyDeposits.filter(d => d.memberId === a.id).reduce((s, d) => s + safeNum(d.amount), 0);
    const dB = monthlyDeposits.filter(d => d.memberId === b.id).reduce((s, d) => s + safeNum(d.amount), 0);
    if (dB !== dA) return dB - dA;
    return safeStr(a.name).localeCompare(safeStr(b.name), 'bn');
  }), [members, monthlyDeposits]);

  // Monthly meal summary: sorted by total meals desc (বেশি মিল উপরে)
  const membersSortedByMonthlyMealsDesc = useMemo(() => [...members].sort((a, b) => {
    const mA = mealTotalsByMember[a.id] || 0;
    const mB = mealTotalsByMember[b.id] || 0;
    if (mB !== mA) return mB - mA;
    return safeStr(a.name).localeCompare(safeStr(b.name), 'bn');
  }), [members, mealTotalsByMember]);

  // Per-member bazar totals (for bazar summary view)
  const bazarTotalsByMember = useMemo(() => {
    const totals = {};
    monthlyBazarList.forEach(b => {
      totals[b.memberId] = (totals[b.memberId] || 0) + safeNum(b.amount);
    });
    return totals;
  }, [monthlyBazarList]);

  // Members sorted by bazar amount desc (বেশি বাজার উপরে)
  const membersSortedByBazarDesc = useMemo(() => [...members].sort((a, b) => {
    const bA = bazarTotalsByMember[a.id] || 0;
    const bB = bazarTotalsByMember[b.id] || 0;
    if (bB !== bA) return bB - bA;
    return safeStr(a.name).localeCompare(safeStr(b.name), 'bn');
  }), [members, bazarTotalsByMember]);

  // Members sorted by meals for the selected date on Meals Tab
  const membersSortedForSelectedDate = useMemo(() => {
    return [...members].sort((a, b) => {
      const aMeals = meals[selectedDate]?.[a.id] || 0;
      const bMeals = meals[selectedDate]?.[b.id] || 0;
      if (bMeals !== aMeals) return bMeals - aMeals;
      return safeStr(a.name).localeCompare(safeStr(b.name));
    });
  }, [members, meals, selectedDate]);

  const bazarRowsTotal = bazarRows.reduce((sum, row) => sum + safeNum(row.amount), 0);
  const selectedBazarMemberDetails = members.filter((m) => selectedBazarMembers.includes(m.id));
  const creditBazarTotal = monthlyBazarList.filter((b) => b.type === 'credit').reduce((sum, item) => sum + safeNum(item.amount), 0);
  const selectedDateBazarTotal = monthlyBazarList.filter((b) => b.date === selectedDate).reduce((sum, item) => sum + safeNum(item.amount), 0);
  const pendingBazarAmount = bazarRequests.reduce((sum, req) => sum + safeNum(req.amount), 0);
  const recentMonthlyBazarEntries = monthlyBazarList
    .slice()
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
    .slice(0, 4);
  const fixedCostTotal = safeNum(bills.wifi) + safeNum(bills.current) + safeNum(bills.rent) + safeNum(bills.maid);

  const getSelectedMonthTimeline = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;
    const calendarDaysElapsed = isCurrentMonth ? today.getDate() : monthEnd.getDate();

    return {
      daysInMonth: monthEnd.getDate(),
      calendarDaysElapsed: Math.max(1, calendarDaysElapsed),
      observedMealDays: Math.max(1, monthlyMealEntries.length),
      remainingDays: isCurrentMonth ? Math.max(0, monthEnd.getDate() - today.getDate()) : 0,
      isCurrentMonth,
      monthLabel: monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    };
  };

  const buildMealRateForecastFallback = (timeline, reason = '') => {
    const model = computeAdvancedMealRateProjection({
      selectedMonth,
      meals,
      monthlyBazarList,
      totalMealsFromRecords,
      totalFineMeals,
      totalBazarAmount,
      timeline,
    });
    const estimatedMealRateValue = model.estimatedMealRate;
    const dataCoverage = model.meta.coverage;

    let confidenceLabel = 'কম';
    if (!timeline.isCurrentMonth || dataCoverage >= 0.78) confidenceLabel = 'মাঝারি';
    if (!timeline.isCurrentMonth || (dataCoverage >= 0.9 && timeline.calendarDaysElapsed >= 18)) confidenceLabel = 'উচ্চ';

    const pctBazarDays = (model.meta.purchaseDayRate * 100).toFixed(0);
    const summary = timeline.isCurrentMonth
      ? `চলতি মাস — সাম্প্রতিক দিন বেশি ওজন + ~${pctBazarDays}% দিনে বাজার এন্ট্রি ধরে প্রজেকশন। বাকি ~${timeline.remainingDays} ক্যালেন্ডার দিন।`
      : `সম্পূর্ণ মাসের ডাটা; একই ট্রেন্ড মডেল (বাজার-দিন ~${pctBazarDays}%)।`;

    return {
      estimatedMealRate: estimatedMealRateValue.toFixed(2),
      projectedTotalMeals: model.projectedTotalMeals,
      projectedTotalBazar: model.projectedTotalBazar.toFixed(2),
      projectedFixedCosts: fixedCostTotal.toFixed(2),
      fixedBillNote: 'ফিক্সড বিল meal rate-এর বাইরে আলাদা হিসাব।',
      confidenceLabel,
      summary,
      advice: timeline.remainingDays > 0
        ? `বাকি দিনগুলোতে বাজার ও মিল এন্ট্রি নিয়মিত রাখলে forecast আরও স্থির হবে। ক্রেডিট বাজার (${creditBazarTotal.toFixed(0)} ৳) শেষ পর্যন্ত নগদে ঢুকলে রেট নিচে নামতে পারে।`
        : 'মাস শেষ — এই সংখ্যা চলতি মোট বাজার ÷ মোট মিলের কাছাকাছি থাকবে।',
      monthLabel: timeline.monthLabel,
      sourceLabel: reason ? 'Smart fallback' : 'ট্রেন্ড মডেল',
      notice: reason ? `AI পাওয়া যায়নি (${reason})। ট্রেন্ড মডেল দেখানো হয়েছে।` : '',
    };
  };

  const runMealRateForecast = async () => {
    if (!isManager) return;
    if (members.length === 0 || totalMealFactor <= 0 || totalBazarAmount <= 0) {
      alert("সম্ভাব্য মিলরেট দেখাতে এই মাসে অন্তত কিছু meal আর bazar data লাগবে।");
      return;
    }

    const timeline = getSelectedMonthTimeline();
    const baseline = computeAdvancedMealRateProjection({
      selectedMonth,
      meals,
      monthlyBazarList,
      totalMealsFromRecords,
      totalFineMeals,
      totalBazarAmount,
      timeline,
    });

    if (false) {
      setShowMealRateForecastModal(true);
      setMealRateForecastLoading(false);
      setMealRateForecastError('');
      setMealRateForecastResult(buildMealRateForecastFallback(timeline, 'Gemini API key পাওয়া যায়নি'));
      return;
    }
    if (false) {
      alert("Gemini API key পাওয়া যায়নি।");
      return;
    }

    setShowMealRateForecastModal(true);
    setMealRateForecastLoading(true);
    setMealRateForecastError('');
    setMealRateForecastResult(null);

    const baselineJson = JSON.stringify({
      estimatedMealRate: Number(baseline.estimatedMealRate.toFixed(4)),
      projectedTotalMeals: baseline.projectedTotalMeals,
      projectedTotalBazar: baseline.projectedTotalBazar,
      method: baseline.meta,
    });

    const bazarItemsForAi = monthlyBazarList.map(b => ({
      date: b.date,
      items: b.items && b.items.length > 0 ? b.items.map(i => `${i.item} (${i.qty}) ৳${i.amount}`).join(', ') : `${b.item} (${b.qty}) ৳${b.amount}`,
      total: b.amount
    }));

    const promptText = `
তুমি একজন বাংলাদেশি মেস ম্যানেজার অর্থ বিশেষজ্ঞ। Groq AI (Llama 3) এর বুদ্ধি খাটিয়ে নিচের ডাটা এনালাইসিস করো:

১. **মেম্বার সংখ্যা:** ${members.length} জন।
২. **বাজার লিস্ট (আইটেম, পরিমাণ ও তারিখ):** 
${JSON.stringify(bazarItemsForAi, null, 2)}

৩. **বর্তমান পরিস্থিতি:**
   - মাস: ${timeline.monthLabel}
   - আজ মাসের ${timeline.calendarDaysElapsed} তারিখ। বাকি আছে আরও ${timeline.remainingDays} দিন।
   - এখন পর্যন্ত মোট মিল: ${totalMealFactor}
   - এখন পর্যন্ত মোট বাজার: ৳${totalBazarAmount}

**তোমার কাজ:**
- বাজার লিস্ট দেখে বু্দ্ধি খাটাও। যেমন: গ্যাস সিলিন্ডার, তেল বা চাল কত তারিখে কেনা হয়েছে? ১১ জন মেম্বারের এই আইটেমগুলো কতদিন যেতে পারে? মাসের বাকি দিনগুলোতে এগুলো কি আবার কিনতে হবে?
- যে আইটেমগুলো একবার কিনলে ২০-২৫ দিন যায় (যেমন গ্যাস, মশলা), সেগুলো যদি সম্প্রতি কেনা হয়ে থাকে তবে বাকি মাসের হিসাবে সেগুলো আর যোগ করো না।
- সবজি বা মাছের মতো দৈনন্দিন খরচগুলো মাসের বাকি দিনগুলোর জন্য প্রজেক্ট করো।
- **মূল লক্ষ্য:** মাসের শেষে সম্ভাব্য "Total Bazar" এবং "Meal Rate" কত হতে পারে তার একটি বুদ্ধিদীপ্ত অনুমান দাও।

**আউটপুট শুধু JSON ফরম্যাটে দাও (কোনো অতিরিক্ত টেক্সট নয়):**
{
  "estimatedMealRate": "সংখ্যা (৳)",
  "projectedTotalMeals": "সংখ্যা (মাসের শেষে মোট মিল)",
  "projectedTotalBazar": "সংখ্যা (মাসের শেষে মোট বাজার)",
  "projectedFixedCosts": "${fixedCostTotal}",
  "fixedBillNote": "ফিক্সড বিলের সংক্ষেপ",
  "confidenceLabel": "উচ্চ/মাঝারি/কম",
  "summary": "বাজারের আইটেমগুলো দেখে তোমার বুদ্ধিমত্তাসম্পন্ন বিশ্লেষণ (বাংলায় ১-২ বাক্য)",
  "advice": "ম্যানেজারের জন্য পরামর্শ (যেমন: চাল বা গ্যাস এখন কেনার দরকার নাই বা বাজার খরচ কমাতে কী করা যায়)"
}

গুরুত্বপূর্ণ: estimatedMealRate = Total Projected Bazar / Total Projected Meals হতে হবে।
`;

    try {
      const aiText = await generateGeminiText({
        prompt: promptText,
        temperature: 0.22,
        responseMimeType: 'application/json',
        systemPrompt:
          'You are a Bangladesh mess finance assistant. Numeric outputs must stay consistent with the user baseline (within ~10%). Always return valid JSON only, no markdown.',
      });
      const parsed = parseGeminiJsonResponse(aiText);

      const br = baseline.estimatedMealRate;
      let rate = safeNum(parsed.estimatedMealRate);
      let meals = safeNum(parsed.projectedTotalMeals);
      let bazar = safeNum(parsed.projectedTotalBazar);

      let numericMode = 'ai';
      if (!(rate > 0) || !(meals > 0) || !(bazar > 0)) {
        numericMode = 'baseline';
      } else if (br > 0) {
        const ratio = rate / br;
        if (!Number.isFinite(ratio) || ratio < 0.78 || ratio > 1.28) numericMode = 'baseline';
        else if (ratio < 0.9 || ratio > 1.12) numericMode = 'blend';
      }

      if (numericMode === 'baseline') {
        meals = Math.max(1, baseline.projectedTotalMeals);
        bazar = Number(Number(baseline.projectedTotalBazar).toFixed(2));
        rate = meals > 0 ? bazar / meals : br;
      } else if (numericMode === 'blend') {
        rate = 0.42 * rate + 0.58 * br;
        meals = Math.max(1, Math.round(0.38 * meals + 0.62 * baseline.projectedTotalMeals));
        bazar = Number((rate * meals).toFixed(2));
        rate = meals > 0 ? bazar / meals : rate;
      } else {
        meals = Math.max(1, Math.round(meals));
        bazar = Number((rate * meals).toFixed(2));
        rate = meals > 0 ? bazar / meals : rate;
      }

      const covPct = (baseline.meta.coverage * 100).toFixed(0);
      const defaultSummary = `ট্রেন্ড মডেল + AI: ${timeline.monthLabel} — সম্ভাব্য মিলরেট ৳${rate.toFixed(2)}।`;
      const defaultAdvice = `মিল এন্ট্রি কভার ~${covPct}%। বাজার ${(baseline.meta.purchaseDayRate * 100).toFixed(0)}% দিনে হলে বাকি দিনে গড় বাজার ধরা হয়েছে।`;

      setMealRateForecastResult({
        estimatedMealRate: rate.toFixed(2),
        projectedTotalMeals: meals,
        projectedTotalBazar: bazar.toFixed(2),
        projectedFixedCosts: safeNum(parsed.projectedFixedCosts || fixedCostTotal).toFixed(2),
        fixedBillNote: safeStr(parsed.fixedBillNote) || 'ফিক্সড বিল meal rate-এর বাইরে আলাদা হিসাব।',
        confidenceLabel: safeStr(parsed.confidenceLabel) || 'মাঝারি',
        summary: safeStr(parsed.summary) || defaultSummary,
        advice: safeStr(parsed.advice) || defaultAdvice,
        monthLabel: timeline.monthLabel,
        sourceLabel: 'AI + ট্রেন্ড মডেল',
        notice: '',
      });
    } catch (e) {
      console.error(e);
      setMealRateForecastError(e.message || 'AI estimate তৈরি করা যায়নি।');
      setMealRateForecastResult(buildMealRateForecastFallback(timeline, e.message || 'AI estimate তৈরি করা যায়নি'));
      setMealRateForecastError('');
    } finally {
      setMealRateForecastLoading(false);
    }
  };

  const printHTML = (html) => {
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isStandalone || isMobile) {
      let iframe = document.getElementById('printing-frame');
      if (iframe) iframe.remove();

      iframe = document.createElement('iframe');
      iframe.id = 'printing-frame';
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0.01';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.error("Print error:", e);
        }
      }, 1000);
    } else {
      const printWindow = window.open('', '_blank', 'width=1000,height=800');
      if (!printWindow) {
        alert("পপ-আপ ব্লক করা হয়েছে! দয়া করে পপ-আপ এলাউ করুন বা ব্রাউজারের সেটিংস চেক করুন।");
        return;
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        setTimeout(() => {
          try { printWindow.close(); } catch (e) { }
        }, 1000);
      }, 1000);
    }
  };

  const generateSpecificBillPDF = (type) => {
    const dueDatesObj = dueDates || {};
    const dateMapping = {
      wifi: dueDatesObj.wifi || '15',
      current: dueDatesObj.current || '25',
      rent: dueDatesObj.rent || '8',
      maid: dueDatesObj.maid || '5'
    };
    const titles = { wifi: "ওয়াইফাই বিল", current: "বিদ্যুৎ বিল", rent: "বাসা ভাড়া", maid: "খালার বেতন" };

    const deadlineDayStr = dateMapping[type] || 'Not Set';
    const titleStr = titles[type];

    // Build full deadline date string: e.g. "১৫ এপ্রিল ২০২৬"
    const [deadlineYear, deadlineMonthNum] = selectedMonth.split('-');
    const banglaMonthNames = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const deadlineMonthName = banglaMonthNames[parseInt(deadlineMonthNum) - 1] || '';
    const deadlineStr = deadlineDayStr !== 'Not Set'
      ? `${toBengaliNumber(deadlineDayStr)} ${deadlineMonthName} ${toBengaliNumber(deadlineYear)}`
      : 'নির্ধারিত নয়';

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${titleStr} Notice - ${selectedMonth}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
        <style>
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          body { font-family: 'Inter', sans-serif; padding: 40px 60px; color: #1f2937; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e11d48; padding-bottom: 20px; margin-bottom: 30px; }
          h1 { margin: 0; color: #111827; font-size: 26px; font-weight: 900; }
          .report-type { font-size: 18px; font-weight: 800; color: #e11d48; }
          .notice { background: #fff1f2; border: 1px solid #fecdd3; padding: 25px; border-radius: 12px; margin-bottom: 30px; }
          .table-box { border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb; }
          table { width: 100%; border-collapse: collapse; text-align: center; font-size: 14px; }
          th, td { padding: 14px; border-bottom: 1px solid #f3f4f6; }
          th { background: #f8fafc; font-weight: 800; }
          .unpaid { color: #dc2626; font-weight: 800; background: #fee2e2; padding: 5px 10px; border-radius: 6px; }
          .paid { color: #059669; font-weight: 800; background: #d1fae5; padding: 5px 10px; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div><h1>${messName}</h1><div>অফিসিয়াল বিল নোটিশ</div></div>
          <div style="text-align:right;"><h2 class="report-type">${titleStr}</h2><div>মাস: ${toBengaliMonth(selectedMonth)}</div></div>
        </div>
        <div class="notice">
          <p>দয়া করে নির্দিষ্ট ডেডলাইনের মধ্যে <strong>${titleStr}</strong> পরিশোধ করুন।</p>
          <div style="font-weight:900; color:#e11d48;">শেষ তারিখ: ${deadlineStr} | জরিমানা: ৫০ টাকা</div>
        </div>
        <div class="table-box">
          <table>
            <thead><tr><th>#</th><th style="text-align:left;">নাম</th><th>এমাউন্ট</th><th>অবস্থা</th></tr></thead>
            <tbody>
    `;

    const sortedData = members.map(m => {
      const docId = m.id + '_' + selectedMonth;
      const status = billTracking[docId] || {};
      let share = 0;
      if (type === 'wifi') share = sharePerHead.wifi || 0;
      if (type === 'current') share = (sharePerHead.currentBase || 0) + (m.isPcUser ? (sharePerHead.pcCharge || 0) : 0);
      if (type === 'rent') share = sharePerHead.rent || 0;
      if (type === 'maid') share = sharePerHead.maid || ((bills.maid || 0) / members.length);
      const isPaid = !!status[type];
      return { m, share, isPaid };
    }).sort((a, b) => {
      if (a.isPaid === b.isPaid) {
        // Optional: sort alphabetically by name if paid status is same
        return (a.m.name || '').localeCompare(b.m.name || '');
      }
      return a.isPaid ? 1 : -1;
    });

    sortedData.forEach(({ m, share, isPaid }, index) => {
      html += `<tr><td>${index + 1}</td><td style="text-align:left; font-weight:700;">${safeStr(m.name)}</td><td>৳${Math.round(share)}</td><td><span class="${isPaid ? 'paid' : 'unpaid'}">${isPaid ? 'পরিশোধিত' : 'বাকি'}</span></td></tr>`;
    });

    html += `</tbody></table></div></body></html>`;
    printHTML(html);
  };

  const generateMonthlyPDF = () => {
    const memberShareForBillPdf = (m, key) => {
      if (key === 'wifi') return sharePerHead.wifi || 0;
      if (key === 'current') return (sharePerHead.currentBase || 0) + (m.isPcUser ? (sharePerHead.pcCharge || 0) : 0);
      if (key === 'rent') return sharePerHead.rent || 0;
      return sharePerHead.maid || 0;
    };

    const allFourBillsPaidPdf = (m) => {
      const st = billTracking[`${m.id}_${selectedMonth}`] || {};
      return !!(st.wifi && st.current && st.rent && st.maid);
    };

    const pdfMembersOrdered = [...members].sort((a, b) => {
      const pa = allFourBillsPaidPdf(a);
      const pb = allFourBillsPaidPdf(b);
      if (pa !== pb) return pa ? 1 : -1;
      const stA = getMemberStats(a.id);
      const stB = getMemberStats(b.id);
      const dA = Number(stA.billDue || 0);
      const dB = Number(stB.billDue || 0);
      if (dB !== dA) return dB - dA;
      return (a.name || '').localeCompare(b.name || '', 'bn');
    });

    let htmlBody = `
      <div class="header">
        <div>
          <h1>${messName}</h1>
          <div class="header-subtitle">মাসিক চূড়ান্ত হিসাব ও ব্যালেন্স শিট</div>
        </div>
        <div class="report-info">
          <h2 class="report-type">Monthly Report</h2>
          <div style="font-weight:700; font-size:13px; color:#475569;">মাস: ${toBengaliMonth(selectedMonth)}</div>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card prime"><p>মিল রেট</p><h3>৳${mealRate}</h3></div>
        <div class="summary-card"><p>মোট বাজার</p><h3>৳${cashBazar}</h3></div>
        <div class="summary-card"><p>মোট জমা</p><h3>৳${totalDeposits}</h3></div>
        <div class="summary-card"><p>সর্বমোট মিল</p><h3>${totalMealFactor}</h3></div>
      </div>

      <div class="legend">সর্টিং নিয়ম: চারটির যেকোনো একটি ফিক্সড বিল বাকি থাকলে সবার উপরে; চারটিই পরিশোধিত থাকলে নিচে।</div>

      <div class="table-box">
        <table>
          <thead>
            <tr>
              <th style="text-align: left;">মেম্বার</th>
              <th>জমা</th>
              <th>মিল</th>
              <th>খরচ</th>
              <th>ওয়াইফাই</th>
              <th>বিদ্যুৎ</th>
              <th>ভাড়া</th>
              <th>খালা</th>
              <th>ফিক্সড বাকি</th>
              <th>ফাইনাল ব্যালেন্স</th>
            </tr>
          </thead>
          <tbody>`;

    pdfMembersOrdered.forEach(m => {
      const st = getMemberStats(m.id);
      const isDue = Number(st.balance) < 0;
      const bStat = billTracking[`${m.id}_${selectedMonth}`] || {};

      const billColsHtml = ['wifi', 'current', 'rent', 'maid'].map(key => {
        const paid = !!bStat[key];
        const share = memberShareForBillPdf(m, key);
        return paid ? `<td class="paid-text" style="font-size:9px;">পরিশোধিত</td>` : `<td class="due" style="font-size:9px;">৳${Math.round(share)} বাকি</td>`;
      }).join('');

      htmlBody += `
        <tr>
          <td class="name-cell">${clampMemberName(safeStr(m.name))}</td>
          <td style="font-weight:700;">৳${st.paid}</td>
          <td>${st.meals}</td>
          <td>৳${Math.round(st.mealCost)}</td>
          ${billColsHtml}
          <td class="${st.billDue > 0 ? 'due' : 'paid-text'}">${st.billDue > 0 ? '৳' + st.billDue : 'ক্লিয়ার'}</td>
          <td class="total-cell ${isDue ? 'due' : 'paid-text'}">${isDue ? 'দিবে ৳' + Math.abs(Math.round(st.balance)) : 'পাবে ৳' + Math.round(st.balance)}</td>
        </tr>`;
    });

    htmlBody += `
          </tbody>
        </table>
      </div>`;

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Report - ${selectedMonth}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
        <style>
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } table { page-break-inside: auto; } tr { page-break-inside: avoid; } thead { display: table-header-group; } }
          body { font-family: 'Inter', sans-serif; padding: 40px 50px; color: #0f172a; line-height: 1.4; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom: 25px; }
          h1 { margin: 0; color: #1e1b4b; font-size: 24px; font-weight: 900; }
          .header-subtitle { color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 4px; }
          .report-info { text-align: right; }
          .report-type { font-size: 18px; font-weight: 800; color: #4f46e5; margin: 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px; }
          .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px; text-align: center; }
          .summary-card p { margin: 0 0 4px 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; }
          .summary-card h3 { margin: 0; font-size: 18px; font-weight: 900; color: #1e293b; }
          .summary-card.prime h3 { color: #4f46e5; }
          .table-box { border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; text-align: center; }
          th { background-color: #4f46e5; color: white; font-weight: 700; text-transform: uppercase; }
          td.name-cell { text-align: left; font-weight: 800; color: #1e293b; border-right: 1px solid #f1f5f9; }
          .due { color: #e11d48; font-weight: 700; }
          .paid-text { color: #10b981; font-weight: 700; }
          .total-cell { font-weight: 900; background: #f8fafc; border-left: 2px solid #e2e8f0; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
          .sig-box { text-align: center; }
          .sig-line { width: 160px; height: 1.5px; background: #94a3b8; margin-bottom: 8px; }
          .sig-text { font-size: 11px; font-weight: 700; color: #64748b; }
          .legend { font-size: 10px; color: #64748b; font-weight: 600; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        ${htmlBody}
        <div class="footer">
          <div style="font-size:10px; color:#94a3b8; font-weight:600;">Generated on: ${formatDate(new Date(), true)}</div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-text">Manager Signature</div>
          </div>
        </div>
      </body>
      </html>`;

    printHTML(fullHtml);
  };
  const generateDepositPDF = () => {

    // Sort logic same as UI: highest due (negative balance) first
    const pdfSorted = [...members].sort((a, b) => {
      const stA = getMemberStats(a.id);
      const stB = getMemberStats(b.id);
      return parseFloat(stA.balance) - parseFloat(stB.balance);
    });

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Deposit Status - ${selectedMonth}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body { font-family: 'Inter', sans-serif; padding: 40px 60px; color: #1f2937; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
          h1 { margin: 0; color: #111827; font-size: 24px; font-weight: 900; }
          .report-type { font-size: 18px; font-weight: 800; color: #10b981; margin: 0; text-transform: uppercase; }
          
          .table-container { border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          table { width: 100%; border-collapse: collapse; font-size: 14px; text-align: center; }
          th, td { padding: 16px 12px; border-bottom: 1px solid #f3f4f6; }
          th { background-color: #f8fafc; color: #475569; font-weight: 800; text-transform: uppercase; }
          td.name-col { text-align: left; font-weight: 800; color: #0f172a; }
          .due { color: #dc2626; font-weight: 900; }
          .refund { color: #059669; font-weight: 900; }
          
          .footer { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; }
          .system-gen { font-size: 11px; color: #94a3b8; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${messName}</h1>
            <p style="margin:0; font-size:12px; font-weight:700; color:#6b7280;">সদস্যভিত্তিক জমা ও মিল খরচ রিপোর্ট</p>
          </div>
          <div style="text-align:right;">
            <h2 class="report-type">জমার হিসাব</h2>
            <p style="margin:0; font-size:13px; font-weight:700; color:#4b5563;">মাস: ${toBengaliMonth(selectedMonth)}</p>
          </div>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">মেম্বারের নাম</th>
                <th>জমা</th>
                <th>মিল খরচ</th>
                <th>অবস্থা (বাকি/ফেরত)</th>
              </tr>
            </thead>
            <tbody>
    `;

    pdfSorted.forEach(m => {
      const mDeposited = monthlyDeposits.filter(d => d.memberId === m.id).reduce((a, b) => a + safeNum(b.amount), 0);
      const { mealCost, balance } = getMemberStats(m.id);
      const isDue = parseFloat(balance) < 0;

      html += `
        <tr>
          <td class="name-col">${safeStr(m.name)}</td>
          <td style="font-weight:700;">৳${mDeposited}</td>
          <td style="font-weight:700; color:#64748b;">৳${mealCost}</td>
          <td class="${isDue ? 'due' : 'refund'}">${isDue ? 'বাকি ৳' + Math.abs(parseFloat(balance)).toFixed(0) : 'ফেরত ৳' + parseFloat(balance).toFixed(0)}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
        <div class="footer">
          <div class="system-gen">Generated on: ${formatDate(new Date(), true)}</div>
          <div style="text-align:center;">
            <div style="width:180px; height:1px; background:#94a3b8; margin-bottom:8px;"></div>
            <p style="margin:0; font-size:12px; font-weight:700; color:#64748b;">Manager Signature</p>
          </div>
        </div>
    `;

    printHTML(html);
  };

  const copyJoinLink = async () => {
    const link = `${window.location.origin}/join/${appId}`;
    try {
      await navigator.clipboard.writeText(link);
      alert("ইনভাইট লিংক কপি করা হয়েছে! মেম্বারদের পাঠিয়ে দিন।");
    } catch (err) {
      alert("অটোমেটিক লিংক কপি করতে সমস্যা হয়েছে। দয়া করে নিচের বক্স থেকে লিংকটি সিলেক্ট করে কপি করুন।");
    }
  };

  const handleApproveJoin = async (req) => {
    try {
      if (members.length >= 10 && groupPlan !== 'premium') {
        alert("ফ্রি প্ল্যানে সর্বোচ্চ ১০ জন মেম্বার অ্যাড করা যাবে।");
        return;
      }

      // ✅ প্রথমে check করো — এই email দিয়ে আগে কোনো member আছে কিনা
      const existingMember = members.find(
        m => m.email && req.email && m.email.toLowerCase() === req.email.toLowerCase()
      );

      if (existingMember) {
        // ✅ আগে থেকে আছে — শুধু uid ও phone আপডেট করো, নতুন member তৈরি করো না
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', existingMember.id), {
          uid: req.uid,
          phone: req.phone || existingMember.phone || '',
          email: req.email,
        });
      } else {
        // ✅ নতুন member — তৈরি করো
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'members'), {
          name: clampMemberName(req.name),
          phone: req.phone,
          whatsapp: req.whatsappNumber || '',
          uid: req.uid,
          email: req.email,
          createdAt: new Date().toISOString()
        });
      }

      // groups collection-এ uid যোগ করো
      await updateDoc(doc(db, 'groups', appId), {
        memberUids: arrayUnion(req.uid)
      });
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'join_requests', req.id));
    } catch (e) {
      console.error(e);
      alert("মেম্বার অ্যাপ্রুভ করতে সমস্যা হয়েছে।");
    }
  };


  const handleRejectJoin = async (reqId) => {
    if (window.confirm("রিকোয়েস্টটি রিজেক্ট করতে চান?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'join_requests', reqId));
    }
  };

  const getMemberName = (id) => {
    const m = members.find(m => m.id === id);
    return m ? safeStr(m.name) : "অজানা";
  };

  const handleSendReminders = async () => {
    if (!window.confirm("মেনুয়ালি রিমাইন্ডার ইমেইল পাঠাতে চান?")) return;

    let emailsSent = 0;
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    const dateMapping = {
      wifi: parseInt(dueDates.wifi),
      current: parseInt(dueDates.current),
      rent: parseInt(dueDates.rent),
      maid: parseInt(dueDates.maid)
    };
    const titles = { wifi: "ওয়াইফাই", current: "বিদ্যুৎ", rent: "বাসা ভাড়া", maid: "খালার বেতন" };

    const membersWithEmails = members.filter(m => m.email);
    if (membersWithEmails.length === 0) {
      alert("কোনো মেম্বারের ইমেইল অ্যাড্রেস যুক্ত নেই।");
      return;
    }

    try {
      for (const member of membersWithEmails) {
        let remindersToSend = [];

        Object.keys(dateMapping).forEach(key => {
          let targetDay = dateMapping[key];
          if (isNaN(targetDay)) return;

          let diff = targetDay - currentDay;
          if (diff < 0) diff += daysInMonth;

          // 3 দিন বা তার কম থাকলে নোটিফিকেশন যাবে
          if (diff > 0 && diff <= 3) {
            let amount = sharePerHead[key] || 0;
            if (key === 'current' && member.isPcUser) {
              amount += sharePerHead.pcCharge || 0;
            }
            if (key === 'current') { amount = sharePerHead.currentBase + (member.isPcUser ? sharePerHead.pcCharge : 0); }

            remindersToSend.push({
              title: titles[key],
              daysLeft: diff,
              targetDay: targetDay,
              amount: amount.toFixed(2)
            });
          }
        });

        if (remindersToSend.length > 0) {
          let reqHtml = `<div style="font-family:sans-serif; padding:20px; color:#333;">
            <h2 style="color:#f59e0b;">বিল পরিশোধের রিমাইন্ডার</h2>
            <p>প্রিয় ${member.name},</p>
            <p>মেসের নিচের ফিক্সড বিল পরিশোধের তারিখ কাছাকাছি চলে এসেছে:</p>
            <ul>`;

          remindersToSend.forEach(r => {
            reqHtml += `<li><strong>${r.title}</strong>: ৳${r.amount} (শেষ তারিখ: মাসের ${r.targetDay} তারিখ, বাকি: ${r.daysLeft} দিন)</li>`;
          });

          reqHtml += `</ul>
            <p>অনুগ্রহ করে নির্দিষ্ট তারিখের পূর্বে বিল পরিশোধ করুন।</p>
            <div style="margin: 25px 0;">
               <a href="${window.location.origin}" style="display:inline-block; padding:12px 24px; background-color:#4f46e5; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:bold;">Login to Dashboard</a>
            </div>
            <hr style="border:1px solid #eee; margin:20px 0;" />
            <p style="font-size:12px; color:#999;">Meal Manager Team</p>
          </div>`;

          await sendEmail(member.email, 'Meal Manager - Bill Reminder', reqHtml);
          emailsSent++;
        }
      }
      alert(`সফলভাবে ${emailsSent} টি রিমাইন্ডার ইমেইল পাঠানো হয়েছে।`);
    } catch (e) {
      console.error(e);
      alert("ইমেইল পাঠাতে সমস্যা হয়েছে। ব্যাকএন্ড চেক করুন।");
    }
  };

  if (loading) return <SmoothLoader show={loading} text="লোড হচ্ছে..." />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="min-h-screen w-full flex bg-slate-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-purple-50 text-slate-800 font-sans selection:bg-indigo-200 relative overflow-x-hidden max-md:h-[100dvh] max-md:max-h-[100dvh]"
    >
      {/* PC Sidebar Navigation */}
      <aside className="hidden md:block w-72 bg-white/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[calc(100vh-8rem)] sticky top-28 overflow-y-auto">
        <div className="space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mb-2 block">অফলাইন স্ট্যাটাস</span>
            <div className={`p-4 rounded-2xl flex items-center gap-3 ${isOnline ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
              {isOnline ? <Wifi size={24} className="text-emerald-500" /> : <WifiOff size={24} className="text-rose-500 animate-pulse" />}
              <div>
                <p className={`text-sm font-bold ${isOnline ? 'text-emerald-800' : 'text-rose-800'}`}>{isOnline ? 'Cloud Synced' : 'Offline Mode'}</p>
                <p className="text-[10px] font-medium text-slate-500">{isOnline ? 'সব ডাটা সেভ আছে' : 'ডাটা ফোনে সেভ হচ্ছে'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mb-2 block">প্রধান মেনু</span>
            <button
              onClick={() => switchTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold transition transition-all transform-gpu ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-2' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}`}
            >
              <LayoutDashboard size={20} /> <span>{isManager ? 'ওভারভিউ' : 'আমার প্রোফাইল'}</span>
            </button>
            {isManager && (
              <>
                <button
                  onClick={() => switchTab('bills')}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold transition transition-all transform-gpu ${activeTab === 'bills' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-2' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}`}
                >
                  <FileText size={20} /> <span>ফিক্সড বিল</span>
                </button>
                <button
                  onClick={() => switchTab('meals')}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold transition transition-all transform-gpu ${activeTab === 'meals' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-2' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}`}
                >
                  <Utensils size={20} /> <span>মিল এন্ট্রি</span>
                </button>
              </>
            )}
            <button
              onClick={() => switchTab('bazar')}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold transition transition-all transform-gpu ${activeTab === 'bazar' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-2' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}`}
            >
              <ShoppingCart size={20} /> <span>বাজার খরচ</span>
            </button>
            <button
              onClick={() => switchTab('fine')}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold transition transition-all transform-gpu ${activeTab === 'fine' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 translate-x-2' : 'text-slate-600 hover:bg-rose-50 hover:text-rose-500'}`}
            >
              <AlertTriangle size={20} /> <span>দণ্ড</span>
            </button>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mb-2 block">অ্যাডভান্সড ফিচারস্ </span>
            <button
              onClick={() => switchTab('menu')}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold transition transition-all transform-gpu ${activeTab === 'menu' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 translate-x-2' : 'text-slate-600 hover:bg-amber-50 hover:text-amber-500'}`}
            >
              <CalendarIcon size={20} /> <span>খাবারের মেনু (AI)</span>
            </button>
            <button
              onClick={() => switchTab('vote')}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold transition transition-all transform-gpu ${activeTab === 'vote' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 translate-x-2' : 'text-slate-600 hover:bg-rose-50 hover:text-rose-500'}`}
            >
              <CheckSquare size={20} /> <span>ভোটিং সিস্টেম</span>
            </button>
            <button
              onClick={() => switchTab('bua')}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold transition transition-all transform-gpu ${activeTab === 'bua' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 translate-x-2' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-500'}`}
            >
              <CalendarCheck size={20} /> <span>বুয়া ট্র্যাকার</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button onClick={() => switchTab('deposit')} className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold transition transition-all transform-gpu ${activeTab === 'deposit' ? 'bg-slate-800 text-white shadow-lg shadow-slate-200 translate-x-2' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Wallet size={20} className="shrink-0" /> <span className="text-left text-sm">টাকা জমা</span>
            </button>
            <button onClick={() => switchTab('members')} className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold transition transition-all transform-gpu ${activeTab === 'members' ? 'bg-slate-800 text-white shadow-lg shadow-slate-200 translate-x-2' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Users size={20} className="shrink-0" /> <span className="text-left text-sm">সব মেম্বার</span>
            </button>
            {isManager && (
              <button onClick={() => switchTab('settings')} className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold transition transition-all transform-gpu ${activeTab === 'settings' ? 'bg-slate-800 text-white shadow-lg shadow-slate-200 translate-x-2' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Settings size={20} className="shrink-0" /> <span className="text-left text-sm">সেটিংস</span>
              </button>
            )}
          </div>

        </div>
      </aside>

      {/* Main Screen Wrapping */}
      <div className="flex-1 w-full min-h-0 md:min-h-screen overflow-y-auto overflow-x-hidden overscroll-y-contain pb-2 md:pb-8 relative z-10 max-md:scroll-pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        {/* Animated Orbs */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden mix-blend-multiply opacity-60">
          <div className="hidden md:block absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-300/40 rounded-full blur-[100px] animate-blob"></div>
          <div className="hidden md:block absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-purple-300/40 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
          <div className="hidden md:block absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>
        </div>
        {/* Modals */}
        {permError && <div className="fixed top-20 left-4 right-4 z-[200] bg-gradient-to-r from-rose-600 to-red-700 text-white hover:shadow-lg hover:shadow-red-300 p-4 rounded-xl shadow-xl flex items-center gap-3"><AlertCircle size={24} /><p className="text-sm font-bold">{permError}</p><button onClick={() => setPermError(null)} className="ml-auto">X</button></div>}



        <AnimatePresence>
          {showAddMemberModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[160] bg-black/60 flex items-center justify-center p-4 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl w-full max-w-sm border border-slate-100"
              >
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><UserPlus className="text-indigo-500 text-xl" /> নতুন মেম্বার</h3>
                  <button onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-rose-500 bg-slate-50 p-2 rounded-full transition-colors"><X size={18} /></button>
                </div>
                <form onSubmit={addMember} className="space-y-4 text-left">
                  <div>
                    <label className="text-[11px] uppercase font-black tracking-wider text-slate-400 mb-2 block">নাম <span className="text-rose-500">*</span> <span className="font-semibold normal-case text-slate-400">(সর্বোচ্চ {MEMBER_NAME_MAX_LENGTH} অক্ষর)</span></label>
                    <input autoFocus value={newMemberData.name} maxLength={MEMBER_NAME_MAX_LENGTH} onChange={e => setNewMemberData({ ...newMemberData, name: e.target.value.slice(0, MEMBER_NAME_MAX_LENGTH) })} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl text-base md:text-sm font-bold outline-none transition shadow-inner" placeholder="উদাঃ Shipon Talukdar" required />
                    <p className="mt-1 text-right text-[10px] font-bold text-slate-400">{newMemberData.name.length}/{MEMBER_NAME_MAX_LENGTH}</p>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-black tracking-wider text-slate-400 mb-2 block">ফোন নম্বর <span className="text-slate-300 font-bold">(অপশনাল)</span></label>
                    <input value={newMemberData.phone} onChange={e => setNewMemberData({ ...newMemberData, phone: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl text-base md:text-sm font-bold outline-none transition shadow-inner" placeholder="017xxxxxxxx" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-black tracking-wider text-slate-400 mb-2 block">ইমেইল <span className="text-slate-300 font-bold">(অপশনাল)</span></label>
                    <input type="email" value={newMemberData.email} onChange={e => setNewMemberData({ ...newMemberData, email: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl text-base md:text-sm font-bold outline-none transition shadow-inner" placeholder="name@example.com" />
                  </div>
                  <button type="submit" className="w-full p-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-200/50 text-white rounded-xl font-black mt-4 transition transform-gpu active:scale-[0.98] flex items-center justify-center gap-2">
                    যোগ করুন
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showBazarMemberModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[160] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
              onClick={() => setShowBazarMemberModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xs border border-slate-100 flex flex-col"
                style={{ height: 'min(65vh, 440px)', maxHeight: 'min(65vh, 440px)' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header - fixed, never shrinks */}
                <div className="flex justify-between items-center px-4 pt-4 pb-3 border-b border-slate-100 shrink-0">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <CheckCircle className="text-indigo-500 shrink-0" size={15} />
                    মেম্বার নির্বাচন
                    <span className="text-[10px] text-slate-400 font-medium">({selectedBazarMembers.length} জন)</span>
                  </h3>
                  <button onClick={() => setShowBazarMemberModal(false)} className="text-slate-400 hover:text-rose-500 p-1.5 rounded-full transition-colors"><X size={15} /></button>
                </div>

                {/* Scrollable Member List - fills all remaining space */}
                <div className="overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar" style={{ flex: '1 1 auto', minHeight: 0 }}>
                  {membersSortedByBazarDesc.map(m => {
                    const memberBazarTotal = bazarTotalsByMember[m.id] || 0;
                    const isSelected = selectedBazarMembers.includes(m.id);
                    return (
                      <label key={m.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-600' : 'bg-slate-100 border-slate-300'}`}>
                          {isSelected && <CheckCircle size={11} className="text-white" />}
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-700 font-black shrink-0">
                          {safeStr(m.name).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-800' : 'text-slate-700'}`}>{safeStr(m.name)}</p>
                          {memberBazarTotal > 0 && <p className="text-[9px] font-bold text-emerald-600">৳{memberBazarTotal.toFixed(0)} বাজার</p>}
                        </div>
                        <input type="checkbox" className="hidden" checked={isSelected} onChange={(e) => {
                          if (e.target.checked) setSelectedBazarMembers([...selectedBazarMembers, m.id]);
                          else setSelectedBazarMembers(selectedBazarMembers.filter(id => id !== m.id));
                        }} />
                      </label>
                    );
                  })}
                </div>

                {/* Footer Button - always visible at bottom */}
                <div className="px-3 pb-4 pt-2 border-t border-slate-100 shrink-0">
                  <button type="button" onClick={() => setShowBazarMemberModal(false)} className="w-full p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition transform-gpu active:scale-[0.97] flex items-center justify-center gap-2 text-sm">
                    <CheckCircle size={15} /> ঠিক আছে
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {false && geminiKeyModal && (
          <div className="fixed inset-0 z-[160] bg-black/60 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm border border-slate-100 animate-in zoom-in-95">
              <h3 className="text-xl font-black mb-2 text-slate-800 flex items-center gap-2"><Star className="text-amber-500 text-xl" /> API Key দিন</h3>
              <p className="text-xs text-slate-500 mb-6 font-medium">এআই দিয়ে স্বয়ংক্রিয় মেনু তৈরি করতে Google Gemini এর ফ্রি API Key প্রয়োজন। <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-500 underline">এখান থেকে ফ্রি কি নিন</a></p>
              <input id="api_key_input" type="password" className="w-full p-3 border border-slate-200 rounded-xl mb-6 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition transition-all transform-gpu font-mono" placeholder="AIzaSy..." />
              <div className="flex gap-3">
                <button onClick={() => setGeminiKeyModal(false)} className="flex-1 p-3 bg-slate-100 hover:bg-slate-200 transition-colors transform-gpu text-slate-600 rounded-xl font-bold">বাতিল</button>
                <button onClick={() => {
                  const k = document.getElementById('api_key_input').value;
                  if (k) { localStorage.setItem('geminiApiKey', k); setGeminiKeyModal(false); generateAIMenu(); }
                }} className="flex-1 p-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-200 text-white rounded-xl font-bold">সেভ করুন</button>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showMealRateForecastModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xl backdrop-saturate-150 sm:p-6"
              onClick={() => setShowMealRateForecastModal(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="meal-rate-forecast-title"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="flex max-h-[min(92dvh,40rem)] min-h-0 w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white shadow-[0_24px_64px_-12px_rgba(15,23,42,0.28)] flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-start justify-between gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white sm:px-5 sm:py-3.5">
                  <div className="min-w-0 pr-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">AI বিশ্লেষণ</p>
                    <h3 id="meal-rate-forecast-title" className="mt-0.5 text-base font-black text-white sm:text-lg">
                      সম্ভাব্য মাসিক মিলরেট
                    </h3>
                    <p className="mt-0.5 text-[10px] font-medium text-indigo-100/95 sm:text-xs">
                      বাজার ও মিল ট্রেন্ড থেকে আনুমানিক রেট।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMealRateForecastModal(false)}
                    className="shrink-0 rounded-full border border-white/40 bg-white/20 p-2 text-white transition hover:bg-white/30"
                    aria-label="বন্ধ করুন"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div
                  className="min-h-0 min-w-0 flex-1 touch-pan-y space-y-3 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-slate-50 px-4 py-3 sm:space-y-4 sm:px-5 sm:py-4 custom-scrollbar"
                  style={{ paddingBottom: 'max(1.75rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))' }}
                >
                  {mealRateForecastLoading && (
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center shadow-sm">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-sm">
                        <Loader />
                      </div>
                      <h4 className="text-lg font-black text-slate-800">AI হিসাব করছে...</h4>
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        দৈনিক ট্রেন্ড + বাজার-দিনের হার হিসাব করে বেসলাইন বের করা হচ্ছে, তারপর AI সংক্ষিপ্ত বিশ্লেষণ যোগ হচ্ছে।
                      </p>
                    </div>
                  )}

                  {!mealRateForecastLoading && mealRateForecastError && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <div>
                          <p className="font-black">AI estimate আনা যায়নি</p>
                          <p className="mt-1 text-sm font-medium">{mealRateForecastError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!mealRateForecastLoading && mealRateForecastResult && (
                    <>
                      <div className="rounded-2xl border border-indigo-700/25 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-700 p-4 text-center shadow-lg sm:p-5 sm:text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white">সম্ভাব্য মিলরেট</p>
                        <h4 className="mt-1.5 text-3xl font-black tracking-tight text-white drop-shadow-sm sm:text-[2.25rem]">
                          ৳{mealRateForecastResult.estimatedMealRate}
                        </h4>
                        {mealRateForecastResult.monthLabel && (
                          <p className="mt-2 text-xs font-semibold text-indigo-50">{mealRateForecastResult.monthLabel}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-3.5">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">সম্ভাব্য মোট মিল</p>
                          <p className="mt-1 text-lg font-black text-slate-900 sm:text-xl">{mealRateForecastResult.projectedTotalMeals}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-3.5">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">সম্ভাব্য মোট বাজার</p>
                          <p className="mt-1 text-lg font-black text-slate-900 sm:text-xl">৳{mealRateForecastResult.projectedTotalBazar}</p>
                        </div>
                      </div>

                      {mealRateForecastResult.summary && (
                        <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] font-semibold leading-relaxed text-slate-700">
                          {mealRateForecastResult.summary}
                        </p>
                      )}
                      {mealRateForecastResult.advice && (
                        <p className="px-1 text-center text-[10px] font-medium leading-relaxed text-slate-500">{mealRateForecastResult.advice}</p>
                      )}
                      {mealRateForecastResult.sourceLabel && (
                        <p className="text-center text-[9px] font-bold uppercase tracking-wide text-indigo-500/90">{mealRateForecastResult.sourceLabel}</p>
                      )}

                      <p className="px-1 text-center text-[11px] font-bold leading-relaxed text-slate-700">
                        বর্তমান মিলরেট <span className="text-indigo-700">৳{mealRate}</span>
                        <span className="mx-1 text-slate-300">·</span>
                        সদস্য {members.length} জন
                      </p>
                      <div className="h-1 shrink-0" aria-hidden />
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showResetModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="bg-white w-full max-w-sm rounded-[2rem] p-6 text-center shadow-2xl border-t-4 border-red-500"
              >
                <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
                <h3 className="text-xl font-black text-red-600 mb-2">সতর্কতা: রিসেট ডাটা</h3>
                <p className="text-slate-600 text-sm mb-6">আপনি কি নিশ্চিত যে আপনি বর্তমান মাসের সকল ডাটা মুছে নতুন মাস শুরু করতে চান?</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowResetModal(false)} className="flex-1 p-3 font-bold bg-slate-100 rounded-xl text-slate-600 transition active:scale-95">না</button>
                  <button onClick={resetMonth} className="flex-1 p-3 font-bold bg-gradient-to-r from-rose-600 to-red-700 text-white hover:shadow-lg hover:shadow-red-300 rounded-xl shadow-lg shadow-red-200 transition active:scale-95">হ্যাঁ, রিসেট</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* ===== HARD LOCK — trial expired, ALL users blocked ===== */}
        {groupPlan === 'free' && trialDaysLeft <= 0 && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg,rgba(15,10,40,0.97),rgba(30,10,60,0.98))', backdropFilter: 'blur(20px)' }}>
            <div className="absolute top-0 left-0 w-80 h-80 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 w-full max-w-md">
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-rose-500 to-rose-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-rose-900/50">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight mb-2">ট্রায়াল শেষ হয়েছে!</h2>
                <p className="text-rose-300 font-bold text-sm">আপনার ৩০ দিনের ফ্রি ট্রায়াল মেয়াদ শেষ।</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] p-8 text-white">
                <p className="text-slate-300 text-sm text-center mb-6 leading-relaxed">
                  অ্যাপটি ব্যবহার অব্যাহত রাখতে প্রিমিয়াম প্ল্যান নিন। আপনার সব ডাটা সুরক্ষিত আছে — প্রিমিয়াম নিলেই আবার সব দেখতে এবং ব্যবহার করতে পারবেন।
                </p>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 space-y-2">
                  {['মিল এন্ট্রি ও এডিট', 'বাজার খরচ যোগ করা', 'মাসিক রিপোর্ট', 'সদস্য পরিচালনা', 'সব ডাটা অ্যাক্সেস'].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-rose-300"><span>🔒</span>{item}</div>
                  ))}
                </div>
                <button onClick={() => navigate('/checkout')} className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-black text-lg rounded-2xl shadow-xl shadow-amber-900/40 hover:scale-105 transition-transform transform-gpu flex items-center justify-center gap-2">
                  <Crown size={22} /> প্রিমিয়াম নিন — ৳{premiumPrice}/মাস
                </button>
                <a href="https://wa.me/8801570215792?text=আমার Meal Manager-এর trial শেষ হয়েছে। Premium সম্পর্কে জানতে চাই।" target="_blank" rel="noreferrer"
                  className="mt-4 w-full py-3 flex items-center justify-center gap-2 text-green-300 hover:text-green-200 font-bold text-sm transition-colors">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  সাহায্যের জন্য WhatsApp করুন
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ===== TRIAL WARNING POPUP (manager only, still in trial) ===== */}
        {showTrialPopup && groupPlan === 'free' && trialDaysLeft > 0 && isManager && (
          <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white/90 backdrop-blur-2xl border border-white/50 w-full max-w-sm rounded-[2rem] p-8 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in-95">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${trialDaysLeft > 0 ? 'bg-amber-100 text-amber-500' : 'bg-rose-100 text-rose-500'}`}>
                <Crown size={32} />
              </div>

              {trialDaysLeft > 0 ? (
                <>
                  <h3 className="text-2xl font-black tracking-tight text-slate-800 mb-2">ফ্রি ট্রায়াল চলছে!</h3>
                  <p className="text-slate-600 text-sm font-medium mb-2">আপনার ৩০ দিনের ফ্রি ট্রায়াল চলছে। ট্রায়াল শেষ হতে আর <span className="font-black text-amber-600 bg-amber-50 px-2 rounded">{trialDaysLeft} দিন</span> বাকি আছে।</p>
                  <p className="text-xs text-slate-400 mb-6 font-bold">নিরবচ্ছিন্ন সেবা পেতে আজই প্রিমিয়াম প্ল্যানে আপগ্রেড করুন。</p>

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowTrialPopup(false)} className="p-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors transform-gpu">পরে</button>
                    <button onClick={() => navigate('/checkout')} className="p-3 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-black rounded-xl shadow-lg shadow-amber-200/50 hover:scale-105 transition-transform transform-gpu">আপগ্রেড করুন</button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-black tracking-tight text-slate-800 mb-2">ট্রায়াল শেষ! 😢</h3>
                  <p className="text-slate-600 text-sm font-medium mb-6">আপনার ৩০ দিনের ফ্রি ট্রায়াল শেষ হয়ে গেছে। গ্রুপের ডাটা পরিচালনা চালিয়ে যেতে আজই প্রিমিয়াম প্ল্যানে আপডেট করুন।</p>

                  <div className="flex flex-col gap-3">
                    <button onClick={() => navigate('/checkout')} className="w-full p-4 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-black rounded-xl shadow-lg shadow-amber-200/50 hover:scale-105 transition-transform transform-gpu flex justify-center items-center gap-2"><Crown size={18} /> প্রিমিয়াম নিন</button>
                    <button onClick={() => navigate('/dashboard')} className="p-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors transform-gpu">ফিরে যান</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mobile: sticky header + extra tabs (hamburger — শুধু ক্লিক করলে দেখা যাবে) */}
        <div
          ref={mobileExtraNavRef}
          className="md:hidden sticky top-0 z-[90] mx-3 mt-2 mb-0 rounded-2xl border border-white/70 bg-white/98 shadow-sm overflow-hidden transform-gpu"
          style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        >
          <div className="flex justify-between items-center px-4 py-3 gap-2">
            <button type="button" onClick={handleLogout} className="shrink-0 p-2 bg-rose-50/80 rounded-full hover:bg-rose-100 transition-colors flex items-center justify-center" aria-label="লগআউট">
              <LogOut size={16} className="text-rose-600" />
            </button>
            <div className="flex flex-col items-center flex-1 min-w-0 px-1">
              <h1 className="text-sm font-black tracking-tight text-slate-800 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-violet-700 text-center truncate w-full">
                {messName} {groupPlan === 'premium' && <span className="text-amber-500 font-bold ml-1 text-xs">PRO</span>}
              </h1>
              {groupPlan === 'free' && !pendingReq && (
                <p className="text-[9px] font-black tracking-wider text-rose-500 uppercase bg-rose-50 px-2 py-0.5 rounded-full mt-1">ফ্রি ট্রায়াল: {trialDaysLeft} দিন বাকি</p>
              )}
              {pendingReq && (
                <p className="text-[9px] font-black tracking-wider text-sky-600 uppercase bg-sky-50 px-2 py-0.5 rounded-full mt-1 flex items-center gap-1">
                  <Clock size={10} /> পেমেন্ট ভেরিফাই হচ্ছে...
                </p>
              )}
            </div>
            <button
              type="button"
              aria-expanded={mobileExtraNavOpen}
              aria-label={mobileExtraNavOpen ? 'মেনু বন্ধ করুন' : 'আরও মেনু খুলুন'}
              onClick={() => setMobileExtraNavOpen((o) => !o)}
              className={`shrink-0 p-2.5 rounded-xl border transition-colors flex items-center justify-center ${mobileExtraNavOpen ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-800 shadow-sm'}`}
            >
              {mobileExtraNavOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
            </button>
          </div>
          <AnimatePresence initial={false}>
            {mobileExtraNavOpen && (
              <motion.div
                key="mobile-extra-nav"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="overflow-hidden border-t border-slate-100/80"
              >
                <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-3" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {mobileExtraTabs.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        switchTab(item.id);
                        setMobileExtraNavOpen(false);
                      }}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-[11px] uppercase tracking-wider font-black whitespace-nowrap transition-colors flex items-center gap-1.5 border shadow-sm ${activeTab === item.id ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'}`}
                    >
                      <item.icon size={14} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop header */}
        <div className={`hidden md:flex sticky top-4 mx-4 md:mx-8 z-[90] px-5 md:px-6 py-4 bg-white/92 border border-white/70 justify-between items-center shadow-[0_6px_18px_rgb(0,0,0,0.05)] rounded-[2rem]`}>
          <div className="flex flex-col items-start flex-1 md:flex-none mr-2 md:mr-0">
            <h1 className="text-base md:text-xl font-black tracking-tight text-slate-800 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-violet-700">
              {messName} {groupPlan === 'premium' && <span className="text-amber-500 font-bold ml-1 text-sm md:text-lg">PRO</span>}
            </h1>
            {groupPlan === 'free' && !pendingReq && (
              <p className="text-[10px] font-black tracking-wider text-rose-500 uppercase bg-rose-50 px-2 py-0.5 rounded-full mt-1">ফ্রি ট্রায়াল: {trialDaysLeft} দিন বাকি</p>
            )}
            {pendingReq && (
              <p className="text-[10px] font-black tracking-wider text-sky-600 uppercase bg-sky-50 px-2.5 py-0.5 rounded-full mt-1 flex items-center gap-1 shadow-sm">
                <Clock size={12} /> পেমেন্ট ভেরিফাই হচ্ছে...
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 shadow-inner">
              <div className={`w-2 h-2 rounded-full ${pendingWrites > 0 ? 'bg-amber-500 animate-pulse' : isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500 animate-pulse'}`} />
              {pendingWrites > 0 ? <span className="text-amber-700">Syncing {pendingWrites}</span> : isOnline ? <span className="text-emerald-700">Online Sync</span> : <span className="text-rose-600">Offline (Saving)</span>}
            </div>
            <button type="button" onClick={handleLogout} className="flex items-center gap-2 px-6 py-2 bg-rose-50 text-rose-600 border border-rose-200 text-sm font-bold rounded-full hover:bg-rose-100 shadow-md shadow-rose-100 transition transition-all transform-gpu hover:-translate-y-0.5">
              <LogOut size={16} /> লগআউট
            </button>
          </div>
        </div>

        <main className={`relative z-10 max-w-7xl mx-auto px-4 pt-4 pb-6 md:p-8 space-y-8 transition-all duration-200 ${isTabPending ? 'opacity-60 scale-[0.997]' : 'opacity-100 scale-100'}`}>
          {/* Tab Switch Progress Bar */}
          {isTabPending && (
            <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] overflow-hidden pointer-events-none">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-400 to-indigo-600 w-full animate-pulse" style={{ animation: 'tab-progress 0.4s ease-out forwards' }} />
            </div>
          )}
          <AnimatePresence initial={false}>

            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-4 transform-gpu">

                {/* Member Personal Profile Overview */}
                {loggedInMember && (() => {
                  const myStats = getMemberStats(loggedInMember.id);
                  const myFines = fines
                    .filter(f => f.memberId === loggedInMember.id && f.date && typeof f.date === 'string' && f.date.startsWith(selectedMonth))
                    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
                  return (
                    <div className="space-y-4 mb-2">
                      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 p-3 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 md:p-6 md:rounded-[2rem] md:gap-6 transition-transform transform-gpu hover:shadow-md hover:-translate-y-1">
                        <div className="flex items-center gap-3 shrink-0 min-w-0 md:gap-4">
                          <div className="w-10 h-10 shrink-0 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-base shadow-md shadow-indigo-200/80 md:w-14 md:h-14 md:rounded-2xl md:text-2xl md:shadow-lg">
                            {safeStr(loggedInMember.name).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h2 className="text-sm font-black text-indigo-950 leading-tight truncate md:text-2xl md:leading-normal">{safeStr(loggedInMember.name)}</h2>
                            <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wide md:text-xs md:tracking-widest">{loggedInMember.isManagerTag ? 'ম্যানেজার' : 'সাধারণ সদস্য'}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 min-w-0 md:gap-3 md:w-auto md:flex-none">
                          <div className="flex-1 bg-white px-2 py-2 rounded-xl border border-indigo-50 shadow-sm flex flex-col items-center justify-center leading-none md:flex-none md:px-5 md:py-3 md:rounded-2xl md:shadow-[0_4px_15px_rgb(0,0,0,0.02)]">
                            <p className="text-[8px] text-slate-400 font-bold uppercase mb-1 md:text-[10px]">মোট মিল</p>
                            <p className="text-xs font-black text-slate-800 md:text-xl">{myStats.meals}</p>
                          </div>
                          <div className="flex-1 bg-white px-2 py-2 rounded-xl border border-indigo-50 shadow-sm flex flex-col items-center justify-center leading-none md:flex-none md:px-5 md:py-3 md:rounded-2xl md:shadow-[0_4px_15px_rgb(0,0,0,0.02)]">
                            <p className="text-[8px] text-slate-400 font-bold uppercase mb-1 md:text-[10px]">ব্যালেন্স</p>
                            <p className={`text-xs font-black tabular-nums md:text-xl ${Number(myStats.balance) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {Number(myStats.balance) < 0 ? `-৳${Math.abs(myStats.balance)}` : `+৳${myStats.balance}`}
                            </p>
                          </div>
                          <div className="flex-1 bg-white px-2 py-2 rounded-xl border border-indigo-50 shadow-sm flex flex-col items-center justify-center leading-none md:flex-none md:px-5 md:py-3 md:rounded-2xl md:shadow-[0_4px_15px_rgb(0,0,0,0.02)]">
                            <p className="text-[8px] text-slate-400 font-bold uppercase mb-1 md:text-[10px]">জমা</p>
                            <p className="text-xs font-black text-indigo-500 tabular-nums md:text-xl">৳{myStats.paid}</p>
                          </div>
                        </div>
                      </div>

                      {myFines.length > 0 && (
                        <div className="bg-white/70 backdrop-blur-xl border border-rose-100 p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <h3 className="font-black text-slate-800 flex items-center gap-2"><AlertTriangle size={18} className="text-rose-500" /> আমার দণ্ড</h3>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 px-3 py-1 rounded-full border border-rose-100">{myFines.length}টি</span>
                          </div>
                          <div className="space-y-2">
                            {myFines.map(f => (
                              <div key={f.id} className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 flex justify-between items-start gap-3">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-wider text-rose-500 mb-1">কেন দণ্ড দিয়েছে</p>
                                  <p className="font-bold text-rose-800 text-sm">{safeStr(f.reason)}</p>
                                  <p className="text-[11px] text-slate-500 font-semibold mt-2">তারিখ: {formatDate(f.date)}</p>
                                </div>
                                <span className="shrink-0 bg-white text-rose-600 font-black text-xs px-3 py-1.5 rounded-xl border border-rose-100">+{safeNum(f.mealCount || 2)} মিল</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Stats Cards */}
                {isManager && (
                  <div className="flex justify-end">
                      <button
                        onClick={runMealRateForecast}
                        className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/90 px-4 py-2 text-xs font-black tracking-wide text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                      >
                        <Star size={14} />
                        সম্ভাব্য মিলরেট
                      </button>
                  </div>
                )}
                {false && isManager && (
                  <div className="flex justify-end">
                    <button
                      onClick={runMealRateForecast}
                      className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-wider text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                    >
                      <Star size={14} />
                      AI à¦¸à¦®à§à¦­à¦¾à¦¬à§à¦¯ à¦®à¦¿à¦²à¦°à§‡à¦Ÿ
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-8 rounded-[2rem] text-white shadow-[0_20px_40px_-15px_rgba(124,58,237,0.5)] border border-white/20 hover:scale-[1.02] transition-transform transform-gpu duration-500 relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start">
                        <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Wallet size={14} /> ক্যাশ ফান্ডিং</p>
                        <div className="bg-amber-500/30 border border-amber-300/50 text-amber-50 p-1.5 px-3 rounded-xl text-[11px] font-bold backdrop-blur-sm flex items-center gap-1 shadow-lg"><Clock size={12} /> মাসের বাকি: {daysLeft} দিন</div>
                      </div>
                      <h2 className="text-5xl font-black tracking-tight drop-shadow-md mb-2 mt-4">৳{fundStatus}</h2>
                      <div className="flex gap-3 text-xs font-medium bg-white/10 p-2 rounded-xl w-fit backdrop-blur-sm">
                        <span className="flex items-center gap-1"><TrendingUp size={12} className="text-green-300" /> জমা: ৳{totalDeposits}</span>
                        <span className="w-px bg-white/20"></span>
                        <span className="flex items-center gap-1"><TrendingDown size={12} className="text-red-300" /> খরচ: ৳{cashBazar}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:col-span-2 gap-4 h-full">
                    <div className="bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition transition-all transform-gpu duration-300 flex flex-col justify-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">মিল রেট</p>
                      <h2 className="text-3xl font-black tracking-tight text-slate-800 filter drop-shadow-sm">৳{mealRate}</h2>
                    </div>
                    <div className="bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition transition-all transform-gpu duration-300 flex flex-col justify-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">মোট মিল</p>
                      <h2 className="text-3xl font-black tracking-tight text-orange-500 filter drop-shadow-sm">{totalMealsFromRecords}</h2>
                    </div>
                    <div className="bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition transition-all transform-gpu duration-300 flex flex-col justify-center col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">বাজার ও ফিক্সড বিল ওভারভিউ</p>
                      <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-2">
                        <div className="shrink-0">
                          <h2 className="text-3xl font-black tracking-tight text-emerald-600 filter drop-shadow-sm">৳{totalBazarAmount}</h2>
                          <span className="text-[9px] font-bold text-slate-400">সর্বমোট বাজার</span>
                        </div>
                        <div className="flex items-center gap-8 border-l border-slate-200 pl-6 shrink-0 pr-2">
                          <div className="text-center font-bold shrink-0">
                            <span className="text-[10px] text-slate-400 block mb-1">ওয়াইফাই</span>
                            <span className="text-slate-800 text-sm block">৳{sharePerHead.wifi.toFixed(0)}</span>
                            <span className="text-[8px] text-indigo-400 block p-0.5 bg-indigo-50 rounded-full mt-1">({dueDates.wifi} তারিখ)</span>
                          </div>
                          <div className="text-center font-bold border-l border-slate-100 pl-6 shrink-0">
                            <span className="text-[10px] text-slate-400 block mb-1">বিদ্যুৎ</span>
                            <span className="text-slate-800 text-sm block">৳{sharePerHead.currentBase.toFixed(0)}</span>
                            {sharePerHead.pcCharge > 0 && <span className="text-[9px] text-rose-500 block font-black">+৳{sharePerHead.pcCharge} (পিসি)</span>}
                            <span className="text-[8px] text-indigo-400 block p-0.5 bg-indigo-50 rounded-full mt-1">({dueDates.current} তারিখ)</span>
                          </div>
                          <div className="text-center font-bold border-l border-slate-100 pl-6 shrink-0">
                            <span className="text-[10px] text-slate-400 block mb-1">ভাড়া</span>
                            <span className="text-slate-800 text-sm block">৳{sharePerHead.rent.toFixed(0)}</span>
                            <span className="text-[8px] text-indigo-400 block p-0.5 bg-indigo-50 rounded-full mt-1">({dueDates.rent} তারিখ)</span>
                          </div>
                          <div className="text-center font-bold border-l border-slate-100 pl-6 shrink-0">
                            <span className="text-[10px] text-slate-400 block mb-1">খালা</span>
                            <span className="text-slate-800 text-sm block">৳{sharePerHead.maid.toFixed(0)}</span>
                            <span className="text-[8px] text-indigo-400 block p-0.5 bg-indigo-50 rounded-full mt-1">({dueDates.maid || '5'} তারিখ)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {notice && (
                  <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/90 backdrop-blur-xl border border-white/60 p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(251,146,60,0.1)] relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-orange-200"><Bell size={64} /></div>
                    <div className="relative z-10 flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-2"><Bell size={14} /> নোটিশ বোর্ড</h4>
                        <p className="text-sm font-bold text-orange-900 leading-relaxed max-w-[95%]">{safeStr(notice)}</p>
                      </div>
                      {isManager && (
                        <button
                          onClick={async () => {
                            if (window.confirm('Notice মুছে ফেলতে চান?')) {
                              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'notice_config'), { text: '' });
                            }
                          }}
                          className="p-2 bg-white/50 text-orange-500 hover:text-rose-600 hover:bg-rose-100 rounded-full transition-colors md:opacity-0 group-hover:opacity-100 shadow-sm shrink-0"
                          title="নোটিশ মুছে ফেলুন"
                        >
                          <X size={16} className="stroke-[3]" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 overflow-hidden">
                  <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">সদস্যদের হিসাব</h3>
                    <div className="flex items-center gap-3">
                      <button onClick={generateMonthlyPDF} className="flex items-center gap-1 text-[10px] font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-colors transform-gpu px-3 py-1.5 rounded-lg active:scale-95">
                        <Printer size={14} /> রিপোর্ট ডাউনলোড
                      </button>
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-lg hidden md:block">{members.length} জন</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto scrollbar-x-future">
                    <table className="w-full min-w-[720px] text-left text-sm whitespace-nowrap md:min-w-0">
                      <thead className="bg-white/40 text-[10px] border-b border-slate-100 uppercase text-slate-400 font-bold">
                        <tr>
                          <th className="p-4 text-left">নাম</th>
                          <th className="p-4 text-center">মিল</th>
                          <th className="p-4 text-center text-rose-500 bg-rose-50/40">দণ্ড মিল</th>
                          <th className="p-4 text-center text-slate-600">মিল খরচ</th>
                          <th className="p-4 text-center text-rose-500 bg-rose-50/50">ফিক্সড বিল বাকি</th>
                          <th className="p-4 text-center">মিলের জমা</th>
                          <th className="p-4 text-right">মিল হিসাবের অবস্থা</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {membersSortedByTotalDueDesc.map(m => {
                          const st = getMemberStats(m.id);
                          return (
                            <tr key={m.id} className={`transition-colors transform-gpu py-2 hover:shadow-sm ${loggedInMember?.id === m.id ? 'bg-indigo-50/50 border-l-[3px] border-indigo-500 relative' : 'hover:bg-slate-50/80'}`}>
                              <td className="p-4 flex items-center gap-2 font-bold text-sm text-slate-800">
                                <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] text-indigo-600">
                                  {safeStr(m.name).charAt(0).toUpperCase()}
                                </div>
                                {safeStr(m.name)} {m.isManagerTag && <Crown size={12} className="text-amber-500" fill="currentColor" />}
                              </td>
                              <td className="p-4 text-center text-sm font-medium text-slate-600">{st.meals}</td>
                              <td className="p-4 text-center text-sm font-black text-rose-500 bg-rose-50/20">{st.fineMeals}</td>
                              <td className="p-4 text-center text-[13px] text-slate-700 font-bold font-mono">৳{st.mealCost}</td>
                              <td className={`p-4 text-center text-[12px] font-black ${st.billDue > 0 ? 'text-rose-600 bg-rose-50/30' : 'text-emerald-600 bg-emerald-50/30'}`}>
                                {st.billDue > 0 ? `৳${st.billDue}` : 'Paid'}
                              </td>
                              <td className="p-4 text-center text-[13px] font-black text-indigo-600 font-mono">৳{st.paid}</td>
                              <td className={`p-4 text-right font-black text-[13px] font-mono ${Number(st.balance) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {Number(st.balance) < 0 ? `৳${Math.abs(st.balance)} (বাকি)` : `৳${st.balance} (ফেরত)`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- Bills Tab --- */}
            {activeTab === 'bills' && (
              <motion.div key="bills" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-6 transform-gpu">
                <div className="flex justify-between items-center bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition transition-all transform-gpu duration-300">
                  <h3 className="font-black text-slate-800 flex items-center gap-2"><Zap size={20} className="text-amber-500" /> ফিক্সড বিল</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowNoticePopup(true)} className="bg-rose-100/80 hover:bg-rose-500 text-rose-600 hover:text-white p-2 md:px-4 rounded-xl text-xs font-black shadow-sm transition transition-all flex items-center gap-2"><Printer size={16} /> <span className="hidden md:inline">Download Notice</span></button>
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-2 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-slate-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2rem] text-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] grid grid-cols-4 gap-4 text-center border border-slate-700">
                  <div><span className="text-[10px] uppercase font-bold opacity-60">WiFi (Last Date: {dueDates.wifi})</span><p className="font-black text-lg">৳{sharePerHead.wifi.toFixed(0)}</p></div>
                  <div className="border-x border-indigo-200"><span className="text-[10px] uppercase font-bold opacity-60">বিদ্যুৎ (Last Date: {dueDates.current})</span><p className="font-black text-lg">৳{sharePerHead.currentBase.toFixed(0)}</p></div>
                  <div className="border-r border-indigo-200"><span className="text-[10px] uppercase font-bold opacity-60">ভাড়া (Last Date: {dueDates.rent})</span><p className="font-black text-lg">৳{sharePerHead.rent.toFixed(0)}</p></div>
                  <div><span className="text-[10px] uppercase font-bold opacity-60">খালা (Last Date: {dueDates.maid || '5'})</span><p className="font-black text-lg">৳{sharePerHead.maid.toFixed(0)}</p></div>
                </div>

                <div className="grid gap-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-2">বিল পেমেন্ট স্ট্যাটাস ({selectedMonth})</h3>
                  {membersSortedByTotalDueDesc.map(m => {
                    const docId = `${m.id}_${selectedMonth}`;
                    const status = billTracking[docId] || {};
                    const name = clampMemberName(safeStr(m.name));
                    return (
                      <div key={m.id} className="bg-white/70 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition transition-all transform-gpu duration-300">
                        <div className="flex justify-between items-center bg-white/50 p-3 rounded-2xl border border-white/50">
                          <span className="font-black text-slate-800 text-sm flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 shrink-0 bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200 rounded-xl flex items-center justify-center text-xs">{name.charAt(0).toUpperCase()}</div>
                            <span className="truncate">{name}</span>
                          </span>
                          <div className="text-right">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">মোট বিল</span>
                            <span className="font-black text-indigo-600 text-sm">৳{(sharePerHead.wifi + sharePerHead.currentBase + (m.isPcUser ? sharePerHead.pcCharge : 0) + sharePerHead.rent + sharePerHead.maid).toFixed(0)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                          {[
                            { key: 'wifi', label: 'WiFi' },
                            { key: 'current', label: 'বিদ্যুৎ' },
                            { key: 'rent', label: 'ভাড়া' },
                            { key: 'maid', label: 'খালা' }
                          ].map(bill => {
                            const isPaid = status[bill.key];

                            // Calculate deadline
                            const [year, monthStr] = selectedMonth.split('-');
                            const dueDay = parseInt(dueDates[bill.key] || '5');
                            const todayDate = new Date();
                            todayDate.setHours(0, 0, 0, 0);
                            const dueDateObj = new Date(parseInt(year), parseInt(monthStr) - 1, dueDay, 0, 0, 0, 0);
                            const diffDays = Math.round((dueDateObj.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

                            let deadlineText = '';
                            let dlColor = '';
                            let wrapColor = '';
                            let labelColor = 'text-slate-700';

                            if (isPaid) {
                              deadlineText = '✓ পরিশোধিত';
                              dlColor = 'text-emerald-700 bg-emerald-100/70 border border-emerald-200';
                              wrapColor = 'bg-emerald-50/50 border-emerald-100';
                              labelColor = 'text-emerald-700';
                            } else {
                              if (diffDays > 1) {
                                deadlineText = `${diffDays} দিন বাকি`;
                                dlColor = 'text-slate-600 bg-white border border-slate-200 shadow-sm';
                                wrapColor = 'bg-slate-50 border-slate-200 shadow-sm';
                              } else if (diffDays === 1) {
                                deadlineText = 'কাল শেষ দিন';
                                dlColor = 'text-amber-800 bg-amber-200 shadow-sm';
                                wrapColor = 'bg-amber-50 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)] ring-1 ring-amber-100';
                                labelColor = 'text-amber-800';
                              } else if (diffDays === 0) {
                                deadlineText = 'আজই শেষ দিন!';
                                dlColor = 'text-white bg-rose-500 shadow-sm';
                                wrapColor = 'bg-rose-50 border-rose-300 ring-1 ring-rose-200 scale-[1.02]';
                                labelColor = 'text-rose-600';
                              } else {
                                deadlineText = `${Math.abs(diffDays)} দিন ওভারডিউ!`;
                                dlColor = 'text-white bg-rose-600 shadow-md animate-pulse';
                                wrapColor = 'bg-rose-100 border-rose-400 ring-2 ring-rose-200 scale-[1.02]';
                                labelColor = 'text-rose-900';
                              }
                            }

                            return (
                              <div key={bill.key} className={`flex justify-between items-center p-2.5 rounded-xl border transition-colors transform-gpu duration-300 ${wrapColor}`}>
                                <div className="flex flex-col gap-1.5">
                                  <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                                    {bill.label}
                                    <span className="text-[8px] opacity-60 font-bold bg-white/50 px-1 rounded">({dueDay} তারিখ)</span>
                                  </span>
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded w-max ${dlColor}`}>{deadlineText}</span>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`text-[7px] font-black uppercase tracking-widest ${isPaid ? 'text-emerald-500' : 'text-slate-400'}`}>{isPaid ? 'PAID' : 'DUE'}</span>
                                  <button
                                    onClick={() => toggleBillStatus(m.id, bill.key)}
                                    disabled={!isManager}
                                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${isPaid ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : (diffDays <= 0 ? 'bg-slate-400' : 'bg-slate-300')} ${!isManager ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPaid ? 'translate-x-3' : 'translate-x-0'}`} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Meals Tab */}
            {activeTab === 'meals' && (
              <motion.div key="meals" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-6 transform-gpu">
                <div className="sticky top-20 z-30 bg-white p-2 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-wrap items-center justify-between gap-2 overflow-hidden">
                  <div className="flex-1 min-w-[140px]">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="w-full p-2 rounded-xl bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-100 font-black text-slate-700 outline-none text-center transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] border border-slate-200/60 custom-date-input"
                    />
                  </div>
                  <span className="text-[11px] md:text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl shrink-0 whitespace-nowrap tabular-nums shadow-sm">
                    {Object.values(meals[selectedDate] || {}).reduce((a, b) => a + safeNum(b), 0)} মিল
                  </span>
                  {isManager && (
                    <div className="flex items-center w-full sm:w-auto bg-slate-100 p-1 rounded-2xl border border-slate-200/70 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] md:overflow-visible overflow-x-auto custom-scrollbar">
                      {[0.5, 1, 1.5, 2].map(step => (
                        <button
                          key={step}
                          title={`প্রতি ক্লিকে ${step} মিল বাড়বে`}
                          onClick={() => setMealStep(step)}
                          className={`flex-1 sm:flex-none min-w-[2.5rem] px-3 py-1.5 rounded-[10px] text-[11px] font-black transition-all duration-300 transform-gpu ${mealStep === step ? 'bg-white text-indigo-600 shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                        >
                          {step}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid gap-3">
                  {members.length === 0 ? (
                    <EmptyState
                      icon={Utensils}
                      title="কোনো মেম্বার নেই"
                      subtitle="মেম্বার ছাড়া মিল এন্ট্রি করা যাবে না। নিচে ক্লিক করে মেম্বার যোগ করুন।"
                      color="indigo"
                      action={
                        isManager && (
                          <button onClick={() => setShowAddMemberModal(true)} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200">
                            <Plus size={16} /> নতুন মেম্বার যোগ করুন
                          </button>
                        )
                      }
                    />
                  ) : membersSortedForSelectedDate.map(m => {
                    const mMeals = meals[selectedDate]?.[m.id] || 0;
                    const hasMeals = mMeals > 0;
                    const dailyCost = (mMeals * mealRateValue).toFixed(2);
                    return (
                      <div key={m.id} className={`relative p-4 rounded-2xl shadow-sm flex justify-between items-center transition-all duration-300 ease-out border-2 ${recentlySavedMeals[m.id] ? 'border-emerald-400 bg-emerald-50/80 scale-[1.01] z-10 shadow-[0_4px_16px_rgba(16,185,129,0.15)]' : hasMeals ? 'border-indigo-100 bg-white shadow-[0_4px_16px_rgba(99,102,241,0.06)]' : 'border-slate-100 bg-slate-50/60 opacity-85 hover:opacity-100 shadow-none'}`}>
                        {recentlySavedMeals[m.id] && (
                          <span className="absolute -top-2 right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm z-20">
                            <CheckCircle size={8} /> সেভ!
                          </span>
                        )}
                        <div onClick={() => setSelectedMemberDetail(m)} className="flex flex-col cursor-pointer truncate pr-2 group">
                          <span className={`font-bold text-sm transition-colors truncate ${hasMeals ? 'text-indigo-900' : 'text-slate-600 group-hover:text-indigo-600'}`}>{safeStr(m.name)}</span>
                          {hasMeals && <span className="text-[10px] font-bold text-slate-400 mt-0.5">খরচ: ৳{dailyCost}</span>}
                        </div>
                        <div className={`flex items-center p-1 rounded-full border shadow-[0_2px_12px_rgba(0,0,0,0.04)] group hover:shadow-[0_4px_20px_rgba(99,102,241,0.12)] hover:border-indigo-100 transition-all duration-300 ${hasMeals ? 'bg-white border-slate-100' : 'bg-slate-50/50 border-slate-200/50 grayscale-[20%]'}`}>
                          <button onClick={() => updateMeal(m.id, Math.max(0, (mMeals) - mealStep))} disabled={!isManager} className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-slate-400 bg-slate-100/50 hover:bg-rose-50 hover:text-rose-500 active:scale-90 transition-all duration-200 disabled:opacity-50"><Minus size={16} strokeWidth={4} className="shrink-0" /></button>
                          <div className="w-10 min-[400px]:w-11 md:w-12 text-center flex items-center justify-center">
                            <span className={`font-black text-lg tabular-nums tracking-tighter truncate leading-none ${hasMeals ? 'text-indigo-600' : 'text-slate-400'}`}>{mMeals}</span>
                          </div>
                          <button onClick={() => updateMeal(m.id, (mMeals) + mealStep)} disabled={!isManager} className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white active:scale-90 shadow-[0_0_0_transparent] hover:shadow-[0_4px_12px_rgba(79,70,229,0.3)] transition-all duration-200 disabled:opacity-50"><Plus size={16} strokeWidth={4} className="shrink-0" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Bazar Tab */}
            {activeTab === 'bazar' && (
              <motion.div key="bazar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-6 transform-gpu">
                {isManager && (
                  <div className="space-y-4">
                    {bazarRequests.length > 0 && (
                      <div className="bg-amber-50 p-6 rounded-[2rem] shadow-sm border border-amber-200">
                        <h3 className="font-black text-amber-900 mb-4 flex items-center gap-2">
                          <Clock size={18} className="text-amber-500" /> বাজার রিকোয়েস্ট ({bazarRequests.length})
                        </h3>
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                          {bazarRequests
                            .slice()
                            .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
                            .map((req) => (
                              <div key={req.id} className="bg-white p-4 rounded-xl border border-amber-100 flex flex-col gap-3 shadow-sm content-visibility-auto">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-800 text-sm">{req.memberName || getMemberName(req.memberId)}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">{formatDate(req.date)} • ৳{safeNum(req.amount)}</p>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <button onClick={() => setSelectedBazarDetail(req)} className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-100"><FileText size={14} /></button>
                                    <button onClick={() => handleApproveBazarRequest(req)} className="bg-emerald-500 text-white p-1.5 rounded-lg shadow-sm hover:bg-emerald-600"><CheckCircle size={14} /></button>
                                    <button onClick={() => handleRejectBazarRequest(req.id)} className="bg-rose-100 text-rose-500 p-1.5 rounded-lg hover:bg-rose-200"><XCircle size={14} /></button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs text-slate-600 font-semibold truncate">{req.items && req.items.length > 0 ? `${req.items.length}টি আইটেম জমা দিয়েছে` : safeStr(req.item)}</p>
                                  <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-1 rounded-full ${req.type === 'credit' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {req.type === 'credit' ? 'বাকি' : 'নগদ'}
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition transition-all transform-gpu duration-300 space-y-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><ShoppingCart size={18} className="text-indigo-600" /> বাজার খরচ</h3>
                        <form onSubmit={addBazar} className="space-y-4">
                          <div className="space-y-3">
                            {bazarRows.map((row, index) => (
                              <div key={row.id} className="flex flex-col gap-2 bg-white/80 p-3 rounded-xl border border-indigo-100 shadow-sm relative pt-4 mt-2">
                                <h4 className="text-[10px] font-black text-indigo-400 absolute -top-2 left-3 bg-white px-2 py-0.5 rounded border border-indigo-50">আইটেম {index + 1}</h4>
                                <div className="flex flex-col md:flex-row gap-2 mt-1">
                                  <div className="flex-1">
                                    <input value={row.item} onChange={e => { const newRows = [...bazarRows]; newRows[index].item = e.target.value; setBazarRows(newRows); }} placeholder="কী কিনেছেন?" className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm font-bold outline-none" required />
                                  </div>
                                  <div className="flex gap-2">
                                    <div className="w-1/2 md:w-auto">
                                      <input value={row.qty} onChange={e => { const newRows = [...bazarRows]; newRows[index].qty = e.target.value; setBazarRows(newRows); }} placeholder="পরিমাণ" className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm font-bold outline-none" required />
                                    </div>
                                    <div className="w-1/2 md:w-auto">
                                      <input value={row.amount} type="text" inputMode="numeric" onChange={e => { const newRows = [...bazarRows]; newRows[index].amount = e.target.value; setBazarRows(newRows); }} placeholder="দাম" className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm font-black text-indigo-700 outline-none" required />
                                    </div>
                                  </div>
                                </div>
                                {bazarRows.length > 1 && (
                                  <button type="button" onClick={() => setBazarRows(bazarRows.filter((_, i) => i !== index))} className="absolute -top-2 -right-2 p-1.5 text-rose-500 bg-white border border-rose-200 rounded-lg shadow-sm"><X size={14} /></button>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-col sm:flex-row justify-between shrink-0 items-center gap-2">
                            <button type="button" onClick={() => setBazarRows([...bazarRows, { id: Date.now(), item: '', amount: '', qty: '' }])} className="w-full sm:w-auto text-xs font-bold text-indigo-600 bg-indigo-50 border border-dashed border-indigo-200 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100"><Plus size={16} /> আইটেম যোগ করুন</button>
                            <div className="w-full sm:w-auto bg-green-50 border border-green-200 px-4 py-2 rounded-xl flex items-center justify-between sm:justify-start gap-4">
                              <span className="text-xs font-bold text-green-700">মোট খরচ:</span>
                              <span className="text-lg font-black text-green-700">৳{bazarRows.reduce((a, b) => a + Number(b.amount || 0), 0)}</span>
                            </div>
                          </div>

                          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Users size={18} className="text-indigo-500 shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-slate-700">কে বাজার করেছে?</p>
                                <p className="text-[9px] text-slate-400 font-medium">নিজে বা অন্যের নাম দিন</p>
                              </div>
                            </div>
                            <button type="button" onClick={() => setShowBazarMemberModal(true)} className={`px-3 py-2 rounded-lg border font-bold text-[11px] flex items-center gap-1.5 shrink-0 ${selectedBazarMembers.length > 0 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200'}`}>
                              <UserPlus size={14} />
                              {selectedBazarMembers.length > 0 ? `${selectedBazarMembers.length} জন সিলেক্টেড` : 'সিলেক্ট করুন'}
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block">তারিখ</label>
                              <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-xs font-bold outline-none" required />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block">মেমো (অপশনাল)</label>
                              <div className="bg-white border border-slate-200 p-1.5 rounded-xl flex items-center gap-2 relative overflow-hidden cursor-pointer h-[38px]">
                                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 w-full h-full opacity-0" />
                                <div className={`w-6 h-6 rounded shrink-0 flex items-center justify-center ${bazarPhotoBase64 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                  {bazarPhotoBase64 ? <CheckCircle size={14} /> : <FileText size={14} />}
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 truncate mr-1">{bazarPhotoBase64 ? 'ছবি আছে' : 'ছবি দিন'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer [&:has(input:checked)]:border-emerald-500 [&:has(input:checked)]:bg-emerald-50 text-emerald-600">
                              <input type="radio" name="type" value="cash" defaultChecked className="w-4 h-4 accent-emerald-500 shrink-0 ml-1" />
                              <span className="font-bold text-slate-700 text-[11px]"><Wallet size={12} className="inline mr-1 text-emerald-500" /> নগদ</span>
                            </label>
                            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer [&:has(input:checked)]:border-rose-500 [&:has(input:checked)]:bg-rose-50 text-rose-500">
                              <input type="radio" name="type" value="credit" className="w-4 h-4 accent-rose-500 shrink-0 ml-1" />
                              <span className="font-bold text-slate-700 text-[11px]"><CreditCard size={12} className="inline mr-1 text-rose-500" /> বাকি</span>
                            </label>
                          </div>

                          <button disabled={isBazarSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold text-sm shadow-md active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2">
                            {isBazarSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'বাজার সেভ করুন'}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
                {!isManager && loggedInMember && (
                  <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><ShoppingCart size={18} className="text-indigo-600" /> বাজার রিকোয়েস্ট পাঠান</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1">আপনি বাজার করলে এখান থেকে জমা দিন। ম্যানেজার approve করলে সেটা মূল বাজার তালিকায় যোগ হবে।</p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-100">approve লাগবে</span>
                    </div>
                    <form onSubmit={submitBazarRequest} className="space-y-4">
                      <div className="space-y-3">
                        {bazarRows.map((row, index) => (
                          <div key={row.id} className="flex flex-col gap-2 bg-white/80 p-3 rounded-xl border border-indigo-100 shadow-sm relative pt-4 mt-2">
                            <h4 className="text-[10px] font-black text-indigo-400 absolute -top-2 left-3 bg-white px-2 py-0.5 rounded border border-indigo-50">আইটেম {index + 1}</h4>
                            <div className="flex flex-col md:flex-row gap-2 mt-1">
                              <div className="flex-1">
                                <input value={row.item} onChange={e => { const newRows = [...bazarRows]; newRows[index].item = e.target.value; setBazarRows(newRows); }} placeholder="কী কিনেছেন?" className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm font-bold outline-none" required />
                              </div>
                              <div className="flex gap-2">
                                <div className="w-1/2 md:w-auto">
                                  <input value={row.qty} onChange={e => { const newRows = [...bazarRows]; newRows[index].qty = e.target.value; setBazarRows(newRows); }} placeholder="পরিমাণ" className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm font-bold outline-none" required />
                                </div>
                                <div className="w-1/2 md:w-auto">
                                  <input value={row.amount} type="text" inputMode="numeric" onChange={e => { const newRows = [...bazarRows]; newRows[index].amount = e.target.value; setBazarRows(newRows); }} placeholder="দাম" className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm font-black text-indigo-700 outline-none" required />
                                </div>
                              </div>
                            </div>
                            {bazarRows.length > 1 && (
                              <button type="button" onClick={() => setBazarRows(bazarRows.filter((_, i) => i !== index))} className="absolute -top-2 -right-2 p-1.5 text-rose-500 bg-white border border-rose-200 rounded-lg shadow-sm"><X size={14} /></button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between shrink-0 items-center gap-2">
                        <button type="button" onClick={() => setBazarRows([...bazarRows, { id: Date.now(), item: '', amount: '', qty: '' }])} className="w-full sm:w-auto text-xs font-bold text-indigo-600 bg-indigo-50 border border-dashed border-indigo-200 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100"><Plus size={16} /> আইটেম যোগ করুন</button>
                        <div className="w-full sm:w-auto bg-green-50 border border-green-200 px-4 py-2 rounded-xl flex items-center justify-between sm:justify-start gap-4">
                          <span className="text-xs font-bold text-green-700">মোট খরচ:</span>
                          <span className="text-lg font-black text-green-700">৳{bazarRows.reduce((a, b) => a + safeNum(b.amount), 0)}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-black">
                            {safeStr(loggedInMember.name).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{safeStr(loggedInMember.name)}</p>
                            <p className="text-[9px] font-bold text-indigo-500">আপনার নামে জমা হবে</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block">তারিখ</label>
                          <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-xs font-bold outline-none" required />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block">মেমো (অপশনাল)</label>
                          <div className="bg-white border border-slate-200 p-1.5 rounded-xl flex items-center gap-2 relative overflow-hidden cursor-pointer h-[38px]">
                            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 w-full h-full opacity-0" />
                            <div className={`w-6 h-6 rounded shrink-0 flex items-center justify-center ${bazarPhotoBase64 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                              {bazarPhotoBase64 ? <CheckCircle size={14} /> : <FileText size={14} />}
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 truncate mr-1">{bazarPhotoBase64 ? 'ছবি আছে' : 'ছবি দিন'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer [&:has(input:checked)]:border-emerald-500 [&:has(input:checked)]:bg-emerald-50 text-emerald-600">
                          <input type="radio" name="type" value="cash" defaultChecked className="w-4 h-4 accent-emerald-500 shrink-0 ml-1" />
                          <span className="font-bold text-slate-700 text-[11px]"><Wallet size={12} className="inline mr-1 text-emerald-500" /> নগদ</span>
                        </label>
                        <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer [&:has(input:checked)]:border-rose-500 [&:has(input:checked)]:bg-rose-50 text-rose-500">
                          <input type="radio" name="type" value="credit" className="w-4 h-4 accent-rose-500 shrink-0 ml-1" />
                          <span className="font-bold text-slate-700 text-[11px]"><CreditCard size={12} className="inline mr-1 text-rose-500" /> বাকি</span>
                        </label>
                      </div>

                      <button disabled={isBazarReqSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold text-sm shadow-md active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2">
                        {isBazarReqSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'রিকোয়েস্ট পাঠান'}
                      </button>
                    </form>
                  </div>
                )}
                {/* Bazar Summary Cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 sm:p-6 rounded-[2rem] shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] border border-emerald-400 flex flex-col justify-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-xl -mr-8 -mt-8"></div>
                    <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-100 mb-1 relative z-10">মোট নগদ বাজার</p>
                    <h3 className="text-2xl sm:text-3xl font-black relative z-10">৳{bazarList.filter(b => b.type !== 'credit').reduce((s, i) => s + safeNum(i.amount), 0)}</h3>
                  </div>
                  <div className="bg-gradient-to-br from-rose-500 to-red-600 p-5 sm:p-6 rounded-[2rem] shadow-[0_10px_20px_-10px_rgba(244,63,94,0.5)] border border-rose-400 flex flex-col justify-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-xl -mr-8 -mt-8"></div>
                    <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-rose-100 mb-1 relative z-10">মোট বাকি বাজার</p>
                    <h3 className="text-2xl sm:text-3xl font-black relative z-10">৳{bazarList.filter(b => b.type === 'credit').reduce((s, i) => s + safeNum(i.amount), 0)}</h3>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 overflow-hidden flex flex-col">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col gap-4">
                    <div className="flex bg-white/80 p-1 rounded-2xl shadow-sm border border-slate-200 mx-auto w-full max-w-md relative">
                      <button onClick={() => setBazarFilter('all')} className={`flex-1 py-3 rounded-[14px] text-[11px] font-black uppercase transition-all duration-300 ${bazarFilter === 'all' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>সব বাজার</button>
                      <button onClick={() => setBazarFilter('cash')} className={`flex-1 py-3 rounded-[14px] text-[11px] font-black uppercase transition-all duration-300 ${bazarFilter === 'cash' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>নগদ বাজার</button>
                      <button onClick={() => setBazarFilter('credit')} className={`flex-1 py-3 rounded-[14px] text-[11px] font-black uppercase transition-all duration-300 ${bazarFilter === 'credit' ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>বাকি বাজার</button>
                    </div>

                    <div className="flex gap-2 w-full">
                      <select value={bazarSearchMember} onChange={e => setBazarSearchMember(e.target.value)} className="p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 outline-none flex-1 shadow-inner bg-white">
                        <option value="">সব মেম্বার</option>
                        {members.map(m => <option key={m.id} value={m.id}>{safeStr(m.name)}</option>)}
                      </select>
                      <input type="date" value={bazarSearchDate} onChange={e => setBazarSearchDate(e.target.value)} className="p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 outline-none flex-1 shadow-inner bg-white" />
                      {(bazarSearchMember || bazarSearchDate || bazarFilter !== 'all') && (
                        <button onClick={() => { setBazarSearchMember(''); setBazarSearchDate(''); setBazarFilter('all'); }} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition shadow-sm"><X size={16} /></button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-[500px] overflow-y-auto w-full">
                    {(() => {
                      const filteredBazars = bazarList.slice()
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .filter(b => {
                          const matchDate = bazarSearchDate ? b.date === bazarSearchDate : true;
                          const matchMember = bazarSearchMember ? b.memberId === bazarSearchMember : true;
                          return matchDate && matchMember;
                        });

                      const renderBazarItem = (i) => (
                        <div key={i.id} onClick={(e) => {
                          if (e.target.closest('button')) return;
                          setSelectedBazarDetail(i);
                        }} className="p-4 flex justify-between items-center hover:bg-slate-50 relative cursor-pointer group transition-colors border-b border-slate-100 last:border-0 w-full bg-white animate-in fade-in">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700 text-sm group-hover:text-indigo-600 transition-colors">{i.items && i.items.length > 0 ? `${i.items.length}টি আইটেম` : safeStr(i.item)}</span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {getMemberName(i.memberId)} • {formatDate(i.date)}
                            </span>
                            {safeNum(i.sharedCount) > 1 && (
                              <span className="mt-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full w-max">
                                {safeNum(i.sharedCount)} জনে ভাগ করা বাজার
                              </span>
                            )}
                            {i.photo && (
                              <button onClick={(e) => { e.stopPropagation(); setSelectedReceipt(i.photo); }} className="mt-1 text-[10px] text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded flex items-center gap-1 w-max active:scale-95 transition"><FileText size={10} /> রসিদ দেখুন</button>
                            )}
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <span className="font-black text-slate-800 text-sm bg-slate-100 px-2 py-1 rounded-lg block w-max">৳{safeNum(i.amount)}</span>
                            <span className={`text-[9px] uppercase font-black tracking-wider mt-1 block ${i.type === 'credit' ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {i.type === 'credit' ? 'বাকি' : 'নগদ'}
                            </span>
                            {isManager && (
                              <button onClick={(e) => { e.stopPropagation(); removeBazar(i.id); }} className="text-[10px] font-black text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-2 py-1 rounded-lg transition">
                                ডিলিট
                              </button>
                            )}
                          </div>
                        </div>
                      );

                      if (bazarFilter === 'all') {
                        const cashBazars = filteredBazars.filter(b => b.type !== 'credit');
                        const creditBazars = filteredBazars.filter(b => b.type === 'credit');
                        return (
                          <div className="flex flex-col w-full animate-in fade-in">
                            <div className="bg-emerald-50 text-emerald-700 p-2 px-4 font-black text-xs uppercase tracking-widest border-y border-emerald-100 w-full sticky top-0 z-10 backdrop-blur-md bg-emerald-50/90">নগদ বাজার শাখা</div>
                            {cashBazars.length > 0 ? cashBazars.map(renderBazarItem) : <p className="text-center text-slate-400 text-xs italic py-6 bg-white w-full">কোনো নগদ বাজার নেই</p>}

                            <div className="bg-rose-50 text-rose-700 p-2 px-4 font-black text-xs uppercase tracking-widest border-y border-rose-100 w-full sticky top-0 z-10 backdrop-blur-md bg-rose-50/90">বাকি বাজার শাখা</div>
                            {creditBazars.length > 0 ? creditBazars.map(renderBazarItem) : <p className="text-center text-slate-400 text-xs italic py-6 bg-white w-full">কোনো বাকি বাজার নেই</p>}
                          </div>
                        );
                      } else {
                        const items = filteredBazars.filter(b => bazarFilter === 'cash' ? b.type !== 'credit' : b.type === 'credit');
                        return items.length > 0 ? items.map(renderBazarItem) : <p className="text-center text-slate-400 text-xs italic py-8 bg-white w-full">কোনো বাজার নেই</p>;
                      }
                    })()}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'fine' && (
              <motion.div key="fine" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-6">
                <div className="bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50">
                  <h3 className="font-black text-slate-800 flex items-center gap-2"><AlertTriangle size={20} className="text-rose-500" /> দণ্ড ব্যবস্থাপনা</h3>
                </div>

                {isManager && (
                  <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition space-y-4">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><AlertTriangle size={18} className="text-red-500" /> নতুন দণ্ড দিন</h3>
                    <form onSubmit={addFine} className="space-y-3">
                      <select name="memberId" className="w-full p-3 bg-white/50 backdrop-blur-sm border border-white/40 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl text-base md:text-sm font-bold outline-none transition shadow-inner" required>
                        <option value="">কাকে দণ্ড দিবেন?</option>
                        {members.map(m => <option key={m.id} value={m.id}>{safeStr(m.name)}</option>)}
                      </select>
                      <input name="reason" placeholder="কেন দণ্ড দিচ্ছেন?" className="w-full p-3 bg-white/50 backdrop-blur-sm border border-white/40 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl text-base md:text-sm font-bold outline-none transition shadow-inner" required />
                      <div className="grid grid-cols-2 gap-3">
                        <input name="mealCount" type="number" min="1" step="0.5" defaultValue="2" placeholder="কয় মিল" className="w-full p-3 bg-white/50 backdrop-blur-sm border border-white/40 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl text-base md:text-sm font-bold outline-none transition shadow-inner" required />
                        <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-3 bg-white/50 backdrop-blur-sm border border-white/40 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl text-base md:text-sm font-bold outline-none transition shadow-inner" required />
                      </div>
                      <button disabled={isFineSubmitting} className="w-full bg-gradient-to-r from-rose-500 to-red-600 text-white hover:shadow-lg hover:shadow-red-300 p-3 rounded-xl font-bold text-sm shadow-lg shadow-red-200 active:scale-95 transition-transform disabled:opacity-70 flex items-center justify-center gap-2">
                        {isFineSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'দণ্ড দিন'}
                      </button>
                    </form>
                  </div>
                )}

                <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-2">
                    <select value={bazarSearchMember} onChange={e => setBazarSearchMember(e.target.value)} className="p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 outline-none flex-1 shadow-inner bg-white">
                      <option value="">সব মেম্বার</option>
                      {members.map(m => <option key={m.id} value={m.id}>{safeStr(m.name)}</option>)}
                    </select>
                    <input type="date" value={bazarSearchDate} onChange={e => setBazarSearchDate(e.target.value)} className="p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 outline-none flex-1 shadow-inner bg-white" />
                    {(bazarSearchMember || bazarSearchDate) && (
                      <button onClick={() => { setBazarSearchMember(''); setBazarSearchDate(''); }} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition shadow-sm"><X size={16} /></button>
                    )}
                  </div>
                  <div className="max-h-[520px] overflow-y-auto w-full">
                    {fines
                      .filter(f => (!bazarSearchMember || f.memberId === bazarSearchMember) && (!bazarSearchDate || f.date === bazarSearchDate))
                      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
                      .map(f => (
                        <div key={f.id} className="p-4 flex justify-between items-center bg-white border-b border-slate-100 w-full animate-in fade-in">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">কারণ</span>
                            <span className="text-sm font-bold text-rose-700">{safeStr(f.reason)}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{getMemberName(f.memberId)} • {formatDate(f.date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-rose-600 text-xs bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">+{safeNum(f.mealCount || 2)} মিল</span>
                            {isManager && (
                              <button onClick={() => removeFine(f.id)} className="p-2 bg-white text-rose-500 hover:bg-rose-50 rounded-lg border border-rose-100 transition" title="দণ্ড মাফ করুন">
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    {fines.filter(f => (!bazarSearchMember || f.memberId === bazarSearchMember) && (!bazarSearchDate || f.date === bazarSearchDate)).length === 0 && (
                      <EmptyState icon={AlertTriangle} title="কোনো দণ্ড নেই" subtitle="এই মাসে কোনো মেম্বারকে দণ্ড দেওয়া হয়নি" color="rose" />
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {selectedMemberDetail && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedMemberDetail(null)}>
                <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white relative shrink-0">
                    <button onClick={() => setSelectedMemberDetail(null)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition"><X size={16} /></button>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white text-slate-800 flex items-center justify-center font-black text-xl shadow-inner">
                        {safeStr(selectedMemberDetail.name).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-xl mb-0.5">{clampMemberName(safeStr(selectedMemberDetail.name))}</h3>
                        <span className="text-[10px] uppercase tracking-widest text-slate-300 font-bold bg-white/10 px-2 py-0.5 rounded block w-max">{selectedMemberDetail.isManagerTag ? 'ম্যানেজার' : 'মেম্বার'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-y-auto p-6 space-y-6">
                    {/* Contact Info */}
                    <div className="grid gap-2 relative">
                      {isManager && (
                        <button
                          onClick={() => {
                            if (editingMemberContact) {
                              updateMemberContactDetails();
                            } else {
                              setEditContactData({
                                name: safeStr(selectedMemberDetail.name),
                                phone: selectedMemberDetail.phone || '',
                                whatsapp: selectedMemberDetail.whatsapp || '',
                                email: selectedMemberDetail.email || ''
                              });
                              setEditingMemberContact(true);
                            }
                          }}
                          className="absolute -top-3 right-0 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition"
                        >
                          {editingMemberContact ? <><Save size={12} /> সেভ করুন</> : <><Edit size={12} /> এডিট</>}
                        </button>
                      )}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-violet-100 text-violet-600 rounded-lg"><User size={14} /></div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">নাম <span className="font-semibold normal-case">(সর্বোচ্চ {MEMBER_NAME_MAX_LENGTH})</span></p>
                          {editingMemberContact ? (
                            <input
                              value={editContactData.name}
                              maxLength={MEMBER_NAME_MAX_LENGTH}
                              onChange={e => setEditContactData({ ...editContactData, name: e.target.value.slice(0, MEMBER_NAME_MAX_LENGTH) })}
                              className="w-full text-sm font-bold text-slate-700 bg-white border border-slate-200 outline-none p-1 rounded"
                              placeholder={'\u09AE\u09C7\u09AE\u09CD\u09AC\u09BE\u09B0\u09C7\u09B0 \u09A8\u09BE\u09AE'}
                            />
                          ) : (
                            <p className="text-sm font-bold text-slate-700 truncate">{clampMemberName(safeStr(selectedMemberDetail.name))}</p>
                          )}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Phone size={14} /></div>
                        <div className="flex-1 text-left">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">ফোন নাম্বার</p>
                          {editingMemberContact ? (
                            <input value={editContactData.phone} onChange={e => setEditContactData({ ...editContactData, phone: e.target.value })} className="w-full text-sm font-bold text-slate-700 bg-white border border-slate-200 outline-none p-1 rounded" placeholder="01XXX" />
                          ) : (
                            <p className="text-sm font-bold text-slate-700">{selectedMemberDetail.phone || 'দেওয়া নেই'}</p>
                          )}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><MessageSquare size={14} /></div>
                        <div className="flex-1 text-left">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">হোয়াটসঅ্যাপ নাম্বার</p>
                          {editingMemberContact ? (
                            <input value={editContactData.whatsapp} onChange={e => setEditContactData({ ...editContactData, whatsapp: e.target.value })} className="w-full text-sm font-bold text-slate-700 bg-white border border-slate-200 outline-none p-1 rounded" placeholder="01XXX" />
                          ) : (
                            <p className="text-sm font-bold text-slate-700">{selectedMemberDetail.whatsapp || selectedMemberDetail.phone || 'দেওয়া নেই'}</p>
                          )}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-rose-100 text-rose-600 rounded-lg"><FileText size={14} /></div>
                        <div className="flex-1 text-left">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">ইমেইল</p>
                          {editingMemberContact ? (
                            <input value={editContactData.email} onChange={e => setEditContactData({ ...editContactData, email: e.target.value })} className="w-full text-sm font-bold text-slate-700 bg-white border border-slate-200 outline-none p-1 rounded" placeholder="example@email.com" />
                          ) : (
                            <p className="text-sm font-bold text-slate-700">{selectedMemberDetail.email || 'দেওয়া নেই'}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bill Status */}
                    {(() => {
                      const st = getMemberStats(selectedMemberDetail.id);
                      return (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                          <h4 className="font-black text-indigo-900 mb-3 flex items-center gap-2"><CreditCard size={16} /> ফিক্সড বিল ও ব্যালেন্স</h4>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="bg-white p-3 rounded-xl text-center shadow-sm">
                              <span className="block text-[10px] text-slate-400 font-bold mb-1">স্থায়ী বিল (বাকি)</span>
                              <span className={`text-sm font-black ${st.billDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{st.billDue > 0 ? `৳${st.billDue}` : 'পরিশোধিত'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl text-center shadow-sm">
                              <span className="block text-[10px] text-slate-400 font-bold mb-1">মিল ব্যালেন্স</span>
                              <span className={`text-sm font-black ${Number(st.balance) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{Number(st.balance) < 0 ? `বাকি ৳${Math.abs(st.balance)}` : `পাবে ৳${st.balance}`}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Bazar History */}
                    <div>
                      <h4 className="font-black text-slate-700 mb-1 flex items-center gap-2"><ShoppingCart size={16} /> এই মাসের বাজার সমূহ</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mb-2">{MEMBER_DETAIL_SCROLL_HINT}</p>
                      <div className={MEMBER_DETAIL_LIST_SCROLL}>
                        {(() => {
                          const memberBazars = bazarList
                            .filter(b => b.memberId === selectedMemberDetail.id && b.date && typeof b.date === 'string' && b.date.startsWith(selectedMonth))
                            .slice()
                            .sort((a, b) => new Date(b.date) - new Date(a.date));
                          if (memberBazars.length === 0) return <p className="text-center text-slate-400 text-xs italic py-4">এই মাসে কোনো বাজার করেনি।</p>;
                          return memberBazars.map(b => (
                            <div key={b.id} className="bg-white border border-slate-200 p-3 rounded-xl flex justify-between items-center shadow-sm">
                              <div>
                                <p className="font-bold text-sm text-slate-700">{b.items && b.items.length > 0 ? `${b.items.length}টি আইটেম` : safeStr(b.item)}</p>
                                <p className="text-[10px] text-slate-400 font-semibold">{formatDate(b.date)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="bg-slate-100 text-slate-800 font-black text-xs px-2 py-1 rounded border border-slate-200">৳{b.amount}</span>
                                {isManager && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm('এই বাজার রেকর্ডটি মুছে ফেলতে চান?')) {
                                        deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bazar', b.id));
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                                    title="বাজার মুছুন"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Deposit History */}
                    <div className="pt-2">
                      <h4 className="font-black text-slate-700 mb-1 flex items-center gap-2"><Wallet size={16} /> এই মাসের জমা সমূহ</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mb-2">{MEMBER_DETAIL_SCROLL_HINT}</p>
                      <div className={MEMBER_DETAIL_LIST_SCROLL}>
                        {(() => {
                          const memberDeposits = monthlyDeposits
                            .filter(d => d.memberId === selectedMemberDetail.id)
                            .slice()
                            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
                          if (memberDeposits.length === 0) return <p className="text-center text-slate-400 text-xs italic py-4">এই মাসে কোনো জমা পাওয়া যায়নি।</p>;
                          return memberDeposits.map(d => (
                            <div key={d.id} className="bg-white border border-slate-200 p-3 rounded-xl flex justify-between items-center shadow-sm">
                              <div>
                                <p className="font-bold text-[11px] text-slate-500">{formatDate(d.date)} {d.note && `• ${d.note}`}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="bg-emerald-50 text-emerald-700 font-black text-xs px-2 py-1 rounded border border-emerald-100">৳{d.amount}</span>
                                {isManager && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm('এই জমার রেকর্ডটি মুছে ফেলতে চান?')) {
                                        deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'deposits', d.id));
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                                    title="জমা মুছুন"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Meal list: inner scroll when many days; whole modal also scrolls */}
                    <div className="pt-2">
                      <h4 className="font-black text-slate-700 mb-1 flex items-center gap-2"><Utensils size={16} /> এই মাসের মিল সমূহ</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mb-2">{MEMBER_DETAIL_SCROLL_HINT}</p>
                      <div className={MEMBER_DETAIL_LIST_SCROLL}>
                        {(() => {
                          const memberMealsList = Object.entries(meals)
                            .filter(([date, mData]) => typeof date === 'string' && date.startsWith(selectedMonth) && mData && typeof mData === 'object' && mData[selectedMemberDetail.id] > 0)
                            .map(([date, mData]) => ({ date, count: mData[selectedMemberDetail.id] }))
                            .sort((a, b) => new Date(b.date) - new Date(a.date));

                          if (memberMealsList.length === 0) return <p className="text-center text-slate-400 text-xs italic py-4">এই মাসে কোনো মিল খায়নি।</p>;

                          return memberMealsList.map((mItem, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 p-3 rounded-xl flex justify-between items-center shadow-sm">
                              <div>
                                <p className="font-bold text-[11px] text-slate-500">{formatDate(mItem.date)}</p>
                              </div>
                              <span className="bg-indigo-50 text-indigo-700 font-black text-xs px-2 py-1 rounded border border-indigo-100">{mItem.count} মিল</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                    {false && (
                      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-[2rem] shadow-[0_20px_40px_-20px_rgba(15,23,42,0.55)] border border-indigo-500/10 space-y-5 overflow-hidden relative">
                        <div className="absolute -top-16 -right-12 w-40 h-40 rounded-full bg-indigo-400/15 blur-3xl"></div>
                        <div className="absolute -bottom-16 -left-10 w-36 h-36 rounded-full bg-cyan-300/10 blur-3xl"></div>
                        <div className="relative z-10 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-indigo-200/80 mb-2">বাজার ওভারভিউ</p>
                            <h3 className="text-3xl font-black leading-tight">৳{selectedDateBazarTotal}</h3>
                            <p className="text-xs text-slate-300 font-medium mt-1">{formatDate(selectedDate) || selectedDate} তারিখের মোট বাজার</p>
                          </div>
                          <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-right shrink-0">
                            <p className="text-lg font-black text-white">à§³{totalBazarAmount}</p>
                          </div>
                        </div>
                        <div className="relative z-10 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-emerald-400/10 border border-emerald-300/15 px-4 py-3">
                            <p className="text-[10px] uppercase font-black tracking-widest text-emerald-200/80">à¦¨à¦—à¦¦</p>
                            <p className="text-xl font-black mt-1">à§³{cashBazar}</p>
                          </div>
                          <div className="rounded-2xl bg-rose-400/10 border border-rose-300/15 px-4 py-3">
                            <p className="text-[10px] uppercase font-black tracking-widest text-rose-200/80">à¦¬à¦¾à¦•à¦¿</p>
                            <p className="text-xl font-black mt-1">à§³{creditBazarTotal}</p>
                          </div>
                          <div className="rounded-2xl bg-amber-400/10 border border-amber-300/15 px-4 py-3">
                            <p className="text-[10px] uppercase font-black tracking-widest text-amber-100/80">à¦ªà§‡à¦¨à§à¦¡à¦¿à¦‚ à¦°à¦¿à¦•à§‹à§Ÿà§‡à¦¸à§à¦Ÿ</p>
                            <p className="text-xl font-black mt-1">{bazarRequests.length} à¦Ÿà¦¿</p>
                            <p className="text-[11px] text-amber-100/70 font-semibold mt-1">à§³{pendingBazarAmount}</p>
                          </div>
                          <div className="rounded-2xl bg-sky-400/10 border border-sky-300/15 px-4 py-3">
                            <p className="text-[10px] uppercase font-black tracking-widest text-sky-100/80">à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¿à¦¤ à¦®à§‡à¦®à§à¦¬à¦¾à¦°</p>
                            <p className="text-xl font-black mt-1">{selectedBazarMemberDetails.length} à¦œà¦¨</p>
                            <p className="text-[11px] text-sky-100/70 font-semibold mt-1">{bazarRows.length} à¦Ÿà¦¿ à¦†à¦‡à¦Ÿà§‡à¦® à¦²à¦¾à¦‡à¦¨</p>
                          </div>
                        </div>
                        <div className="relative z-10 rounded-[1.5rem] bg-white/8 border border-white/10 p-4 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="font-black text-sm flex items-center gap-2"><Users size={16} className="text-indigo-200" /> à¦¯à¦¾à¦° à¦¨à¦¾à¦®à§‡ à¦¬à¦¾à¦œà¦¾à¦° à¦¯à¦¾à¦¬à§‡</h4>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">{selectedBazarMemberDetails.length} à¦œà¦¨</span>
                          </div>
                          {selectedBazarMemberDetails.length === 0 ? (
                            <p className="text-sm text-slate-300/80 leading-relaxed">à¦¬à¦¾à¦®à¦ªà¦¾à¦¶à§‡ à¦¥à§‡à¦•à§‡ à¦®à§‡à¦®à§à¦¬à¦¾à¦° select à¦•à¦°à¦²à§‡ à¦à¦–à¦¾à¦¨à§‡ à¦¤à¦¾à¦¦à§‡à¦° à¦¨à¦¾à¦® à¦¦à§‡à¦–à¦¾à¦¬à§‡à¥¤</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {selectedBazarMemberDetails.map((member) => (
                                <span key={member.id} className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-sm font-bold text-white/95">
                                  {safeStr(member.name)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="relative z-10 rounded-[1.5rem] bg-white/8 border border-white/10 p-4 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="font-black text-sm flex items-center gap-2"><CalendarIcon size={16} className="text-cyan-200" /> à¦¸à¦¾à¦®à§à¦ªà§à¦°à¦¤à¦¿à¦• à¦¬à¦¾à¦œà¦¾à¦°</h4>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">{selectedMonth}</span>
                          </div>
                          {recentMonthlyBazarEntries.length === 0 ? (
                            <p className="text-sm text-slate-300/80">à¦à¦‡ à¦®à¦¾à¦¸à§‡ à¦à¦–à¦¨à§‹ à¦•à§‹à¦¨à§‹ à¦¬à¦¾à¦œà¦¾à¦° à¦œà¦®à¦¾ à¦¹à§Ÿà¦¨à¦¿à¥¤</p>
                          ) : (
                            <div className="space-y-2">
                              {recentMonthlyBazarEntries.map((entry) => (
                                <button
                                  key={entry.id}
                                  type="button"
                                  onClick={() => setSelectedBazarDetail(entry)}
                                  className="w-full rounded-xl bg-white/8 hover:bg-white/12 border border-white/8 px-3 py-3 text-left transition"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold text-white truncate">{getMemberName(entry.memberId)}</p>
                                      <p className="text-[11px] text-slate-300 truncate">{entry.items && entry.items.length > 0 ? `${entry.items.length}à¦Ÿà¦¿ à¦†à¦‡à¦Ÿà§‡à¦®` : safeStr(entry.item)}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-sm font-black text-white">à§³{safeNum(entry.amount)}</p>
                                      <p className="text-[10px] text-slate-300">{formatDate(entry.date)}</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-black text-slate-700 mb-1 flex items-center gap-2"><AlertTriangle size={16} /> এই মাসের দণ্ড সমূহ</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mb-2">{MEMBER_DETAIL_SCROLL_HINT}</p>
                      <div className={MEMBER_DETAIL_LIST_SCROLL}>
                        {(() => {
                          const memberFines = fines
                            .filter(f => f.memberId === selectedMemberDetail.id && f.date && typeof f.date === 'string' && f.date.startsWith(selectedMonth))
                            .slice()
                            .sort((a, b) => new Date(b.date) - new Date(a.date));
                          if (memberFines.length === 0) return <p className="text-center text-slate-400 text-xs italic py-4">এই মাসে কোনো দণ্ড পায়নি।</p>;
                          return memberFines.map(f => (
                            <div key={f.id} className="bg-red-50 border border-red-100 p-3 rounded-xl flex justify-between items-center shadow-sm">
                              <div>
                                <p className="font-bold text-sm text-rose-700">{safeStr(f.reason)}</p>
                                <p className="text-[10px] text-slate-400 font-semibold">{formatDate(f.date)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="bg-white text-rose-600 font-black text-xs px-2 py-1 rounded border border-rose-100">+{safeNum(f.mealCount || 2)} মিল</span>
                                {isManager && (
                                  <button onClick={() => removeFine(f.id)} className="p-2 bg-white text-rose-500 hover:bg-rose-100 rounded-lg border border-rose-100 transition" title="দণ্ড মাফ করুন">
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* Vote Tab */}
            {activeTab === 'vote' && (
              <motion.div key="vote" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-6">
                <div className="flex justify-between items-center bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50">
                  <h3 className="font-black text-slate-800 flex items-center gap-2"><CheckSquare size={20} className="text-rose-500" /> ভোটিং সিস্টেম</h3>
                </div>

                {isManager && (
                  <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition transition-all transform-gpu">
                    <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">নতুন পোল তৈরি করুন</h4>
                    <form onSubmit={createPoll} className="space-y-3">
                      <input name="question" placeholder="প্রশ্ন (উদাঃ শুক্রবারের মেনু কী হবে?)" className="w-full p-3 bg-white/50 border border-white/40 focus:bg-white focus:border-rose-400 focus:ring-4 focus:ring-rose-100 rounded-xl text-sm font-bold outline-none shadow-inner transition transition-all transform-gpu" required />
                      <div className="flex gap-3">
                        <input name="opt1" placeholder="অপশন ১" className="flex-1 p-3 bg-white/50 border border-white/40 focus:bg-white focus:border-rose-400 focus:ring-4 focus:ring-rose-100 rounded-xl text-sm font-bold outline-none shadow-inner transition transition-all transform-gpu" required />
                        <input name="opt2" placeholder="অপশন ২" className="flex-1 p-3 bg-white/50 border border-white/40 focus:bg-white focus:border-rose-400 focus:ring-4 focus:ring-rose-100 rounded-xl text-sm font-bold outline-none shadow-inner transition transition-all transform-gpu" required />
                      </div>
                      <button className="w-full bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold p-3 rounded-xl shadow-lg shadow-rose-200 active:scale-95 transition-transform transform-gpu flex justify-center items-center gap-2">পোল তৈরি করুন</button>
                    </form>
                  </div>
                )}

                <div className="grid gap-4">
                  {polls.length === 0 ? <div className="text-center p-10 bg-white/50 rounded-3xl border border-dashed border-slate-300 text-slate-400 font-medium">কোনো অ্যাক্টিভ পোল নেই</div> :
                    polls.map(poll => {
                      const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
                      return (
                        <div key={poll.id} className="bg-white/70 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-sm border border-white/60 relative overflow-hidden transition transition-all transform-gpu hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                          <h4 className="text-xl font-black text-slate-800 mb-6 pr-12 drop-shadow-sm leading-tight">{poll.question}</h4>
                          <div className="space-y-4">
                            {poll.options.map(opt => {
                              const isMyVote = opt.votes.includes(user.uid);
                              const pct = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);
                              return (
                                <button key={opt.id} onClick={() => castVote(poll.id, opt.id, poll.options)} className={`w-full relative overflow-hidden p-5 rounded-2xl flex justify-between items-center transition transition-all transform-gpu border-2 group ${isMyVote ? 'border-rose-400 bg-rose-50/50 shadow-md shadow-rose-100' : 'border-slate-200 bg-white hover:border-rose-300 hover:shadow-md'}`}>
                                  <div className={`absolute left-0 top-0 bottom-0 transition transition-all transform-gpu duration-1000 ease-out border-r-2 ${isMyVote ? 'bg-rose-100/50 border-rose-300' : 'bg-slate-50 border-slate-200'}`} style={{ width: `${pct}%` }}></div>
                                  <div className="relative z-10 flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition transition-all transform-gpu ${isMyVote ? 'border-rose-500 bg-rose-100' : 'border-slate-300 group-hover:border-rose-300'}`}>
                                      {isMyVote && <div className="w-3 h-3 bg-gradient-to-r from-rose-500 to-rose-600 rounded-full animate-in zoom-in"></div>}
                                    </div>
                                    <span className={`font-bold tracking-tight ${isMyVote ? 'text-rose-900 text-base' : 'text-slate-700 text-sm group-hover:text-rose-700'}`}>{opt.text}</span>
                                  </div>
                                  <div className="relative z-10 font-black text-sm flex flex-col items-end">
                                    <span className={isMyVote ? 'text-rose-600 font-black' : 'text-slate-500'}>{pct}%</span>
                                    {opt.votes.length > 0 && <span className="text-[10px] text-slate-400 font-bold">({opt.votes.length} ভোট)</span>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Total Votes: {totalVotes}</span>
                            <span className="text-[10px] font-bold text-slate-400">{new Date(poll.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              </motion.div>
            )}

            {/* Bua Tracker Tab */}
            {activeTab === 'bua' && (
              <motion.div key="bua" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-6">
                <div className="flex justify-between items-center bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50">
                  <h3 className="font-black text-slate-800 flex items-center gap-2"><CalendarCheck size={20} className="text-emerald-500" /> বুয়া ট্র্যাকার</h3>
                  <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-2 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-slate-200" />
                </div>

                {isManager && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row gap-5 justify-between items-center animate-in zoom-in-95 duration-500">
                    <div>
                      <h4 className="font-black text-emerald-900 flex flex-col md:flex-row md:items-center gap-2 text-lg">
                        হাজিরা আপডেট:
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="p-2 bg-emerald-100/80 text-emerald-900 rounded-xl text-sm font-black outline-none border border-emerald-200 focus:ring-4 focus:ring-emerald-200/50 shadow-inner"
                        />
                      </h4>
                      <p className="text-xs text-emerald-700 font-medium mt-2">উপরের নির্বাচিত তারিখে বুয়া উপস্থিত ছিল কিনা তা আপডেট করুন</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                      <button onClick={() => updateBuaAttendance(selectedDate, true)} className="flex-1 md:flex-none p-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black rounded-xl active:scale-95 transition-transform transform-gpu flex justify-center items-center gap-2 shadow-lg shadow-emerald-200 hover:shadow-emerald-300"><CheckCircle size={18} /> উপস্থিত</button>
                      <button onClick={() => updateBuaAttendance(selectedDate, false)} className="flex-1 md:flex-none p-3 px-6 bg-gradient-to-r from-rose-500 to-red-600 text-white font-black rounded-xl active:scale-95 transition-transform transform-gpu flex justify-center items-center gap-2 shadow-lg shadow-rose-200 hover:shadow-rose-300"><XCircle size={18} /> অনুপস্থিত</button>
                    </div>
                  </div>
                )}

                <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-slate-100 pb-4">
                    <h3 className="font-black text-slate-800 text-lg">হাজিরা রিপোর্ট ({selectedMonth})</h3>

                    {(() => {
                      const monthRecords = buaData.filter(b => b.date && b.date.startsWith(selectedMonth));
                      const present = monthRecords.filter(b => b.isPresent === true).length;
                      const absent = monthRecords.filter(b => b.isPresent === false).length;
                      return (
                        <div className="text-sm font-black bg-white border border-slate-200 px-4 py-2 rounded-full flex gap-4 text-slate-500 shadow-sm">
                          <span className="flex items-center gap-2 text-emerald-600"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> উপস্থিত: {present}</span>
                          <span className="w-px bg-slate-200"></span>
                          <span className="flex items-center gap-2 text-rose-500"><div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div> ছুটি: {absent}</span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {buaData.filter(b => b.date && b.date.startsWith(selectedMonth)).sort((a, b) => b.date.localeCompare(a.date)).map(record => (
                      <div key={record.id} className={`p-4 rounded-full flex justify-between items-center border transition transition-all transform-gpu hover:-translate-y-0.5 ${record.isPresent ? 'bg-emerald-50/80 border-emerald-100 hover:shadow-[0_4px_20px_rgba(16,185,129,0.1)]' : 'bg-rose-50/80 border-rose-100 hover:shadow-[0_4px_20px_rgba(244,63,94,0.1)]'}`}>
                        <span className="font-black text-sm text-slate-800 ml-2">{formatDate(record.date)} <span className="ml-2 font-bold text-xs text-slate-500 bg-white/50 px-2 py-1 rounded-md">{new Date(record.date).toLocaleDateString('bn-BD', { weekday: 'long' })}</span></span>
                        {record.isPresent ?
                          <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-emerald-200"><CheckCircle size={14} /> উপস্থিত</span> :
                          <span className="text-xs font-black text-rose-700 bg-rose-100 px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-rose-200"><XCircle size={14} /> অনুপস্থিত</span>
                        }
                      </div>
                    ))}
                    {buaData.filter(b => b.date && b.date.startsWith(selectedMonth)).length === 0 && (
                      <div className="text-center py-10 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold text-sm">এই মাসের কোনো হাজিরার রেকর্ড নেই</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Weekly Menu Tab */}
            {activeTab === 'menu' && (
              <motion.div key="menu" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-xl p-5 md:p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50">
                  <div>
                    <h3 className="font-black text-slate-800 flex items-center gap-2 text-xl"><CalendarIcon size={24} className="text-amber-500" /> ৭ দিনের খাবারের মেনু</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1 ml-8 md:ml-8">প্রতিটি বেলার জন্য আলাদাভাবে মেনু সেট করুন বা AI-এর সাহায্য নিন</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                    const enToBn = { 'Saturday': 'শনিবার', 'Sunday': 'রবিবার', 'Monday': 'সোমবার', 'Tuesday': 'মঙ্গলবার', 'Wednesday': 'বুধবার', 'Thursday': 'বৃহস্পতিবার', 'Friday': 'শুক্রবার' };
                    return (
                      <div key={day} className="bg-white/80 backdrop-blur-xl p-5 md:p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-1 border border-slate-100 flex flex-col gap-4 transition transition-all transform-gpu duration-300">
                        <h4 className="font-black text-indigo-900 border-b-2 pb-3 border-indigo-50/50 flex items-center justify-between text-lg">
                          {enToBn[day]}
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-400 flex items-center justify-center text-xs"><CalendarIcon size={14} /></div>
                        </h4>
                        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100/50 space-y-3 flex-1 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/40 rounded-full blur-xl -mr-8 -mt-8 pointer-events-none"></div>
                          <div className="flex justify-between items-center relative z-10">
                            <p className="text-[10px] uppercase font-black tracking-wider text-amber-600 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> দুপুরের খাবার</p>
                            {isManager && (
                              <button onClick={() => generateSpecificMeal(day, 'lunch')} disabled={isGeneratingMenu === `${day}-lunch`} className="p-1.5 bg-white rounded-lg text-amber-500 hover:bg-amber-500 hover:text-white transition transition-all transform-gpu shadow-sm border border-amber-100 disabled:opacity-50">
                                {isGeneratingMenu === `${day}-lunch` ? <span className="animate-spin text-xs">⏳</span> : <Star size={14} />}
                              </button>
                            )}
                          </div>
                          {isManager ? (
                            <textarea
                              value={weeklyMenu[day]?.lunch || ''}
                              onChange={(e) => {
                                const newMenu = { ...weeklyMenu };
                                if (!newMenu[day]) newMenu[day] = {};
                                newMenu[day].lunch = e.target.value;
                                setWeeklyMenu(newMenu);
                              }}
                              onBlur={(e) => updateMenuMeal(day, 'lunch', e.target.value)}
                              placeholder="মেনু লিখুন..."
                              className="w-full bg-white/60 p-2 rounded-xl text-sm font-bold text-slate-800 border border-amber-100 outline-none focus:ring-2 focus:ring-amber-300 transition transition-all transform-gpu resize-none relative z-10"
                              rows="2"
                            />
                          ) : (
                            <p className="font-bold text-slate-800 text-sm leading-relaxed relative z-10">{weeklyMenu[day]?.lunch || <span className="text-slate-400 italic font-medium">নির্ধারিত নেই</span>}</p>
                          )}
                        </div>
                        <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100/50 space-y-3 flex-1 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/40 rounded-full blur-xl -mr-8 -mt-8 pointer-events-none"></div>
                          <div className="flex justify-between items-center relative z-10">
                            <p className="text-[10px] uppercase font-black tracking-wider text-indigo-600 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> রাতের খাবার</p>
                            {isManager && (
                              <button onClick={() => generateSpecificMeal(day, 'dinner')} disabled={isGeneratingMenu === `${day}-dinner`} className="p-1.5 bg-white rounded-lg text-indigo-500 hover:bg-indigo-500 hover:text-white transition transition-all transform-gpu shadow-sm border border-indigo-100 disabled:opacity-50">
                                {isGeneratingMenu === `${day}-dinner` ? <span className="animate-spin text-xs">⏳</span> : <Star size={14} />}
                              </button>
                            )}
                          </div>
                          {isManager ? (
                            <textarea
                              value={weeklyMenu[day]?.dinner || ''}
                              onChange={(e) => {
                                const newMenu = { ...weeklyMenu };
                                if (!newMenu[day]) newMenu[day] = {};
                                newMenu[day].dinner = e.target.value;
                                setWeeklyMenu(newMenu);
                              }}
                              onBlur={(e) => updateMenuMeal(day, 'dinner', e.target.value)}
                              placeholder="মেনু লিখুন..."
                              className="w-full bg-white/60 p-2 rounded-xl text-sm font-bold text-slate-800 border border-indigo-100 outline-none focus:ring-2 focus:ring-indigo-300 transition transition-all transform-gpu resize-none relative z-10"
                              rows="2"
                            />
                          ) : (
                            <p className="font-bold text-slate-800 text-sm leading-relaxed relative z-10">{weeklyMenu[day]?.dinner || <span className="text-slate-400 italic font-medium">নির্ধারিত নেই</span>}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Manager Tab */}
            {activeTab === 'members' && (
              <motion.div key="members" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-6">
                {isManager && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-6">
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-[2rem] shadow-sm border border-emerald-100 flex flex-col justify-center items-center text-center space-y-3 h-auto relative overflow-hidden">
                          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-100/50 rounded-full blur-2xl"></div>
                          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2 relative z-10"><ShieldCheck size={24} /></div>
                          <h3 className="font-black text-emerald-900 text-lg relative z-10">মেস আইডি (Mess ID)</h3>
                          <p className="text-xs font-semibold text-emerald-600/70 max-w-xs relative z-10">আপনার মেসের ইউনিক আইডি এটি। মেম্বারদের এটি দিয়ে সার্চ করতে বলতে পারেন।</p>

                          <div className="mt-2 w-full max-w-sm flex bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm relative z-10">
                            <input
                              type="text"
                              readOnly
                              value={appId}
                              className="flex-1 px-3 py-2 text-center text-sm font-black text-slate-700 outline-none bg-slate-50 tracking-wide font-mono"
                              onClick={e => e.target.select()}
                            />
                            <button onClick={() => { navigator.clipboard.writeText(appId); alert('মেস আইডি কপি হয়েছে!'); }} className="bg-emerald-600 text-white font-bold py-2 px-4 hover:bg-emerald-700 active:scale-[0.98] transition flex items-center justify-center gap-1 text-xs">
                              কপি
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Invitation Link Card */}
                      <div>
                        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-6 rounded-[2rem] shadow-sm border border-indigo-100 flex flex-col justify-center items-center text-center space-y-3 h-auto">
                          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-2"><UserPlus size={24} /></div>
                          <h3 className="font-black text-indigo-900 text-lg">ইনভাইটেশন লিংক</h3>
                          <p className="text-xs font-semibold text-indigo-600/70 max-w-xs">এই লিংকটি কপি করে সরাসরি মেম্বারদের পাঠিয়ে দিন।</p>

                          <div className="mt-2 w-full max-w-sm flex bg-white border border-indigo-200 rounded-xl overflow-hidden shadow-sm">
                            <input
                              type="text"
                              readOnly
                              value={`${window.location.origin}/join/${appId}`}
                              className="flex-1 px-3 py-2 text-xs font-medium text-slate-500 outline-none truncate bg-slate-50 selection:bg-indigo-100"
                              onClick={e => e.target.select()}
                            />
                            <button onClick={copyJoinLink} className="bg-indigo-600 text-white font-bold py-2 px-4 hover:bg-indigo-700 active:scale-[0.98] transition flex items-center justify-center gap-1 text-xs">
                              কপি
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        {/* Add Member Manually */}
                        <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition transition-all transform-gpu duration-300 space-y-4 h-full">
                          <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users size={18} className="text-indigo-600" /> ম্যানুয়ালি মেম্বার যুক্ত করুন</h3>
                          </div>
                          <button onClick={() => setShowAddMemberModal(true)} className="w-full bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition transform-gpu border-dashed hover:border-indigo-600 shadow-sm"><Plus size={18} /> নতুন মেম্বার যোগ করুন</button>
                        </div>
                      </div>
                    </div>

                    {/* Join Requests */}
                    {joinRequests.length > 0 && (
                      <div className="bg-amber-50 p-6 rounded-[2rem] shadow-sm border border-amber-200">
                        <h3 className="font-black text-amber-900 mb-4 flex items-center gap-2">
                          <Star size={18} className="text-amber-500" /> জয়েনিং রিকোয়েস্ট ({joinRequests.length})
                        </h3>
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                          {joinRequests.map(req => (
                            <div key={req.id} className="bg-white p-3 rounded-xl border border-amber-100 flex flex-col gap-2 shadow-sm">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-slate-800 text-sm">{req.name}</p>
                                  <p className="text-[10px] text-slate-500 font-medium">{req.phone}</p>
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => handleApproveJoin(req)} className="bg-emerald-500 text-white p-1.5 rounded-lg shadow-sm hover:bg-emerald-600"><CheckCircle size={14} /></button>
                                  <button onClick={() => handleRejectJoin(req.id)} className="bg-rose-100 text-rose-500 p-1.5 rounded-lg hover:bg-rose-200"><XCircle size={14} /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-2">মেম্বার কন্ট্রোল</h3>
                  {members.map(m => {
                    const name = safeStr(m.name);
                    return (
                      <div key={m.id} onClick={() => setSelectedMemberDetail(m)} className="bg-white/60 backdrop-blur-lg p-4 rounded-3xl shadow-sm border border-white/60 hover:shadow-md transition transition-all transform-gpu duration-300 flex justify-between items-center gap-4 cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black shadow-inner shrink-0">{name.charAt(0).toUpperCase()}</div>
                          <div className="min-w-0">
                            <span className="font-bold text-sm text-slate-700 flex items-center gap-1">
                              <span className="truncate">{name}</span>
                              {m.isManagerTag && <Crown size={12} className="text-amber-500 shrink-0" fill="currentColor" />}
                            </span>
                            <div className="flex items-center gap-2 mt-1 min-w-0">
                              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{m.isManagerTag ? 'ম্যানেজার' : 'মেম্বার'}</span>
                              {m.phone && (
                                <a href={`tel:${m.phone}`} onClick={e => e.stopPropagation()} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-emerald-100 transition truncate"><Phone size={10} className="shrink-0" /> <span className="truncate">Call Now</span></a>
                              )}
                            </div>
                          </div>
                        </div>
                        {isManager && (
                          <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                            <button onClick={() => togglePcUser(m.id, m.isPcUser)} className={`p-2 rounded-lg border text-xs font-black flex items-center gap-1 transition-colors ${m.isPcUser ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}`}>PC User</button>
                            <button onClick={async () => {
                              await toggleManagerTag(m.id, m.isManagerTag);
                              if (isHost && m.uid) await toggleManagerRole(m.uid);
                            }} className={`p-2 rounded-lg border transition-colors ${m.isManagerTag ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-500'}`} title={isHost ? "Make real manager & assign tag" : "Assign Manager Tag"}><Crown size={16} /></button>
                            <button
                              onClick={() => {
                                if (window.confirm(`"${name}" কে মেম্বার লিস্ট থেকে ডিলিট করতে চান?\n⚠️ এই মেম্বারের সব মিল, জমা ও বাজার ডাটা থেকে যাবে।`)) {
                                  deleteMember(m.id);
                                }
                              }}
                              className="p-2 rounded-lg border border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                              title="মেম্বার ডিলিট করুন"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && isManager && (
              <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-6">
                <div className="mb-4 flex items-center justify-between gap-3 px-2">
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Settings className="text-indigo-600 shrink-0" />
                    মেস সেটিংস
                  </h2>
                  <a
                    href={getWhatsAppSupportUrl(
                      `আসসালামু আলাইকুম, মিল ম্যানেজার অ্যাপ থেকে সাহায্য চাই।\nমেস: ${messName || '—'}`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md ring-2 ring-white/90 transition hover:scale-105 hover:shadow-lg active:scale-95"
                    title="WhatsApp সাপোর্ট (ল্যান্ডিং পেজের নম্বর)"
                    aria-label="WhatsApp এ সাপোর্ট চান"
                  >
                    <MessageCircle size={22} strokeWidth={2.25} className="drop-shadow-sm" />
                  </a>
                </div>

                <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition transition-all transform-gpu duration-300 space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><AlignLeft size={18} className="text-indigo-600" /> সাধারণ সেটিংস</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const next = (e.target.mName.value || '').trim();
                    await Promise.all([
                      setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'mess_config'), { name: next }),
                      updateDoc(doc(db, 'groups', appId), { name: next }),
                    ]);
                    setMessName(next);
                    alert("মেস বা গ্রুপের নাম সফলভাবে আপডেট হয়েছে!");
                  }} className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-black uppercase text-slate-400">মেসের নাম</label>
                    <div className="flex gap-2">
                      <input key={`mname-${messName || 'empty'}`} name="mName" defaultValue={messName || ''} placeholder="যেমন: Shopodhara" className="flex-1 p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none border border-slate-200" required />
                      <button className="bg-indigo-500 hover:bg-indigo-600 text-white px-5 rounded-xl font-bold shadow-sm transition">পরিবর্তন</button>
                    </div>
                  </form>

                  <form onSubmit={updateNotice} className="flex flex-col gap-2 pt-4 border-t border-slate-100 mt-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">নোটিশবোর্ড বার্তা</label>
                    <div className="flex gap-2">
                      <input name="noticeText" defaultValue={notice} placeholder="নতুন নোটিশ লিখুন" className="flex-1 p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none border border-slate-200" />
                      <button className="bg-orange-500 hover:bg-orange-600 text-white px-5 rounded-xl font-bold shadow-sm transition">আপডেট</button>
                    </div>
                  </form>
                </div>

                <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition transition-all transform-gpu duration-300 space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><Zap size={18} className="text-amber-500" /> ফিক্সড বিল ও তারিখ</h3>

                  <form onSubmit={updateDueDates} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 bg-white/40 rounded-2xl border border-white/60">
                    <div className="col-span-2 md:col-span-4 block text-[10px] font-black text-slate-400 uppercase mb-1">শেষ তারিখ (দিন) নির্ধারণ করুন</div>
                    <div><label className="text-[10px] font-bold text-slate-400 block mb-1">মিল</label><input name="meal" type="number" defaultValue={dueDates.meal} placeholder="মিল" className="w-full p-2 bg-white/50 backdrop-blur-sm border border-white/40 focus:border-indigo-400 rounded-xl text-xs font-bold shadow-inner outline-none transition" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 block mb-1">ওয়াইফাই</label><input name="wifi" type="number" defaultValue={dueDates.wifi} placeholder="ওয়াইফাই" className="w-full p-2 bg-white/50 backdrop-blur-sm border border-white/40 focus:border-indigo-400 rounded-xl text-xs font-bold shadow-inner outline-none transition" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 block mb-1">বিদ্যুৎ</label><input name="current" type="number" defaultValue={dueDates.current} placeholder="বিদ্যুৎ" className="w-full p-2 bg-white/50 backdrop-blur-sm border border-white/40 focus:border-indigo-400 rounded-xl text-xs font-bold shadow-inner outline-none transition" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 block mb-1">ভাড়া</label><input name="rent" type="number" defaultValue={dueDates.rent} placeholder="ভাড়া" className="w-full p-2 bg-white/50 backdrop-blur-sm border border-white/40 focus:border-indigo-400 rounded-xl text-xs font-bold shadow-inner outline-none transition" /></div>
                    <div className="col-span-2 md:col-span-4"><label className="text-[10px] font-bold text-slate-400 block mb-1">খালার বেতন</label><input name="maid" type="number" defaultValue={dueDates.maid || '5'} placeholder="খালার বেতন" className="w-full p-2 bg-white/50 backdrop-blur-sm border border-white/40 focus:border-indigo-400 rounded-xl text-xs font-bold shadow-inner outline-none transition" /></div>
                    <button className="col-span-2 md:col-span-4 bg-slate-200 text-slate-600 hover:bg-slate-300 p-2.5 rounded-xl text-xs font-bold mt-2 transition shadow-sm">তারিখগুলো সেভ করুন</button>
                  </form>

                  <form onSubmit={updateBills} className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className="col-span-2 md:col-span-5 block text-[10px] font-black text-slate-400 uppercase">বিলের এমাউন্ট নির্ধারণ করুন</div>
                    <div><label className="text-[10px] font-bold text-slate-400 block mb-1">WiFi</label><input name="wifi" type="number" defaultValue={safeNum(bills.wifi)} className="w-full p-2 bg-white/50 backdrop-blur-sm border border-white/40 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl text-xs font-bold outline-none shadow-inner transition" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 block mb-1">পিসি চার্জ</label><input name="pcCharge" type="number" defaultValue={safeNum(bills.pcCharge)} className="w-full p-2 bg-white/50 backdrop-blur-sm border border-rose-200 focus:bg-white focus:border-rose-400 focus:ring-4 focus:ring-rose-100 rounded-xl text-xs font-bold text-rose-500 outline-none shadow-inner transition" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 block mb-1">বিদ্যুৎ</label><input name="current" type="number" defaultValue={safeNum(bills.current)} className="w-full p-2 bg-white/50 backdrop-blur-sm border border-white/40 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl text-xs font-bold outline-none shadow-inner transition" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 block mb-1">ভাড়া</label><input name="rent" type="number" defaultValue={safeNum(bills.rent)} className="w-full p-2 bg-white/50 backdrop-blur-sm border border-white/40 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl text-xs font-bold outline-none shadow-inner transition" /></div>
                    <div className="col-span-2 md:col-span-1"><label className="text-[10px] font-bold text-slate-400 block mb-1">খালার বেতন</label><input name="maid" type="number" defaultValue={safeNum(bills.maid)} className="w-full p-2 bg-white/50 backdrop-blur-sm border border-white/40 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl text-xs font-bold outline-none shadow-inner transition" /></div>
                    <button className="col-span-2 md:col-span-5 bg-gradient-to-r from-slate-700 to-slate-900 border border-slate-600 text-white shadow-lg hover:shadow-slate-300 p-2 rounded-xl text-xs font-bold mt-2 transition">বিল সেভ করুন</button>
                  </form>
                  <button onClick={handleSendReminders} className="w-full mt-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white p-3 rounded-xl shadow-lg hover:shadow-orange-200 transition text-sm font-bold flex items-center justify-center gap-2">
                    <Bell size={18} /> স্বয়ংক্রিয় বিল রিমাইন্ডার ইমেইল পাঠান
                  </button>
                </div>

                <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50">
                  <h3 className="font-bold text-rose-800 flex items-center gap-2 mb-4"><AlertTriangle size={18} className="text-rose-500" /> ডেঞ্জার জোন</h3>
                  <button onClick={() => setShowResetModal(true)} className="w-full p-4 border-2 border-red-100 bg-red-50 text-red-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors transform-gpu">
                    <RotateCcw size={18} /> মাস শেষে সকল ডাটা রিসেট করুন
                  </button>
                </div>
              </motion.div>
            )}
            {/* Deposit Tab */}
            {activeTab === 'deposit' && (
              <motion.div key="deposit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Wallet size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-lg">টাকা জমা</h3>
                      <p className="text-xs text-slate-400 font-medium">মিলের টাকা জমা করুন</p>
                    </div>
                  </div>
                  {isManager && (
                    <button
                      onClick={() => {
                        setDepositMemberId(members[0]?.id || '');
                        setDepositAmount('');
                        setDepositNote('');
                        setDepositDate(new Date().toISOString().split('T')[0]);
                        setShowDepositModal(true);
                      }}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-200/50 transition transform-gpu hover:-translate-y-0.5"
                    >
                      <Plus size={18} /> জমা যোগ করুন
                    </button>
                  )}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 min-[400px]:p-5 rounded-[1.5rem] min-[400px]:rounded-[1.75rem] text-white shadow-[0_20px_40px_-15px_rgba(16,185,129,0.4)] flex flex-col justify-center">
                    <p className="text-[9px] min-[400px]:text-[10px] font-black uppercase min-[400px]:tracking-widest text-emerald-100 line-clamp-1">এই মাসে মোট জমা</p>
                    <h3 className="text-xl min-[400px]:text-2xl md:text-3xl font-black mt-1 min-[400px]:mt-2 truncate" title={`৳${monthlyDeposits.reduce((a, b) => a + safeNum(b.amount), 0).toFixed(0)}`}>৳{monthlyDeposits.reduce((a, b) => a + safeNum(b.amount), 0).toFixed(0)}</h3>
                  </div>
                  <div className="bg-white/60 backdrop-blur-xl p-4 min-[400px]:p-5 rounded-[1.5rem] min-[400px]:rounded-[1.75rem] border border-white/50 shadow-sm flex flex-col justify-center">
                    <p className="text-[9px] min-[400px]:text-[10px] font-black uppercase min-[400px]:tracking-widest text-slate-400 line-clamp-1">জমার সংখ্যা</p>
                    <h3 className="text-xl min-[400px]:text-2xl md:text-3xl font-black mt-1 min-[400px]:mt-2 text-slate-800 truncate">{monthlyDeposits.length}টি</h3>
                  </div>
                  <div className="bg-white/60 backdrop-blur-xl p-4 min-[400px]:p-5 rounded-[1.5rem] min-[400px]:rounded-[1.75rem] border border-white/50 shadow-sm col-span-2 md:col-span-1 flex flex-col justify-center">
                    <p className="text-[9px] min-[400px]:text-[10px] font-black uppercase min-[400px]:tracking-widest text-slate-400 line-clamp-1">সর্বমোট জমা (সব মাস)</p>
                    <h3 className="text-xl min-[400px]:text-2xl md:text-3xl font-black mt-1 min-[400px]:mt-2 text-indigo-600 truncate" title={`৳${deposits.reduce((a, b) => a + safeNum(b.amount), 0).toFixed(0)}`}>৳{deposits.reduce((a, b) => a + safeNum(b.amount), 0).toFixed(0)}</h3>
                  </div>
                </div>

                {/* Per-member summary */}
                <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="font-black text-slate-700 flex items-center gap-2"><Users size={16} className="text-indigo-500" /> সদস্যভিত্তিক এই মাসের জমা</h4>
                    <button onClick={generateDepositPDF} className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-600 hover:bg-slate-50 transition shadow-sm">
                      <Printer size={14} /> PDF রিপোর্ট
                    </button>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {membersSortedByDepositDesc.map(m => {
                      const mDeposited = depositsByMember[m.id] || 0;
                      const { mealCost } = getMemberStats(m.id);
                      const diff = mDeposited - parseFloat(mealCost);
                      return (
                        <div key={m.id} onClick={() => setSelectedMemberDetail(m)} className="p-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer gap-4 min-w-0">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                              {safeStr(m.name).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-sm text-slate-800 truncate mb-0.5">{safeStr(m.name)}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">মিল খরচ: ৳{mealCost}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-black text-emerald-600 text-sm">৳{mDeposited.toFixed(0)}</p>
                            <p className={`text-[10px] font-black tracking-tight whitespace-nowrap ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {diff >= 0 ? `+৳${diff.toFixed(0)} (ফেরত)` : `-৳${Math.abs(diff).toFixed(0)} (বাকি)`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Full history */}
                <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="font-black text-slate-700 flex items-center gap-2"><History size={16} className="text-slate-500" /> সম্পূর্ণ জমার হিস্ট্রি ({deposits.length}টি)</h4>
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                    {monthlyDeposits.length === 0
                      ? <p className="p-8 text-center text-slate-400 italic text-xs">এই মাসে কোনো জমা নেই</p>
                      : monthlyDeposits.slice().sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).map(d => (
                        <div key={d.id} className="p-4 flex justify-between items-center hover:bg-slate-50/80 transition group">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><CreditCard size={16} /></div>
                            <div>
                              <p className="font-bold text-slate-700 text-sm">{getMemberName(d.memberId)}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{formatDate(d.date)} {d.note && `• ${d.note}`}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-emerald-600 text-base">৳{safeNum(d.amount).toFixed(0)}</span>
                            {isManager && (
                              <button
                                onClick={async () => {
                                  if (await showConfirm({ title: 'জমা মুছে ফেলুন', message: 'এই জমার রেকর্ডটি মুছে ফেলতে চান?', danger: true })) {
                                    try {
                                      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'deposits', d.id));
                                      showToast('জমা মুছে ফেলা হয়েছে', 'success');
                                    } catch (e) {
                                      showToast('ডিলিট করতে সমস্যা হয়েছে', 'error');
                                    }
                                  }
                                }}
                                className="text-slate-300 hover:text-rose-500 md:opacity-0 group-hover:opacity-100 transition p-1"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* ফিক্সড বটম ট্যাব: flex min-height:auto বাগে প্যাডিং কাজ না করলেও স্ক্রল শেষে জায়গা থাকে */}
          <div
            className="md:hidden w-full shrink-0 pointer-events-none"
            style={{ height: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
            aria-hidden
          />
        </main>

        {/* Deposit Modal */}
        <AnimatePresence>
          {showDepositModal && isManager && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm"
              onClick={() => setShowDepositModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-2xl w-full max-w-sm border border-slate-100"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Wallet className="text-emerald-500" /> টাকা জমা</h3>
                  <button onClick={() => setShowDepositModal(false)} className="text-slate-400 hover:text-rose-500 bg-slate-50 p-2 rounded-full transition-colors"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] uppercase font-black tracking-wider text-slate-400 mb-2 block">মেম্বার নির্বাচন করুন</label>
                    <select
                      value={depositMemberId}
                      onChange={e => setDepositMemberId(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 rounded-xl text-base md:text-sm font-bold outline-none transition"
                    >
                      {members.map(m => <option key={m.id} value={m.id}>{safeStr(m.name)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-black tracking-wider text-slate-400 mb-2 block">পরিমাণ (৳) <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 rounded-xl text-base font-bold outline-none transition"
                      placeholder="৳ যেমন: 2000"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-black tracking-wider text-slate-400 mb-2 block">তারিখ</label>
                    <input
                      type="date"
                      value={depositDate}
                      onChange={e => setDepositDate(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 rounded-xl text-base md:text-sm font-bold outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-black tracking-wider text-slate-400 mb-2 block">নোট (ঐচ্ছিক)</label>
                    <input
                      type="text"
                      value={depositNote}
                      onChange={e => setDepositNote(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 rounded-xl text-base md:text-sm font-bold outline-none transition"
                      placeholder="????: ????? ????? ???"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!depositAmount || !depositMemberId) {
                        showToast('পরিমাণ এবং মেম্বার দিন', 'warning');
                        return;
                      }
                      if (Number(depositAmount) <= 0) {
                        showToast('সঠিক পরিমাণ দিন', 'error');
                        return;
                      }

                      const optimisticDeposit = {
                        id: `temp-deposit-modal-${Date.now()}`,
                        memberId: depositMemberId,
                        amount: Number(depositAmount),
                        date: depositDate,
                        note: depositNote,
                        createdAt: new Date().toISOString(),
                        isPendingSync: true,
                      };

                      setDeposits((prev) => [optimisticDeposit, ...prev]);
                      setShowDepositModal(false);
                      setDepositAmount('');
                      setDepositNote('');
                      showToast(`৳${optimisticDeposit.amount} জমা হয়েছে!`, 'success');

                      runInBackground(
                        () =>
                          addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'deposits'), {
                            memberId: optimisticDeposit.memberId,
                            amount: optimisticDeposit.amount,
                            date: optimisticDeposit.date,
                            note: optimisticDeposit.note,
                            createdAt: optimisticDeposit.createdAt,
                          }),
                        () => {
                          setDeposits((prev) => prev.filter((item) => item.id !== optimisticDeposit.id));
                          showToast('জমা সেভ করতে সমস্যা হয়েছে', 'error');
                        }
                      );
                    }}
                    className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 text-white rounded-2xl font-black mt-4 transition transform-gpu flex items-center justify-center gap-2"
                  >
                    <Wallet size={18} /> জমা করুন
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spacer to push content above fixed bottom nav */}
        <div className="md:hidden w-full h-[calc(4.5rem+env(safe-area-inset-bottom,0px))]" aria-hidden="true" />
      </div> {/* Close scrollable main column (মোবাইলে overflow-y স্ক্রল এখানে) */}

      {/* স্ক্রল কনটেইনারের বাইরে রাখা — কিছু ব্রাউজারে fixed+overflow ভিতরে কনটেন্ট ক্লিপ হয় */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] w-full block"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex w-full items-stretch justify-between gap-0 px-1 pt-1.5 pb-1 min-h-[3.5rem]">
          {(isManager
            ? [
              { id: 'dashboard', icon: LayoutDashboard, label: 'ড্যাশবোর্ড' },
              { id: 'meals', icon: Utensils, label: 'মিল' },
              { id: 'bazar', icon: ShoppingCart, label: 'বাজার' },
              { id: 'deposit', icon: Wallet, label: 'জমা' },
              { id: 'members', icon: Users, label: 'মেম্বার' },
            ]
            : [
              { id: 'dashboard', icon: LayoutDashboard, label: 'প্রোফাইল' },
              { id: 'bazar', icon: ShoppingCart, label: 'বাজার' },
              { id: 'menu', icon: CalendarIcon, label: 'মেনু' },
              { id: 'deposit', icon: Wallet, label: 'জমা' },
              { id: 'members', icon: Users, label: 'মেম্বার' },
            ]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => switchTab(item.id)}
              className={`flex flex-1 min-w-0 basis-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1 rounded-xl transition-colors duration-200 ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
            >
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} className="shrink-0" />
              <span
                className={`w-full min-w-0 block text-center text-[8px] sm:text-[9px] leading-tight truncate ${activeTab === item.id ? 'font-black' : 'font-semibold'}`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
      <AnimatePresence>
        {selectedReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm"
            onClick={() => setSelectedReceipt(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="relative max-w-2xl max-h-[90vh] w-full flex items-center justify-center p-2 rounded-2xl"
              onClick={e => e.stopPropagation()}
            >
              <img src={selectedReceipt} className="max-w-full max-h-[85vh] rounded-[2rem] shadow-2xl border flex-shrink-0" alt="Receipt Preview" />
              <button onClick={() => setSelectedReceipt(null)} className="absolute -top-4 -right-4 md:-top-6 md:-right-6 bg-rose-500 text-white p-2 rounded-full hover:bg-rose-600 shadow-xl border-2 border-slate-900 transition"><X size={20} /></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBazarDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => { setSelectedBazarDetail(null); setIsEditingBazar(false); setEditedBazarPhotoBase64(''); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="bg-white max-w-sm w-full rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85dvh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-indigo-500 to-violet-600 p-6 text-white relative shrink-0">
                <button onClick={() => { setSelectedBazarDetail(null); setIsEditingBazar(false); setEditedBazarPhotoBase64(''); }} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-full transition"><X size={18} /></button>
                <h3 className="font-black text-lg sm:text-xl mb-1 flex items-center gap-2"><ShoppingCart size={20} /> বাজারের বিস্তারিত</h3>
                <p className="text-indigo-100 text-xs font-medium opacity-90">{getMemberName(selectedBazarDetail.memberId)} • {formatDate(selectedBazarDetail.date)}</p>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 custom-scrollbar min-h-0">
                {isEditingBazar ? (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const updateData = { memberId: e.target.newMemberId.value };
                      if (editedBazarPhotoBase64) updateData.photo = editedBazarPhotoBase64;
                      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bazar', selectedBazarDetail.id), updateData);
                      setIsEditingBazar(false);
                      setSelectedBazarDetail(null);
                      setEditedBazarPhotoBase64('');
                      showToast("বাজার সফলভাবে আপডেট হয়েছে!", 'success');
                    } catch (err) {
                      showToast("আপডেট করতে সমস্যা হয়েছে।", 'error');
                    }
                  }} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">সদস্য পরিবর্তন করুন</label>
                      <select name="newMemberId" defaultValue={selectedBazarDetail.memberId} className="w-full text-sm font-bold bg-white p-3 rounded-xl border border-slate-200 outline-none shadow-sm focus:border-indigo-400">
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">নতুন রসিদ যুক্ত করুন (অপশনাল)</label>
                      <input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const img = new Image();
                          img.onload = () => {
                            const canvas = document.createElement("canvas");
                            const ctx = canvas.getContext("2d");
                            const MAX_WIDTH = 1200;
                            let width = img.width; let height = img.height;
                            if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
                            canvas.width = width; canvas.height = height;
                            ctx.drawImage(img, 0, 0, width, height);
                            setEditedBazarPhotoBase64(canvas.toDataURL("image/jpeg", 0.6));
                          };
                          img.src = event.target.result;
                        };
                        reader.readAsDataURL(file);
                      }} className="text-xs w-full file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-indigo-50 file:text-indigo-700 outline-none" />
                      {editedBazarPhotoBase64 && <img src={editedBazarPhotoBase64} alt="New Preview" className="mt-3 w-full max-h-32 object-cover rounded-xl border border-slate-200 shadow-sm" />}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" className="flex-1 flex justify-center items-center py-2.5 rounded-xl border-2 border-indigo-600 bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-sm transition">সেভ করুন</button>
                      <button type="button" onClick={() => setIsEditingBazar(false)} className="flex-1 flex justify-center items-center py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 transition">বাতিল</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
                      <div className="max-h-60 overflow-y-auto overscroll-contain px-4 py-1 custom-scrollbar divide-y divide-slate-100">
                        {selectedBazarDetail.items && selectedBazarDetail.items.length > 0 ? (
                          selectedBazarDetail.items.map((it, idx) => (
                            <div key={idx} className="py-3 first:pt-2 last:pb-2 flex justify-between items-center group">
                              <div>
                                <span className="block font-bold text-slate-700 text-sm group-hover:text-indigo-600 transition-colors uppercase">{safeStr(it.name)}</span>
                                <span className="block text-[10px] text-slate-400 font-bold uppercase">{safeStr(it.qty)}</span>
                              </div>
                              <span className="font-black text-slate-800 text-sm">৳{safeNum(it.amount)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="py-3 flex justify-between items-center">
                            <span className="block font-bold text-slate-700 text-sm">{safeStr(selectedBazarDetail.item)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedBazarDetail.photo && (
                      <button
                        onClick={() => setSelectedReceipt(selectedBazarDetail.photo)}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 font-bold text-indigo-700 hover:bg-indigo-100 transition"
                      >
                        <FileText size={16} /> রসিদ দেখুন
                      </button>
                    )}
                    {safeNum(selectedBazarDetail.sharedCount) > 1 && (
                      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-3 text-amber-700">
                        <p className="text-xs font-black">এই বাজার {safeNum(selectedBazarDetail.sharedCount)} জনের মধ্যে ভাগ করা হয়েছে</p>
                        <p className="mt-1 text-xs font-bold">মোট বাজার: ৳{safeNum(selectedBazarDetail.totalAmount || selectedBazarDetail.amount)}</p>
                      </div>
                    )}
                    <div className="flex justify-between items-center bg-indigo-50 text-indigo-700 px-5 py-4 rounded-2xl border border-indigo-100">
                      <span className="font-bold text-sm">সর্বমোট খরচ</span>
                      <span className="font-black text-lg">৳{safeNum(selectedBazarDetail.amount)}</span>
                    </div>
                    {isManager && (
                      <button onClick={() => setIsEditingBazar(true)} className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-slate-100 bg-white text-slate-600 font-bold hover:bg-slate-50 transition transform-gpu">
                        <Edit size={16} /> বাজার এডিট করুন
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {showNoticePopup && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowNoticePopup(false)}>
          <div className="bg-white max-w-sm w-full rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-rose-500 to-red-600 p-5 text-white relative">
              <button onClick={() => setShowNoticePopup(false)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-full transition"><X size={16} /></button>
              <h3 className="font-black text-lg flex items-center gap-2"><Printer size={20} /> নোটিশ ডাউনলোড</h3>
              <p className="text-rose-100 text-[10px] font-bold mt-0.5">নিচের যেকোনো একটি নির্দিষ্ট বিলের নোটিশ সিলেক্ট করুন</p>
            </div>
            <div className="p-6 space-y-3">
              <button onClick={() => generateSpecificBillPDF('wifi')} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl transition group">
                <div className="flex items-center gap-3"><div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl group-hover:scale-110 transition"><Wifi size={16} /></div><span className="font-bold text-slate-700 group-hover:text-indigo-700">ওয়াইফাই বিল নোটিশ</span></div>
              </button>
              <button onClick={() => generateSpecificBillPDF('current')} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-2xl transition group">
                <div className="flex items-center gap-3"><div className="p-2 bg-amber-100 text-amber-600 rounded-xl group-hover:scale-110 transition"><Zap size={16} /></div><span className="font-bold text-slate-700 group-hover:text-amber-700">বিদ্যুৎ বিল নোটিশ</span></div>
              </button>
              <button onClick={() => generateSpecificBillPDF('rent')} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-2xl transition group">
                <div className="flex items-center gap-3"><div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-110 transition"><Users size={16} /></div><span className="font-bold text-slate-700 group-hover:text-emerald-700">বাসা ভাড়া নোটিশ</span></div>
              </button>
              <button onClick={() => generateSpecificBillPDF('maid')} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-2xl transition group">
                <div className="flex items-center gap-3"><div className="p-2 bg-rose-100 text-rose-600 rounded-xl group-hover:scale-110 transition"><UserPlus size={16} /></div><span className="font-bold text-slate-700 group-hover:text-rose-700">খালার বেতন নোটিশ</span></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};





