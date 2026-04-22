import { useToast, useConfirm } from '../contexts/ToastContext';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, collectionGroup, deleteDoc, deleteField, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, BadgeDollarSign, CheckCircle2, Clock3, CreditCard, Search, ShieldCheck, Trash2, UserCog, Users, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/db';
import { sendEmail } from '../services/emailService';

const initialPricing = { premiumPrice: 299, bkashNumber: '01700000000' };
const RECEIPT_RETENTION_DAYS = 60;

const normalizeDate = (value) => {
  if (!value) return null;
  try {
    if (typeof value?.toDate === 'function') {
      const converted = value.toDate();
      return Number.isNaN(converted.getTime()) ? null : converted;
    }
    const converted = new Date(value);
    return Number.isNaN(converted.getTime()) ? null : converted;
  } catch (error) {
    return null;
  }
};

const extractGroupIdFromPath = (path) => {
  const parts = String(path || '').split('/');
  return parts[1] || '';
};

const estimatePhotoBytes = (photo) => {
  if (!photo || typeof photo !== 'string') return 0;
  const base64Body = photo.includes(',') ? photo.split(',').pop() : photo;
  return Math.ceil((base64Body.length * 3) / 4);
};

const formatStorageMb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

const formatShortDate = (value) => {
  const date = normalizeDate(value);
  if (!date) return 'তারিখ নেই';
  return date.toLocaleDateString('en-GB');
};

const chunkItems = (items, size = 400) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

function StatCard({ icon: Icon, label, value, tone = 'cyan' }) {
  const toneMap = {
    cyan: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20',
    emerald: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
    amber: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
    rose: 'bg-rose-400/10 text-rose-300 border-rose-400/20',
  };

  return (
    <div className={`rounded-[1.75rem] border p-5 ${toneMap[tone]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] opacity-80">{label}</p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950/40">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [requests, setRequests] = useState([]);
  const [pricing, setPricing] = useState(initialPricing);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('requests');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [storageReport, setStorageReport] = useState(null);
  const [storageAuditLoading, setStorageAuditLoading] = useState(false);
  const [storageCleanupRunning, setStorageCleanupRunning] = useState(false);
  const [lastStorageCleanup, setLastStorageCleanup] = useState(null);

  useEffect(() => {
    if (!userProfile?.isAdmin) {
      navigate('/dashboard');
      return;
    }

    const usersQuery = query(collection(db, 'users'), limit(300));
    const groupsQuery = query(collection(db, 'groups'), limit(300));
    const requestsQuery = query(collection(db, 'subscription_requests'), orderBy('timestamp', 'desc'), limit(100));

    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    const unsubGroups = onSnapshot(groupsQuery, (snapshot) => {
      setGroups(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
      setRequests(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    const fetchPricing = async () => {
      try {
        const snap = await getDoc(doc(db, 'system', 'pricing'));
        if (snap.exists()) {
          setPricing({ ...initialPricing, ...snap.data() });
        } else {
          await setDoc(doc(db, 'system', 'pricing'), initialPricing, { merge: true });
        }
        const cleanupSnap = await getDoc(doc(db, 'system', 'storage_cleanup'));
        if (cleanupSnap.exists()) {
          setLastStorageCleanup(cleanupSnap.data());
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();

    return () => {
      unsubUsers();
      unsubGroups();
      unsubRequests();
    };
  }, [navigate, userProfile]);

  const groupOwnerMap = useMemo(() => new Map(groups.map((group) => [group.ownerId, group.id])), [groups]);

  const searchedUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) =>
      [user.displayName, user.email, user.phone, user.phoneNumber].some((field) => String(field || '').toLowerCase().includes(keyword)),
    );
  }, [searchTerm, users]);

  const searchedGroups = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return groups;
    return groups.filter((group) =>
      [group.name, group.ownerEmail, group.slug, group.id].some((field) => String(field || '').toLowerCase().includes(keyword)),
    );
  }, [groups, searchTerm]);

  const totalManagers = useMemo(() => groups.filter((group) => !!group.ownerId).length, [groups]);
  const premiumGroups = useMemo(() => groups.filter((group) => group.plan === 'premium').length, [groups]);

  const scanReceiptStorage = async () => {
    setStorageAuditLoading(true);

    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(0, 0, 0, 0);
      cutoffDate.setDate(cutoffDate.getDate() - RECEIPT_RETENTION_DAYS);

      const groupMap = new Map(groups.map((group) => [group.id, group]));
      const [bazarSnap, requestSnap] = await Promise.all([
        getDocs(collectionGroup(db, 'bazar')),
        getDocs(collectionGroup(db, 'bazar_requests')),
      ]);

      const grouped = new Map();
      const expiredItems = [];
      let totalReceipts = 0;
      let totalBytes = 0;
      let expiredReceipts = 0;
      let expiredBytes = 0;

      [...bazarSnap.docs, ...requestSnap.docs].forEach((item) => {
        const data = item.data();
        if (!data?.photo) return;

        const groupId = extractGroupIdFromPath(item.ref.path);
        const groupInfo = groupMap.get(groupId);
        const receiptDate = normalizeDate(data.date || data.createdAt);
        const photoBytes = estimatePhotoBytes(data.photo);
        const isExpired = receiptDate ? receiptDate < cutoffDate : false;
        const type = item.ref.path.includes('/bazar_requests/') ? 'request' : 'approved';

        totalReceipts += 1;
        totalBytes += photoBytes;

        const current = grouped.get(groupId) || {
          groupId,
          groupName: groupInfo?.name || 'নামবিহীন mess',
          ownerEmail: groupInfo?.ownerEmail || '',
          totalReceipts: 0,
          totalBytes: 0,
          expiredReceipts: 0,
          expiredBytes: 0,
          pendingReceipts: 0,
          approvedReceipts: 0,
          oldestExpiredAt: null,
          newestExpiredAt: null,
        };

        current.totalReceipts += 1;
        current.totalBytes += photoBytes;
        current.pendingReceipts += type === 'request' ? 1 : 0;
        current.approvedReceipts += type === 'approved' ? 1 : 0;

        if (isExpired) {
          expiredReceipts += 1;
          expiredBytes += photoBytes;
          current.expiredReceipts += 1;
          current.expiredBytes += photoBytes;
          current.oldestExpiredAt = !current.oldestExpiredAt || receiptDate < current.oldestExpiredAt ? receiptDate : current.oldestExpiredAt;
          current.newestExpiredAt = !current.newestExpiredAt || receiptDate > current.newestExpiredAt ? receiptDate : current.newestExpiredAt;

          expiredItems.push({
            ref: item.ref,
            groupId,
            groupName: current.groupName,
            type,
            bytes: photoBytes,
            date: receiptDate,
          });
        }

        grouped.set(groupId, current);
      });

      const groupedRows = Array.from(grouped.values())
        .sort((left, right) => right.expiredReceipts - left.expiredReceipts || right.totalReceipts - left.totalReceipts || left.groupName.localeCompare(right.groupName));

      setStorageReport({
        generatedAt: new Date().toISOString(),
        cutoffDate: cutoffDate.toISOString(),
        totalReceipts,
        totalBytes,
        expiredReceipts,
        expiredBytes,
        groups: groupedRows,
        expiredItems,
      });
    } catch (error) {
      console.error(error);
      showToast('Storage scan ব্যর্থ হয়েছে।', 'error');
    } finally {
      setStorageAuditLoading(false);
    }
  };

  const cleanupOldReceipts = async (targetGroupId = '') => {
    const sourceItems = storageReport?.expiredItems || [];
    const targets = targetGroupId ? sourceItems.filter((item) => item.groupId === targetGroupId) : sourceItems;

    if (targets.length === 0) {
      showToast('২ মাসের বেশি পুরনো কোনো receipt পাওয়া যায়নি।');
      return;
    }

    const targetLabel = targetGroupId
      ? storageReport?.groups?.find((group) => group.groupId === targetGroupId)?.groupName || 'এই mess'
      : 'সব mess';

    if (!(await showConfirm({ message: "${targetLabel} থেকে ${targets.length}টি পুরনো receipt delete করতে চান? photo field মুছে যাবে।", danger: true }))) return;

    setStorageCleanupRunning(true);
    try {
      for (const chunk of chunkItems(targets, 400)) {
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          batch.update(item.ref, { photo: deleteField() });
        });
        await batch.commit();
      }

      const payload = {
        lastRunAt: new Date().toISOString(),
        lastRunReceiptCount: targets.length,
        lastRunBytes: targets.reduce((sum, item) => sum + item.bytes, 0),
        retentionDays: RECEIPT_RETENTION_DAYS,
        scope: targetGroupId || 'all',
      };

      await setDoc(doc(db, 'system', 'storage_cleanup'), payload, { merge: true });
      setLastStorageCleanup(payload);
      await scanReceiptStorage();
      showToast(`${targets.length}টি পুরনো receipt clean করা হয়েছে।`);
    } catch (error) {
      console.error(error);
      showToast('Cleanup ব্যর্থ হয়েছে।', 'error');
    } finally {
      setStorageCleanupRunning(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'storage' && userProfile?.isAdmin && !storageReport && !storageAuditLoading) {
      scanReceiptStorage();
    }
  }, [activeTab, storageAuditLoading, storageReport, userProfile]);

  const updateSettings = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextPricing = {
      premiumPrice: Number(formData.get('price')) || initialPricing.premiumPrice,
      bkashNumber: String(formData.get('bkash') || initialPricing.bkashNumber),
    };
    await setDoc(doc(db, 'system', 'pricing'), nextPricing, { merge: true });
    setPricing(nextPricing);
    showToast('Global pricing updated.');
  };

  const deleteCollection = async (collRef) => {
    const snap = await getDocs(collRef);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
  };

  const deleteUser = async (userId) => {
    if (!(await showConfirm({ message: "এই user profile database থেকে delete করতে চান?", danger: true }))) return;
    await deleteDoc(doc(db, 'users', userId));
  };

  const toggleGroupPlan = async (group) => {
    const nextPlan = group.plan === 'premium' ? 'free' : 'premium';
    if (!(await showConfirm({ message: "${group.name || 'এই mess'} কে ${nextPlan.toUpperCase()} plan-এ নিতে চান?", danger: true }))) return;
    await updateDoc(doc(db, 'groups', group.id), { plan: nextPlan });
    setSelectedGroup((prev) => (prev ? { ...prev, plan: nextPlan } : prev));
  };

  const startGroupFreeTrial = async (group) => {
    if (group.hasHadTrial) {
      showToast('এই mess আগে trial পেয়েছে।');
      return;
    }
    if (!(await showConfirm({ message: "${group.name || 'এই mess'}-এর জন্য 30 দিনের trial চালু করবেন?", danger: true }))) return;
    const payload = {
      plan: 'free',
      trialStartedAt: new Date().toISOString(),
      hasHadTrial: true,
    };
    await updateDoc(doc(db, 'groups', group.id), payload);
    setSelectedGroup((prev) => (prev ? { ...prev, ...payload } : prev));
  };

  const deleteGroup = async (groupId, groupName) => {
    if (!(await showConfirm({ message: `"${groupName || groupId}" mess-এর সব data delete হবে। চালিয়ে যাবেন?`, danger: true }))) return;

    const subCollections = ['members', 'bazar', 'meals', 'deposits', 'fines', 'polls', 'join_requests', 'bua_attendance', 'bill_tracking'];
    const settingsDocs = ['notice_config', 'mess_config', 'due_dates_config', 'weekly_menu', 'config'];

    try {
      for (const subCollection of subCollections) {
        await deleteCollection(collection(db, 'artifacts', groupId, 'public', 'data', subCollection));
      }

      const settingsBatch = writeBatch(db);
      settingsDocs.forEach((name) => settingsBatch.delete(doc(db, 'artifacts', groupId, 'public', 'data', 'settings', name)));
      await settingsBatch.commit();

      await deleteDoc(doc(db, 'artifacts', groupId, 'public', 'data'));
      await deleteDoc(doc(db, 'artifacts', groupId, 'public'));
      await deleteDoc(doc(db, 'artifacts', groupId));
      await deleteDoc(doc(db, 'groups', groupId));

      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }

      showToast('সফলভাবে ডিলিট হয়েছে!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Delete ব্যর্থ হয়েছে।', 'error');
    }
  };

  const approveRequest = async (request) => {
    if (!(await showConfirm({ message: "${request.email || request.name} এর premium request approve করবেন?", danger: true }))) return;

    if (request.groupId) {
      await updateDoc(doc(db, 'groups', request.groupId), { plan: 'premium' });
    } else if (request.uid) {
      await updateDoc(doc(db, 'users', request.uid), { plan: 'premium' });
    }

    await deleteDoc(doc(db, 'subscription_requests', request.id));

    if (request.email) {
      sendEmail(
        request.email,
        'Meal Manager - Premium Approved',
        `<div style="font-family:sans-serif;padding:20px;color:#111827">
          <h2 style="color:#059669">Premium plan approved</h2>
          <p>আপনার request approve করা হয়েছে। এখন dashboard-এ login করলে premium সুবিধা দেখতে পাবেন।</p>
          <p style="margin-top:20px"><a href="${window.location.origin}" style="background:#0f172a;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Open Meal Manager</a></p>
        </div>`,
      );
    }
  };

  const rejectRequest = async (request) => {
    if (!(await showConfirm({ message: "এই request reject করতে চান?", danger: true }))) return;

    await deleteDoc(doc(db, 'subscription_requests', request.id));

    if (request.email) {
      sendEmail(
        request.email,
        'Meal Manager - Request Rejected',
        `<div style="font-family:sans-serif;padding:20px;color:#111827">
          <h2 style="color:#dc2626">Payment request needs correction</h2>
          <p>আপনার পাঠানো payment info verify করা যায়নি। সঠিক TrxID দিয়ে আবার request পাঠান।</p>
          <p>TrxID: <strong>${request.trxId || 'N/A'}</strong></p>
        </div>`,
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-400" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_55%,#020617_100%)] text-white"
    >
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <nav className="sticky top-4 z-40 rounded-[2rem] border border-white/10 bg-slate-950/75 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-200 transition hover:bg-white/10">
                <ArrowLeft size={18} />
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">Control room</p>
                <h1 className="text-2xl font-black tracking-tight">Super Admin Panel</h1>
              </div>
            </div>

            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="User, email, mess name, slug..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
              />
            </div>
          </div>
        </nav>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label="Total users" value={users.length} tone="cyan" />
          <StatCard icon={UserCog} label="Active managers" value={totalManagers} tone="emerald" />
          <StatCard icon={BadgeDollarSign} label="Premium messes" value={premiumGroups} tone="amber" />
          <StatCard icon={Clock3} label="Pending requests" value={requests.length} tone="rose" />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">Global settings</p>
                <h2 className="text-2xl font-black">Pricing and payment</h2>
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
                Live config
              </div>
            </div>

            <form onSubmit={updateSettings} className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-200">Premium monthly price</span>
                <input
                  name="price"
                  type="number"
                  defaultValue={pricing.premiumPrice}
                  className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none focus:border-cyan-400"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-200">bKash number</span>
                <input
                  name="bkash"
                  type="text"
                  defaultValue={pricing.bkashNumber}
                  className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none focus:border-cyan-400"
                />
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950 transition hover:bg-cyan-300"
              >
                <CreditCard size={18} />
                Save settings
              </button>
            </form>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveTab('requests')}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === 'requests' ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                Subscription requests
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === 'users' ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === 'groups' ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                Messes
              </button>
              <button
                onClick={() => setActiveTab('storage')}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === 'storage' ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                Storage
              </button>
            </div>

            {activeTab === 'requests' && (
              <div className="mt-6 space-y-3">
                {requests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-8 text-center text-slate-400">
                    কোনো pending request নেই।
                  </div>
                ) : (
                  requests.map((request) => (
                    <div key={request.id} className="rounded-[1.5rem] border border-amber-300/15 bg-amber-300/10 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-black text-white">{request.name || 'Unknown user'}</p>
                          <p className="text-sm text-amber-100/80">{request.email || 'No email provided'}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-200">
                            <span className="rounded-full bg-slate-950/40 px-3 py-1">Mess: {request.groupName || 'Not linked'}</span>
                            <span className="rounded-full bg-slate-950/40 px-3 py-1">TrxID: {request.trxId || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => rejectRequest(request)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-400/20"
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                          <button
                            onClick={() => approveRequest(request)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-300"
                          >
                            <CheckCircle2 size={16} />
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="mt-6 space-y-3">
                {searchedUsers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-8 text-center text-slate-400">
                    কোনো user match করেনি।
                  </div>
                ) : (
                  searchedUsers.map((user) => {
                    const isManager = groupOwnerMap.has(user.id);
                    return (
                      <div key={user.id} className="flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-black text-white">{user.displayName || 'Unnamed user'}</p>
                          <p className="truncate text-sm text-slate-300">{user.email || 'No email'}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {user.isAdmin && <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-cyan-200">Admin</span>}
                            {isManager && <span className="rounded-full bg-amber-400/15 px-3 py-1 text-amber-200">Manager</span>}
                            {!user.isAdmin && !isManager && <span className="rounded-full bg-slate-700 px-3 py-1 text-slate-200">Member</span>}
                          </div>
                        </div>
                        {!user.isAdmin && (
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-400/20"
                          >
                            <Trash2 size={16} />
                            Delete profile
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'groups' && (
              <div className="mt-6 space-y-3">
                {searchedGroups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-8 text-center text-slate-400">
                    কোনো mess match করেনি।
                  </div>
                ) : (
                  searchedGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group)}
                      className="flex w-full flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-4 text-left transition hover:border-cyan-400/40 hover:bg-slate-950/50 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-black text-white">{group.name || 'Untitled mess'}</p>
                        <p className="text-sm text-slate-300">{group.ownerEmail || 'Owner email নেই'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-700 px-3 py-1 text-slate-100">{group.memberUids?.length || 0} members</span>
                        <span className={`rounded-full px-3 py-1 ${group.plan === 'premium' ? 'bg-amber-400/15 text-amber-200' : 'bg-emerald-400/15 text-emerald-200'}`}>
                          {group.plan || 'free'}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {activeTab === 'storage' && (
              <div className="mt-6 space-y-4">
                <div className="rounded-[1.5rem] border border-cyan-300/10 bg-slate-950/30 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">Receipt cleanup</p>
                      <h3 className="mt-2 text-2xl font-black text-white">২ মাসের বেশি পুরনো রসিদ</h3>
                      <p className="mt-2 text-sm text-slate-300">
                        সব mess একসাথে scan হবে। পুরনো bazar receipt আর pending request receipt-এর `photo` field clean করে storage হালকা রাখা যাবে।
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        Retention policy: {RECEIPT_RETENTION_DAYS} দিন
                        {storageReport?.generatedAt ? ` • last scan ${formatShortDate(storageReport.generatedAt)}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={scanReceiptStorage}
                        disabled={storageAuditLoading || storageCleanupRunning}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Search size={16} />
                        {storageAuditLoading ? 'Scanning...' : 'Scan now'}
                      </button>
                      <button
                        onClick={() => cleanupOldReceipts()}
                        disabled={storageAuditLoading || storageCleanupRunning || !storageReport?.expiredReceipts}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 size={16} />
                        {storageCleanupRunning ? 'Cleaning...' : 'Clean all expired receipts'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard icon={Users} label="Messes with receipts" value={storageReport?.groups?.length || 0} tone="cyan" />
                  <StatCard icon={ShieldCheck} label="Receipt docs" value={storageReport?.totalReceipts || 0} tone="emerald" />
                  <StatCard icon={AlertTriangle} label="Expired receipts" value={storageReport?.expiredReceipts || 0} tone="rose" />
                  <StatCard icon={BadgeDollarSign} label="Reclaimable" value={formatStorageMb(storageReport?.expiredBytes || 0)} tone="amber" />
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-4 text-sm text-slate-300">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p>Current receipt storage estimate: <span className="font-black text-white">{formatStorageMb(storageReport?.totalBytes || 0)}</span></p>
                    <p>Older than 2 months: <span className="font-black text-rose-200">{formatStorageMb(storageReport?.expiredBytes || 0)}</span></p>
                  </div>
                  {lastStorageCleanup?.lastRunAt && (
                    <p className="mt-3 text-xs text-slate-400">
                      Last cleanup: {formatShortDate(lastStorageCleanup.lastRunAt)} • {lastStorageCleanup.lastRunReceiptCount || 0} receipts • {formatStorageMb(lastStorageCleanup.lastRunBytes || 0)}
                    </p>
                  )}
                </div>

                {storageAuditLoading && (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-8 text-center text-slate-400">
                    Storage audit চলছে...
                  </div>
                )}

                {!storageAuditLoading && storageReport && storageReport.groups.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-8 text-center text-slate-400">
                    কোনো receipt photo পাওয়া যায়নি।
                  </div>
                )}

                {!storageAuditLoading && storageReport && storageReport.groups.length > 0 && (
                  <div className="space-y-3">
                    {storageReport.groups.map((group) => (
                      <div key={group.groupId} className="rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <p className="font-black text-white">{group.groupName}</p>
                            <p className="truncate text-sm text-slate-300">{group.ownerEmail || 'Owner email নেই'}</p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-200">Total receipt: {group.totalReceipts}</span>
                              <span className="rounded-full bg-rose-400/10 px-3 py-1 text-rose-200">Expired: {group.expiredReceipts}</span>
                              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-200">Approved: {group.approvedReceipts}</span>
                              <span className="rounded-full bg-amber-400/10 px-3 py-1 text-amber-200">Pending: {group.pendingReceipts}</span>
                              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-cyan-200">Storage: {formatStorageMb(group.totalBytes)}</span>
                            </div>
                            <div className="mt-3 text-xs text-slate-400">
                              {group.expiredReceipts > 0 ? (
                                <span>
                                  Oldest expired: {formatShortDate(group.oldestExpiredAt)} • Latest expired: {formatShortDate(group.newestExpiredAt)} • Can clean {formatStorageMb(group.expiredBytes)}
                                </span>
                              ) : (
                                <span>এই mess-এ এখনো ২ মাসের বেশি পুরনো কোনো receipt নেই।</span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => cleanupOldReceipts(group.groupId)}
                            disabled={storageCleanupRunning || group.expiredReceipts === 0}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                            Clean this mess
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedGroup && (
        <div className="fixed inset-0 z-50 bg-black/75 p-4 backdrop-blur-sm" onClick={() => setSelectedGroup(null)}>
          <div
            className="mx-auto mt-10 max-w-xl rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/60"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">Mess details</p>
                <h3 className="mt-2 text-3xl font-black text-white">{selectedGroup.name || 'Untitled mess'}</h3>
                <p className="mt-2 text-sm text-slate-300">{selectedGroup.ownerEmail || 'Owner email not available'}</p>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300 transition hover:bg-white/10">
                <XCircle size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Plan</p>
                <p className="mt-2 text-2xl font-black text-white">{selectedGroup.plan || 'free'}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Members</p>
                <p className="mt-2 text-2xl font-black text-white">{selectedGroup.memberUids?.length || 0}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <button
                onClick={() => toggleGroupPlan(selectedGroup)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950 transition hover:bg-cyan-300"
              >
                <ShieldCheck size={18} />
                {selectedGroup.plan === 'premium' ? 'Demote to free' : 'Give premium'}
              </button>

              {!selectedGroup.hasHadTrial && selectedGroup.plan !== 'premium' && (
                <button
                  onClick={() => startGroupFreeTrial(selectedGroup)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-5 py-3 font-bold text-emerald-200 transition hover:bg-emerald-400/20"
                >
                  <Clock3 size={18} />
                  Start 30 day trial
                </button>
              )}

              <button
                onClick={() => deleteGroup(selectedGroup.id, selectedGroup.name)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-5 py-3 font-bold text-rose-200 transition hover:bg-rose-400/20"
              >
                <AlertTriangle size={18} />
                Delete this mess completely
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
