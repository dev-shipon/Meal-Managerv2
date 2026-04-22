import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Users, UserCog, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchResolvedGroup } from '../utils/groupLookup';
import { useToast } from '../contexts/ToastContext';
import './Login.css';

const LOGIN_MODES = {
  member: {
    label: 'মেম্বার লগইন',
    title: 'মেম্বার হিসেবে লগইন করুন',
    description: 'নিজের মিল, জমা, বাকি আর মাসশেষের হিসাব সহজে দেখার জন্য লগইন করুন।',
    hint: 'মেম্বার লগইন',
    badge: 'মেম্বার',
    icon: Users,
    gradient: 'from-blue-600 to-indigo-600'
  },
  manager: {
    label: 'ম্যানেজার লগইন',
    title: 'ম্যানেজার হিসেবে লগইন করুন',
    description: 'মেস খুলবেন, সদস্য যোগ করবেন, হিসাব চালাবেন এবং মাসশেষের ক্লোজিং দেখবেন।',
    hint: 'ম্যানেজার লগইন',
    badge: 'ম্যানেজার',
    icon: UserCog,
    gradient: 'from-indigo-600 to-violet-600'
  },
};

export default function Login() {
  const { loginWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [mode, setMode] = React.useState('member');

  React.useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      showToast('লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    }
  };

  const [searchMessId, setSearchMessId] = React.useState('');
  const [step, setStep] = React.useState(1); // 1: Search, 2: Found/Login, 3: Not Found
  const [foundMessName, setFoundMessName] = React.useState('');
  const [resolvedGroupId, setResolvedGroupId] = React.useState('');

  const handleFindMess = async (e) => {
    e.preventDefault();
    if (!searchMessId.trim()) { showToast('মেস আইডি দিন', 'warning'); return; }

    try {
      const res = await fetchResolvedGroup(searchMessId);
      if (res.found) {
        setFoundMessName(res.data.name || 'এই মেস');
        setResolvedGroupId(res.id);
        setStep(2);
      } else {
        setResolvedGroupId('');
        setStep(3);
      }
    } catch (err) {
      console.error(err);
      setResolvedGroupId('');
      setStep(3);
    }
  };

  const handleBackToSearch = () => {
    setStep(1);
    setSearchMessId('');
    setResolvedGroupId('');
  };

  const activeMode = LOGIN_MODES[mode];
  const ActiveIcon = activeMode.icon;

  return (
    <div className="login-container-wrapper">
      <div className="login-shell">
        <div className="login-brand-panel">
          <div className="login-brand-badge">
            <img src="/favicon.png" alt="Logo" className="w-5 h-5 rounded-md" />
            <span>মিল ম্যানেজার</span>
          </div>
          <h1>মেস হিসাবের জন্য পরিষ্কার আর সহজ লগইন</h1>
          <p>
            এখানে আলাদা করে বোঝানো আছে কোনটা ম্যানেজারের জন্য আর কোনটা মেম্বারের জন্য, যাতে sign in করার সময় আর confusion না
            থাকে।
          </p>
          <div className="login-role-preview">
            <div className="login-role-card">
              <span className="login-role-card-label">ম্যানেজার</span>
              <p>গ্রুপ খুলবেন, সদস্য ম্যানেজ করবেন, হিসাব চালাবেন</p>
            </div>
            <div className="login-role-card">
              <span className="login-role-card-label">মেম্বার</span>
              <p>নিজের মিল, জমা, বাকি আর মাসশেষের হিসাব দেখবেন</p>
            </div>
          </div>
        </div>

        <div className="login-container">
          {/* Old toggle location removed */}

          <div className="login-role-indicator">
            <span className="login-role-pill">{activeMode.hint}</span>
          </div>

          <div className="login-heading-row">
            <div className="login-heading-icon">
              <ActiveIcon size={22} />
            </div>
            <div>
              <div className="login-heading">{activeMode.title}</div>
              <div className="login-subheading">{activeMode.description}</div>
            </div>
          </div>

          {mode === 'manager' ? (
            <div className="social-account-container">
              <span className="title">আপনার Google অ্যাকাউন্ট দিয়ে চালিয়ে যান</span>
              <button 
                type="button" 
                onClick={handleGoogleLogin} 
                className={`google-login-button ${mode}`} 
                title={activeMode.label}
              >
                <span className="google-login-icon">
                  <svg className="svg" xmlns="http://www.w3.org/2000/svg" height="1.35em" viewBox="0 0 488 512">
                    <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
                  </svg>
                </span>
                <span>{activeMode.label} চালিয়ে যান</span>
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <div className="member-flow-container">
              {step === 1 && (
                <div className="login-id-search-section">
                  <form onSubmit={handleFindMess} className="login-id-form">
                    <span className="title">আপনার মেস আইডিটি লিখুন</span>
                    <div className="login-id-input-group">
                      <input 
                        type="text" 
                        placeholder="মেস আইডি (যেমন: m-123)" 
                        value={searchMessId}
                        onChange={e => setSearchMessId(e.target.value)}
                        className="login-id-input"
                        autoFocus
                      />
                      <button type="submit" className="login-id-submit">
                        অনুসন্ধান করুন
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium italic">ম্যানেজারের কাছ থেকে আইডি সংগ্রহ করুন</p>
                  </form>
                </div>
              )}

              {step === 2 && (
                <div className="social-account-container found-mess animate-in fade-in slide-in-from-bottom-2">
                  <div className="found-mess-badge mb-4">
                    <CheckCircle className="text-emerald-500" size={32} />
                    <div>
                      <h4 className="font-black text-slate-800 text-sm">মেস পাওয়া গেছে!</h4>
                      <p className="text-[12px] text-slate-500 font-bold">{foundMessName}</p>
                    </div>
                  </div>
                  <span className="title">এখন Google দিয়ে লগইন সম্পন্ন করুন</span>
                  <button 
                    type="button" 
                    onClick={() => navigate(`/join/${resolvedGroupId}`)} 
                    className={`google-login-button ${mode}`}
                  >
                    <span className="google-login-icon">
                      <svg className="svg" xmlns="http://www.w3.org/2000/svg" height="1.35em" viewBox="0 0 488 512">
                        <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
                      </svg>
                    </span>
                    <span>সদস্য হিসেবে এগিয়ে যান</span>
                    <ArrowRight size={18} />
                  </button>
                  <button onClick={handleBackToSearch} className="text-[12px] font-bold text-slate-400 hover:text-indigo-600 mt-4 underline">ভুল আইডি? আবার খুঁজুন</button>
                </div>
              )}

              {step === 3 && (
                <div className="error-mess-container animate-in zoom-in-95">
                  <div className="error-icon-wrapper mb-6">
                    <div className="error-pulse"></div>
                    <XCircle className="text-rose-500 relative z-10" size={64} />
                  </div>
                  <h4 className="font-black text-slate-800 text-xl">মেস খুঁজে পাওয়া যায়নি!</h4>
                  <p className="text-sm text-slate-400 font-medium mt-2 mb-8 leading-relaxed">
                    আপনার দেওয়া <span className="text-rose-600 font-black">"{searchMessId}"</span> আইডিটি আমাদের ডাটাবেসে নেই। সঠিক আইডির জন্য ম্যানেজারের সাথে যোগাযোগ করুন।
                  </p>
                  <div className="flex flex-col gap-3 w-full">
                    <button onClick={handleBackToSearch} className="w-full p-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition transform-gpu active:scale-95">আবার চেষ্টা করুন</button>
                    <button onClick={() => navigate('/')} className="w-full p-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">হোমে ফিরে যান</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="login-mode-switch-section">
            <span className="section-label">লগইন মোড পরিবর্তন করুন</span>
            <div className="login-mode-toggle large" role="tablist">
              <button
                type="button"
                className={mode === 'member' ? 'active member' : ''}
                onClick={() => setMode('member')}
              >
                মেম্বার লগইন
              </button>
              <button
                type="button"
                className={mode === 'manager' ? 'active manager' : ''}
                onClick={() => setMode('manager')}
              >
                ম্যানেজার লগইন
              </button>
            </div>
          </div>

          <div className="login-help-box">
            <span className="login-help-label">নোট</span>
            <p>
              {mode === 'manager'
                ? 'আপনি যদি মেস পরিচালনা করেন, তাহলে এই লগইন দিয়ে ড্যাশবোর্ডে গিয়ে গ্রুপ তৈরি বা পরিচালনা করতে পারবেন।'
                : 'আপনি যদি সদস্য হন, তাহলে এই লগইন দিয়ে গ্রুপে যুক্ত হয়ে নিজের হিসাব সহজে দেখতে পারবেন।'}
            </p>
          </div>

          <div className="agreement">
            <Link to="/">হোমে ফিরুন</Link>
            <Link to="/privacy">গোপনীয়তা নীতি</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
