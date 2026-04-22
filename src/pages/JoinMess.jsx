import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/db';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { fetchResolvedGroup } from '../utils/groupLookup';
import { ShieldCheck, UserPlus, Phone, CheckCircle, User } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import Loader, { SmoothLoader } from '../components/Loader';
import { motion } from 'framer-motion';
import './Login.css';
import { MEMBER_NAME_MAX_LENGTH, clampMemberName } from '../constants/memberLimits';

export default function JoinMess() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { currentUser, loginWithGoogle } = useAuth();
  
  const { showToast } = useToast();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customName, setCustomName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [canonicalGroupId, setCanonicalGroupId] = useState('');

  useEffect(() => {
    if (currentUser && !customName) {
      setCustomName(clampMemberName(currentUser.displayName || ''));
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await fetchResolvedGroup(groupId);
        if (res.found) {
          setGroup(res.data);
          setCanonicalGroupId(res.id);
        } else {
          setGroup({ name: 'Unrecognized Group' });
          setCanonicalGroupId('');
        }
      } catch (e) {
        console.error("fetch group error", e);
        setGroup({ name: "এই মেসে" });
        setCanonicalGroupId('');
      }
      setLoading(false);
    };
    fetchGroup();
  }, [groupId]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      await loginWithGoogle();
      return;
    }
    
    if (!phone || phone.length < 11) {
      { showToast("অনুগ্রহ করে সঠিক মোবাইল নম্বর দিন।", "warning"); return; }
    }
    const joinName = clampMemberName(customName);
    if (!joinName) {
      { showToast("অনুগ্রহ করে আপনার নাম দিন।", "warning"); return; }
    }

    const gid = canonicalGroupId || groupId;
    if (!gid) {
      return showToast('মেস আইডি সঠিক নয়। লিংক বা আইডি আবার চেক করুন।');
    }

    try {
      const requestRef = doc(db, `artifacts/${gid}/public/data/join_requests`, currentUser.uid);
      await setDoc(requestRef, {
        uid: currentUser.uid,
        email: currentUser.email,
        name: joinName,
        phone: phone,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      showToast("রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।", "error");
    }
  };

  if (loading) return <SmoothLoader show={loading} text="গ্রুপের তথ্য লোড হচ্ছে..." />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4text-center">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-rose-100 max-w-sm w-full">
           <h2 className="text-xl font-black text-rose-500 mb-2">ত্রুটি!</h2>
           <p className="text-slate-600 font-medium mb-6">{error}</p>
           <button onClick={() => navigate('/')} className="w-full bg-slate-100 text-slate-700 font-bold p-3 rounded-xl">হোম পেজে যান</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-emerald-100 max-w-sm w-full animate-in zoom-in-95">
           <CheckCircle size={64} className="text-emerald-500 mx-auto mb-4" />
           <h2 className="text-xl font-black text-slate-800 mb-2">রিকোয়েস্ট পাঠানো হয়েছে!</h2>
           <p className="text-slate-600 font-medium mb-6 text-sm">মেসের ম্যানেজার আপনার রিকোয়েস্টটি অ্যাপ্রুভ করলে আপনি ড্যাশবোর্ডে গ্রুপটি দেখতে পাবেন।</p>
           <button onClick={() => navigate('/dashboard')} className="w-full bg-emerald-50 text-emerald-600 font-bold p-3 rounded-xl hover:bg-emerald-100 transition transform-gpu">ড্যাশবোর্ডে ফিরে যান</button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: 20 }} 
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center"
    >
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <ShieldCheck size={48} className="text-indigo-600 mx-auto mb-4" />
          <h1 className="text-2xl font-black tracking-tight text-slate-800">মেসে যুক্ত হোন</h1>
          <p className="text-slate-500 font-medium mt-1">আপনি <b>{group.name}</b> মেসে যুক্ত হওয়ার জন্য ইনভাইটেশন পেয়েছেন।</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 p-8">
           {!currentUser ? (
             <div className="text-center">
               <div className="social-account-container" style={{ marginTop: '10px', marginBottom: '10px' }}>
                   <span className="title" style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '20px', color: '#666' }}>মেসে যুক্ত হতে প্রথমে লগইন করুন</span>
                   <div className="social-accounts">
                     <button type="button" onClick={loginWithGoogle} className="social-button google" title="Sign in with Google" style={{ width: '60px', height: '60px', borderRadius: '50%' }}>
                       <svg className="svg" xmlns="http://www.w3.org/2000/svg" height="1.8em" viewBox="0 0 488 512">
                         <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                       </svg>
                     </button>
                   </div>
                 </div>
             </div>
           ) : (
             <form onSubmit={handleJoin} className="space-y-4">
               <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-3 mb-6">
                 <img src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`} alt={`${currentUser.displayName}'s Avatar`} className="w-10 h-10 rounded-full" />
                 <div>
                   <p className="font-bold text-indigo-900">{currentUser.displayName}</p>
                   <p className="text-xs text-indigo-600 font-medium">{currentUser.email}</p>
                 </div>
               </div>
               
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex flex-wrap items-center gap-x-1 gap-y-0.5"><User size={14}/> আপনার নাম <span className="font-semibold normal-case text-slate-400">(সর্বোচ্চ {MEMBER_NAME_MAX_LENGTH} অক্ষর)</span></label>
                 <input 
                   type="text" 
                   value={customName} 
                   maxLength={MEMBER_NAME_MAX_LENGTH}
                   onChange={e => setCustomName(e.target.value.slice(0, MEMBER_NAME_MAX_LENGTH))} 
                   placeholder="আপনার নাম" 
                   className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition transform-gpu-all transform-gpu"
                   required
                 />
                 <p className="text-[10px] text-slate-400 mt-1 font-medium text-right">{customName.length}/{MEMBER_NAME_MAX_LENGTH}</p>
                 <label className="block text-xs font-bold text-slate-500 uppercase mt-4 mb-2 flex items-center gap-1"><Phone size={14}/> আপনার মোবাইল নম্বর</label>
                 <input 
                   type="tel" 
                   value={phone} 
                   onChange={e => setPhone(e.target.value)} 
                   placeholder="01XXXXXXXXX" 
                   className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition transform-gpu-all transform-gpu"
                   required
                 />
                 <p className="text-[10px] text-slate-400 mt-2 font-medium">ম্যানেজার আপনার পেমেন্ট বা অন্যান্য প্রয়োজনে এই নম্বরে যোগাযোগ করতে পারেন।</p>
               </div>
               <button type="submit" className="w-full bg-indigo-600 text-white font-black p-4 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition transform-gpu-all transform-gpu text-sm flex justify-center items-center gap-2 mt-4">
                 <CheckCircle size={18}/> রিকোয়েস্ট পাঠান
               </button>
             </form>
           )}
        </div>
      </div>
    </motion.div>
  );
}
