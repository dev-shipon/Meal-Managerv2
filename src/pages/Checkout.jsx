import React, { useState } from 'react';
import { useToast, useConfirm } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/db';
import { addDoc, collection, doc, getDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { CheckCircle, AlertTriangle, Copy, Check, ClipboardPaste, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { sendEmail } from '../services/emailService';

export default function Checkout() {
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [trxId, setTrxId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [price, setPrice] = useState(299);
  const [bkashNumber, setBkashNumber] = useState('01700000000');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(bkashNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTrxId(text);
    } catch(err) {
      showToast("অনুগ্রহ করে আপনার কিবোর্ড থেকে Long Press করে বা Ctrl+V চেপে Paste করুন।", "warning");
    }
  };

  const [pendingReq, setPendingReq] = useState(null);
  const [checking, setChecking] = useState(true);

  React.useEffect(() => {
    const fetchPrice = async () => {
      try {
        const snap = await getDoc(doc(db, 'system', 'pricing'));
        if (snap.exists()) {
           const d = snap.data();
           setPrice(d.premiumPrice || 299);
           setBkashNumber(d.bkashNumber || '01700000000');
        }
      } catch (e) {
        console.error(e);
      }
    };
    
    const checkPending = async () => {
      try {
        const q = query(collection(db, 'subscription_requests'), where('uid', '==', currentUser.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setPendingReq({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setChecking(false);
      }
    };
    
    fetchPrice();
    checkPending();
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trxId.trim() || trxId.length < 8) return;

    try {
      // Find the group owned by this user
      const q = query(collection(db, 'groups'), where('ownerId', '==', currentUser.uid));
      const snap = await getDocs(q);
      
      let groupId = 'unknown';
      let groupName = 'Unknown Mess';
      if (!snap.empty) {
         groupId = snap.docs[0].id;
         groupName = snap.docs[0].data().name || 'Unknown Mess';
      } else {
         showToast("দুঃখিত, আপনার কোনো মেস নেই। আগে একটি মেস তৈরি করুন।", "warning");
         return;
      }

      await addDoc(collection(db, 'subscription_requests'), {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.displayName,
        groupId: groupId,
        groupName: groupName,
        trxId: trxId.trim(),
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      setSubmitted(true);
      
      // Email Notification
      if (currentUser.email) {
        sendEmail(
          currentUser.email,
          'Meal Manager - Payment Request Received',
          `<div style="font-family:sans-serif; padding: 20px; color:#333;">
             <h2 style="color:#0ea5e9;">রিকোয়েস্ট গৃহীত হয়েছে</h2>
             <p>প্রিয় ${currentUser.displayName || 'গ্রাহক'},</p>
             <p>আমরা আপনার পেমেন্ট রিকোয়েস্ট (TrxID: <strong>${trxId.trim()}</strong>) পেয়েছি।</p>
             <p>পেমেন্টটি ভেরিফাই হলে আপনাকে পরবর্তীতে একটি কনফার্মেশন মেইল পাঠানো হবে। ধন্যবাদ!</p>
             <div style="margin: 25px 0;">
               <a href="${window.location.origin}" style="display:inline-block; padding:12px 24px; background-color:#4f46e5; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:bold;">Login to Dashboard</a>
             </div>
             <hr style="border:1px solid #eee; margin: 20px 0;" />
             <p style="font-size:12px; color:#999;">Meal Manager Team</p>
           </div>`
        );
      }
    } catch (err) {
      console.error(err);
      showToast("রিকুয়েস্ট পাঠাতে সমস্যা হয়েছে।", "warning");
    }
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full"></div></div>;

  if (pendingReq) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 md:p-10 rounded-[2rem] text-center max-w-sm shadow-2xl shadow-sky-200/50 border border-sky-100 animate-in zoom-in-95">
          <div className="w-20 h-20 bg-sky-100 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Clock size={40} className="stroke-[3]" />
          </div>
          <h2 className="text-xl font-black text-sky-950 mb-3 tracking-tight">পেমেন্ট রিকুয়েস্ট পেন্ডিং!</h2>
          <p className="text-slate-600 mb-4 font-medium text-sm leading-relaxed">
            আপনার আগের একটি পেমেন্ট রিকোয়েস্ট (TrxID: <strong className="font-mono text-sky-600">{pendingReq.trxId}</strong>) ভেরিফিকেশনের জন্য প্রসেসিংয়ে আছে।
          </p>
          <div className="flex flex-col gap-3 mt-6">
            <button onClick={() => navigate('/dashboard')} className="w-full bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold p-3.5 rounded-xl transition-colors transform-gpu flex justify-center items-center gap-2">
              ড্যাশবোর্ডে ফিরে যান
            </button>
            <button 
              onClick={async () => {
                 if (await showConfirm({ message: "আপনি কি পূর্বের পেমেন্ট তথ্য মুছে নতুন করে ফর্ম পূরণ করতে চান?" })) {
                   setChecking(true);
                   await deleteDoc(doc(db, 'subscription_requests', pendingReq.id));
                   setPendingReq(null);
                   setChecking(false);
                 }
              }} 
              className="w-full bg-white border border-rose-200 hover:bg-rose-50 text-rose-500 font-bold p-3.5 rounded-xl transition-colors transform-gpu flex justify-center items-center gap-2 text-xs"
            >
              পেমেন্ট তথ্য ভুল হলে নতুন করে করুন
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 md:p-10 rounded-[2rem] text-center max-w-sm shadow-2xl shadow-emerald-200/50 border border-emerald-100 animate-in zoom-in-95">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle size={40} className="stroke-[3]" />
          </div>
          <h2 className="text-2xl font-black text-emerald-950 mb-3 tracking-tight">পেমেন্ট রিকুয়েস্ট সফল!</h2>
          <p className="text-slate-600 mb-6 font-medium text-sm leading-relaxed">
            আপনার পেমেন্টটি ভেরিফাই করে আগামী <span className="font-black text-rose-500">৬ ঘণ্টার মধ্যে</span> মেসেজ অথবা ইমেইলের মাধ্যমে কনফার্ম করা হবে এবং আপনার মেসের প্রিমিয়াম প্যাক এক্টিভেট করে দেওয়া হবে।
          </p>
          
          <div className="flex flex-col gap-3">
            <a 
              href={`https://wa.me/88${bkashNumber}?text=হ্যালো, আমি পেমেন্ট করেছি। আমার TrxID: ${trxId}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] text-white font-black p-3.5 rounded-xl shadow-lg shadow-[#25D366]/30 hover:bg-[#20bd5a] active:scale-95 transition transform-gpu-all flex justify-center items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg> 
              জরুরী প্রয়োজনে WhatsApp
            </a>
            <button onClick={() => navigate('/dashboard')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-3.5 rounded-xl transition-colors transform-gpu flex justify-center items-center gap-2">
              ড্যাশবোর্ডে ফিরে যান
            </button>
          </div>
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
      className="min-h-screen bg-slate-50 py-12 px-4"
    >
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800 font-bold mb-6 flex items-center gap-1">&larr; ফিরে যান</button>
        
        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-gradient-to-r from-pink-600 to-rose-600 p-8 text-center text-white">
            <h2 className="text-3xl font-black mb-2 tracking-tight flex items-center justify-center gap-3">bKash <span className="text-pink-300 font-light translate-y-[-2px]">|</span> Nagad</h2>
            <p className="opacity-90 font-medium">প্রিমিয়াম প্ল্যান - {price} টাকা / মাস</p>
          </div>
          
          <div className="p-8">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl mb-6 flex gap-3 text-sm">
              <AlertTriangle size={24} className="shrink-0 text-amber-500" />
              <p>অনুগ্রহ করে নিচের <b>Personal</b> নাম্বারে <b>{price} টাকা Send Money</b> করুন এবং ট্রানজেকশন আইডি (TrxID) নিচে দিন।</p>
            </div>

            <div className="text-center bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 mb-8 relative group">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">বিকাশ / নগদ পার্সোনাল নম্বর</p>
              <div className="flex items-center justify-center gap-3">
                 <p className="text-2xl font-black tracking-widest text-slate-800 selection:bg-pink-200">{bkashNumber}</p>
                 <button type="button" onClick={handleCopy} className="p-2.5 bg-white border border-slate-200 shadow-sm hover:shadow-md rounded-xl text-slate-600 transition-all hover:bg-slate-100 hover:text-pink-600" title="Copy Number">
                   {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                 </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">TrxID (ট্রানজেকশন আইডি)</label>
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    value={trxId} 
                    onChange={e => setTrxId(e.target.value)} 
                    placeholder="e.g. 7A1B2C3D4E" 
                    className="w-full p-4 pl-4 pr-24 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-bold tracking-widest outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition transform-gpu-all transform-gpu uppercase"
                    required
                  />
                  <button type="button" onClick={handlePaste} className="absolute right-2 p-2 bg-white border border-slate-200 hover:bg-slate-100 hover:text-pink-600 shadow-sm border rounded-xl text-slate-600 flex items-center gap-1.5 text-[10px] font-black uppercase transition-all">
                     <ClipboardPaste size={14}/> Paste
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-pink-600 text-white font-black p-4 rounded-xl shadow-lg shadow-pink-200 hover:bg-pink-700 active:scale-95 transition transform-gpu-all transform-gpu text-lg"
              >
                পেমেন্ট ভেরিফাই করুন
              </button>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
