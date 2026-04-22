import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, useConfirm } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/db';
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { writeJoinKeyIndex, JOIN_KEY_INDEX } from '../utils/groupLookup';
import { Plus, Users, Crown, CreditCard, LogOut, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { SmoothLoader } from '../components/Loader';

export default function Dashboard() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');

  const ensureMemberRecord = async (groupId, groupData = {}) => {
    if (!currentUser?.uid) return;

    const membersRef = collection(db, 'artifacts', groupId, 'public', 'data', 'members');
    const existingMemberSnap = await getDocs(
      query(membersRef, where('uid', '==', currentUser.uid))
    );

    if (!existingMemberSnap.empty) return;

    await addDoc(membersRef, {
      name: currentUser.displayName || 'মেম্বার',
      phone: '',
      email: currentUser.email || '',
      uid: currentUser.uid,
      isManagerTag: groupData.ownerId === currentUser.uid,
      createdAt: new Date().toISOString()
    });
  };

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchGroups = async () => {
      setLoadingGroups(true);
      try {
        let allGroups = [];
        
        if (userProfile?.isAdmin) {
            // Admin sees all groups in the system
            const snap = await getDocs(collection(db, 'groups'));
            allGroups = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            // Normal user sees only their groups
            const qOwner = query(collection(db, 'groups'), where('ownerId', '==', currentUser.uid));
            const qMember = query(collection(db, 'groups'), where('memberUids', 'array-contains', currentUser.uid));
            
            const [snap1, snap2] = await Promise.all([getDocs(qOwner), getDocs(qMember)]);
            
            const seen = new Set();
            [...snap1.docs, ...snap2.docs].forEach(doc => {
               if (!seen.has(doc.id)) {
                 seen.add(doc.id);
                 allGroups.push({ id: doc.id, ...doc.data() });
               }
            });
            
            // Check if invited via email
            if (currentUser.email) {
               const snapInvited = await getDocs(query(collection(db, 'groups'), where('invitedEmails', 'array-contains', currentUser.email)));
               for (const docSnap of snapInvited.docs) {
                  if (!seen.has(docSnap.id)) {
                     seen.add(docSnap.id);
                     allGroups.push({ id: docSnap.id, ...docSnap.data() });
                     await updateDoc(docSnap.ref, {
                         memberUids: arrayUnion(currentUser.uid)
                     }).catch(e => console.error("Auto-join error:", e));
                     await ensureMemberRecord(docSnap.id, docSnap.data()).catch(e => console.error("Auto member create error:", e));
                  }
               }
            }
        }
        
        setGroups(allGroups);
        
        if (!userProfile?.isAdmin) {
          if (allGroups.length >= 1) {
             const g = allGroups[0];
             const slug = g.slug || g.id;
             navigate(`/app/${slug}--${g.id}`);
             return;
          }
        }
      } catch (err) {
        console.error("Error fetching groups:", err);
      }
      setLoadingGroups(false);
    };

    fetchGroups();
  }, [currentUser, userProfile, navigate]);

  const makeSlug = (name) => name.trim().toLowerCase().replace(/[^a-z0-9ঀ-৿]+/g, '-').replace(/^-|-$/g, '') || 'mess';

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    if (groups.length >= 1) {
      alert('বর্তমানে একটি অ্যাকাউন্ট ব্যবহার করে শুধুমাত্র একটি মেস বা গ্রুপ পরিচালনা করা যায়।');
      return;
    }

    try {
      const slug = makeSlug(newGroupName);
      const docRef = await addDoc(collection(db, 'groups'), {
        name: newGroupName,
        slug,
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email || '',
        memberUids: [currentUser.uid],
        managers: [currentUser.uid],
        createdAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'groups', docRef.id), { joinLookupKey: docRef.id.toLowerCase() });
      await writeJoinKeyIndex(docRef.id);
      
      // Add the creator as the first member in the mess data
      await addDoc(collection(db, 'artifacts', docRef.id, 'public', 'data', 'members'), {
        name: currentUser.displayName || 'ম্যানেজার',
        phone: '',
        email: currentUser.email || '',
        uid: currentUser.uid,
        isManagerTag: true,
        createdAt: new Date().toISOString()
      });
      
      if (!userProfile?.isAdmin) {
         navigate(`/app/${slug}--${docRef.id}`);
      } else {
         setGroups([...groups, { id: docRef.id, name: newGroupName, ownerId: currentUser.uid }]);
         setShowCreateModal(false);
         setNewGroupName('');
      }
    } catch (e) {
      console.error("Error adding document: ", e);
      alert(`গ্রুপ তৈরি করতে সমস্যা হয়েছে: ${e.message}`);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!(await showConfirm({ message: "আপনি কি নিশ্চিত যে এই মেসটি ডাটাবেস থেকে সম্পূর্ণ ডিলিট করতে চান? এটি আর ফিরিয়ে আনা সম্ভব নয়!", danger: true }))) return;
    try {
      await deleteDoc(doc(db, 'groups', groupId));
      try {
        await deleteDoc(doc(db, JOIN_KEY_INDEX, groupId.toLowerCase()));
      } catch {
        /* index may be missing or rules differ */
      }
      setGroups(groups.filter(g => g.id !== groupId));
    } catch (e) {
      alert("ডিলিট করতে সমস্যা হয়েছে: " + e.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleMemberRequest = () => {
    const cleanedPhone = managerPhone.replace(/\D/g, '');
    if (!cleanedPhone || cleanedPhone.length < 11) {
      alert('ম্যানেজারের সঠিক মোবাইল নাম্বার দিন।');
      return;
    }

    const requesterName = currentUser?.displayName || 'একজন সদস্য';
    const requesterEmail = currentUser?.email || 'ইমেইল দেওয়া নেই';
    const text = `আসসালামু আলাইকুম, আমি ${requesterName}।

আমি আপনার মেসে যুক্ত হয়ে নিজের মিল ও হিসাব দেখতে চাই।
আমার ইমেইল: ${requesterEmail}

অনুগ্রহ করে আমাকে join link বা approval দিয়ে সাহায্য করবেন।`;

    window.open(`https://wa.me/88${cleanedPhone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  if (loadingGroups) {
     return <SmoothLoader show={true} />;
  }

  if (!userProfile?.isAdmin && groups.length === 0) {
     return (
       <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
         <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] w-full max-w-md border border-slate-100">
             {!showCreateModal ? (
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center font-black">
                      <Users size={32} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2">কোনো গ্রুপ পাওয়া যায়নি!</h3>
                  <p className="text-sm font-medium text-slate-500 mb-6 px-2">আপনি এই মুহূর্তে কোনো মেসের সাথে যুক্ত নেই। যদি মেসে জয়েন লিংক দিয়ে থাকেন, তাহলে ম্যানেজারকে আপনার ইমেইলটি <b>({currentUser?.email})</b> অ্যাড করতে বলুন।</p>
                  
                  <div className="space-y-3">
                    <button onClick={handleLogout} className="w-full p-4 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-colors">
                       লগআউট করুন
                    </button>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left">
                       <p className="text-xs text-emerald-700 font-black uppercase tracking-wider mb-2">মেম্বার রিকোয়েস্ট</p>
                       <p className="text-sm text-slate-600 font-medium mb-3">join link না থাকলে ম্যানেজারের নাম্বার দিয়ে সরাসরি রিকোয়েস্ট পাঠাতে পারবেন।</p>
                       <input
                         type="tel"
                         value={managerPhone}
                         onChange={e => setManagerPhone(e.target.value)}
                         placeholder="ম্যানেজারের মোবাইল নাম্বার"
                         className="w-full p-3 rounded-xl bg-white border border-emerald-100 text-slate-800 font-bold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition mb-3"
                       />
                       <button
                         onClick={handleMemberRequest}
                         className="w-full p-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-colors"
                       >
                         ম্যানেজারকে মিল রিকোয়েস্ট দিন
                       </button>
                    </div>
                    <div className="pt-4 border-t border-slate-100 mt-4">
                       <p className="text-xs text-slate-400 font-bold mb-3">অথবা, আপনি নিজেই একটি মেস তৈরি করে চালাতে পারেন:</p>
                       <button onClick={() => setShowCreateModal(true)} className="w-full p-4 bg-indigo-50 text-indigo-600 font-black rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                          <Plus size={18}/> নতুন মেস/অ্যাকাউন্ট খুলুন
                       </button>
                    </div>
                  </div>
                </div>
             ) : (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-black">
                      <Plus size={32} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2 text-center">মেস/গ্রুপের নাম দিন</h3>
                  <p className="text-sm font-medium text-slate-500 mb-8 text-center px-4">আপনার মেস বা হোস্টেলের কার্যক্রম শুরু করতে সুন্দর একটি নাম দিন।</p>
                  <form onSubmit={handleCreateGroup}>
                    <input 
                      type="text" 
                      placeholder="যেমন: স্টুডেন্ট মেস, ঢাকা" 
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 mb-6 transition-all transform-gpu"
                      autoFocus
                      required
                    />
                    <button type="submit" className="w-full p-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl active:scale-[0.98] transition-all transform-gpu">
                       অ্যাকাউন্ট খুলুন &rarr;
                    </button>
                    <button type="button" onClick={() => setShowCreateModal(false)} className="w-full mt-4 p-4 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition-colors">
                       ফিরে যান
                    </button>
                  </form>
                </>
             )}
         </motion.div>
       </div>
     );
  }

  // If regular user has groups, they shouldn't even see this because of the redirect above, but just in case:
  if (!userProfile?.isAdmin) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4"><div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: 20 }} 
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-slate-50 font-sans p-4 md:p-8"
    >
      {/* Header */}
      <div className="max-w-4xl mx-auto flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm mb-8 border border-slate-100">
        <div className="flex items-center gap-3">
          {currentUser?.photoURL ? (
            <img src={currentUser.photoURL} alt={`${currentUser?.displayName || 'User'}'s Profile`} className="w-12 h-12 rounded-full border-2 border-indigo-100" />
          ) : (
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-black">
              {currentUser?.displayName?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <h2 className="font-bold text-slate-800">{currentUser?.displayName || 'User'}</h2>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${userProfile?.plan === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                {userProfile?.plan === 'premium' ? 'Premium' : 'Free Plan'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {userProfile?.isAdmin && (
            <button onClick={() => navigate('/admin')} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors transform-gpu font-black text-xs flex items-center gap-2 border border-indigo-200">
               <Crown size={16}/> Admin Portal
            </button>
          )}
          <button onClick={handleLogout} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors transform-gpu">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
        
        {/* Left Col - Groups */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <Users size={20} className="text-indigo-500" /> সিস্টেমের সকল মেস ({groups.length})
            </h3>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 text-white p-2 md:px-4 md:py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition transform-gpu-all transform-gpu flex items-center gap-1"
            >
              <Plus size={16} /> <span className="hidden md:inline">নতুন গ্রুপ</span>
            </button>
          </div>

          {loadingGroups ? (
            <div className="text-center p-8"><span className="animate-pulse text-slate-400 font-bold">লোডিং...</span></div>
          ) : groups.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl text-center border-2 border-dashed border-slate-200">
              <p className="text-slate-500 font-medium mb-4">আপনার কোনো গ্রুপ নেই। "নতুন গ্রুপ" এ ক্লিক করে শুরু করুন।</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {groups.map(group => (
                <div key={group.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow transform-gpu group flex flex-col justify-between min-h-[160px] relative">
                  {userProfile?.isAdmin && (
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                       className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 p-2 rounded-xl transition"
                       title="ডিলিট মেস"
                     >
                       <X size={16} />
                     </button>
                  )}
                  <div>
                    <h4 className="font-bold text-lg text-slate-800 mb-1 pr-8">{group.name}</h4>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                       <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${group.ownerId === currentUser.uid ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                         {group.ownerId === currentUser.uid ? 'ম্যানেজার' : 'মেম্বার'}
                       </span>
                       {userProfile?.isAdmin && (
                         <span className="text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider bg-slate-100 text-slate-500 flex items-center gap-1">
                           <Users size={10} /> {group.memberUids?.length || 1} জন
                         </span>
                       )}
                    </div>
                    {userProfile?.isAdmin && group.ownerEmail && (
                      <p className="text-xs text-slate-400 font-medium break-all">{group.ownerEmail}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => navigate(`/app/${(group.slug || group.name?.toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]+/g,'-').replace(/^-|-$/g,'') || 'mess')}--${group.id}`)}
                    className="w-full bg-slate-50 text-slate-700 border border-slate-200 p-3 rounded-xl font-bold group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors transform-gpu mt-4 text-sm"
                  >
                    ড্যাশবোর্ডে প্রবেশ করুন &rarr;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col - Subscription */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-slate-900/20 border border-slate-700 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-10">
              <Crown size={120} />
            </div>
            <h3 className="font-bold text-slate-300 mb-1 text-sm">আপনার প্ল্যান</h3>
            <div className="flex items-end gap-2 mb-6">
              <h2 className="text-3xl font-black capitalize tracking-tight">{userProfile?.plan || 'Free'}</h2>
              {userProfile?.plan === 'premium' && <Crown size={24} className="text-amber-400 mb-1 animate-bounce" />}
            </div>
            
            {userProfile?.plan === 'free' ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  ফ্রি প্ল্যানে আপনি মাত্র ১টি গ্রুপ তৈরি করতে পারবেন। আনলিমিটেড গ্রুপ ও লকার সুবিধার জন্য আপগ্রেড করুন।
                </p>
                <button 
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950 font-black p-3 rounded-xl shadow-lg hover:scale-[1.02] transition-transform transform-gpu text-sm"
                >
                  প্রিমিয়াম আপগ্রেড করুন
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-emerald-400 font-bold bg-emerald-400/10 p-2 rounded-lg border border-emerald-400/20">
                  আপনি সকল প্রিমিয়াম সুবিধা উপভোগ করছেন!
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-4">নতুন গ্রুপ তৈরি করুন</h3>
            <form onSubmit={handleCreateGroup}>
              <input 
                type="text" 
                placeholder="গ্রুপের/মেসের নাম" 
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-700 outline-none focus:border-indigo-500 mb-4 transition-colors transform-gpu"
                autoFocus
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="p-3 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl">বাতিল</button>
                <button type="submit" className="p-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700">তৈরি করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
