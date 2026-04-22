import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  ShieldCheck,
  Users,
  WalletCards,
  Cpu,
  Layers,
  Zap,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/db';
import { getWhatsAppSupportUrl } from '../constants/support';

// Shipon Talukdar's Google Drive hosted profile image URL
const PROFILE_IMAGE = 'https://lh3.googleusercontent.com/d/1pDdYeVgz9jq-DuhptMmrFLKvkszFVIW9';

const সুবিধা = [
  {
    icon: WalletCards,
    title: 'সব হিসাব এক জায়গায়',
    text: 'মিল, বাজার, জমা, বাকি আর মাসশেষের হিসাব আলাদা খাতা ছাড়া এক স্ক্রিনেই দেখা যায়।',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    icon: Users,
    title: 'ম্যানেজার ও সদস্য দুইজনের জন্যই সহজ',
    text: 'যে যার দরকারি তথ্য দ্রুত বুঝতে পারে, তাই ব্যবহার করতে ঝামেলা লাগে না।',
    color: 'from-purple-500 to-violet-400',
  },
  {
    icon: ShieldCheck,
    title: 'পরিষ্কার ও বিশ্বাসযোগ্য',
    text: 'পরিষ্কার হিসাব থাকলে ভুল বোঝাবুঝি কমে, তর্ক কমে, আর সবাই নিশ্চিন্ত থাকে।',
    color: 'from-emerald-500 to-teal-400',
  },
];

const ধাপসমূহ = [
  'গুগল দিয়ে লগইন করুন',
  'আপনার মেস বা হোস্টেলের নামে একটি গ্রুপ খুলুন',
  'সদস্য যোগ করে মিল, বাজার ও জমা লেখা শুরু করুন',
  'মাসশেষে অটো হিসাব দেখে ক্লোজিং করুন',
];

const প্রশ্নোত্তর = [
  ['Meal Manager কার জন্য?', 'ছাত্র মেস, হোস্টেল, ব্যাচেলর ফ্ল্যাট, শেয়ারড কিচেন—সব ধরনের মেসের জন্য।'],
  ['মোবাইল থেকে ব্যবহার করা যাবে?', 'হ্যাঁ, মোবাইল ও ব্রাউজার—দুই জায়গাতেই সহজে ব্যবহার করা যায়।'],
  ['ব্যবহার করতে কঠিন?', 'না, সাধারণ ব্যবহারকারীও খুব সহজে ব্যবহার করতে পারবে।'],
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
};

function DeveloperBadge() {
  return (
    <Link
      to="/developer"
      className="flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-3 py-2 transition-all hover:bg-white/20 hover:border-white/30"
    >
      <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-indigo-500/50 bg-slate-800">
        <img
          src={PROFILE_IMAGE}
          alt="শিপন তালুকদার"
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-sm font-black text-white">ST</div>';
          }}
        />
      </div>
      <div className="hidden sm:block text-left leading-tight">
        <span className="block text-xs font-black text-white">শিপন তালুকদার</span>
        <span className="block text-[11px] text-slate-400 uppercase tracking-tighter">Developed by</span>
      </div>
    </Link>
  );
}

import SEO from '../components/SEO';

export default function LandingPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [price, setPrice] = useState(30);
  const [contact, setContact] = useState({ name: '', mess: '', phone: '', message: '' });

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const snap = await getDoc(doc(db, 'system', 'pricing'));
        if (snap.exists()) {
          setPrice(snap.data().premiumPrice || 30);
        }
      } catch (error) {
        console.error('Failed to fetch pricing', error);
      }
    };

    fetchPrice();
  }, [currentUser, navigate]);

  const whatsappText = useMemo(
    () =>
      `আসসালামু আলাইকুম, মিল ম্যানেজার সম্পর্কে জানতে চাই।

নাম: ${contact.name}
মেস/হোস্টেল: ${contact.mess}
ফোন: ${contact.phone}
বার্তা: ${contact.message}`,
    [contact],
  );

  const handleLogin = () => navigate(currentUser ? '/dashboard' : '/login');

  const handleWhatsApp = (event) => {
    event.preventDefault();
    window.open(getWhatsAppSupportUrl(whatsappText), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">
      <SEO 
        title="Meal Manager | #1 Digital Mess & Hostel Management App Bangladesh"
        description="The ultimate mess management app bangladesh. Best hostel meal management system and bachelor mess হিসাব software. Track meals, costs, and bills automatically with Meal Manager BD."
        canonical="https://mealmanager.eu.cc/"
      />


      {/* Pure CSS Futuristic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Animated Glowing Orbs */}
        <div className="absolute top-[-10%] left-[-10%] h-[70%] w-[70%] rounded-full bg-indigo-600/15 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[70%] w-[70%] rounded-full bg-violet-600/15 blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[50%] w-[50%] rounded-full bg-blue-500/5 blur-[100px]" />
        
        {/* Subtle Mesh Grid */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{ 
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
        
        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/0 via-slate-950/40 to-slate-950" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="py-6">
          <nav className="flex items-center justify-between rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-3 backdrop-blur-md px-6 transform-gpu">
            <div className="flex items-center gap-3">
              <img 
                src="/favicon.png" 
                alt="Meal Manager - Best Mess Management App Bangladesh" 
                className="h-11 w-11 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] object-cover"
              />
              <div>
                <p className="text-lg font-black tracking-tight text-white">মিল ম্যানেজার</p>
                <p className="hidden xs:block text-[10px] uppercase tracking-widest text-slate-400">Next-Gen Management</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-6">
              <div className="hidden lg:flex items-center gap-1 text-sm font-semibold">
                <a href="#সুবিধা" className="px-4 py-2 text-slate-300 transition hover:text-white">সুবিধা</a>
                <a href="#ধাপ" className="px-4 py-2 text-slate-300 transition hover:text-white">শুরু</a>
                <Link to="/about" className="px-4 py-2 text-slate-300 transition hover:text-white">আমাদের সম্পর্কে</Link>
                <Link to="/contact" className="px-4 py-2 text-slate-300 transition hover:text-white">যোগাযোগ</Link>
              </div>
              <DeveloperBadge />
              <button
                onClick={handleLogin}
                className="rounded-full bg-white px-6 py-2.5 text-sm font-black text-slate-950 transition hover:bg-slate-200 hover:scale-105 active:scale-95"
              >
                {currentUser ? 'ড্যাশবোর্ড' : 'লগইন'}
              </button>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="pt-12 pb-20 lg:pt-20">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-indigo-400">
              <Zap size={14} />
              মেস হিসাবের সুপার-পাওয়ার
            </div>
            <h1 className="mt-8 text-5xl font-black tracking-tight text-white sm:text-7xl lg:text-8xl">
              স্মার্ট <span className="gradient-text">মেস হিসাব</span><br />
              আধুনিক জীবন।
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl">
              খাতা-কলমের দিন শেষ! মিল, বাজার আর মেসের সব হিসাব এখন হবে পানির মতো পরিষ্কার। 
              ম্যানেজার ও সদস্য সবার জন্য ডিজাইন করা হয়েছে এই সুন্দর ও দ্রুত অ্যাপ।
            </p>

            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
              <button
                onClick={handleLogin}
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-indigo-600 px-8 py-4 text-lg font-black text-white shadow-[0_0_40px_rgba(79,70,229,0.3)] transition-all hover:bg-indigo-500 hover:shadow-[0_0_50px_rgba(79,70,229,0.5)]"
              >
                {currentUser ? 'ড্যাশবোর্ডে যান' : 'ফ্রি শুরু করুন'}
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                <div className="absolute -inset-1 z-[-1] bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400 opacity-0 blur-xl transition-opacity group-hover:opacity-40" />
              </button>
              <a
                href="#যোগাযোগ"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-lg font-bold text-white backdrop-blur-md transition hover:bg-white/10 hover:border-white/20"
              >
                আগে কথা বলতে চাই
              </a>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
              {[
                { label: 'সক্রিয় মেস', val: '১০০+' },
                { label: 'ট্রায়াল পিরিয়ড', val: '৩০ দিন' },
                { label: 'ব্যবহারকারী', val: '৫০০০+' },
                { label: 'সাপোর্ট', val: '২৪/৭' },
              ].map((stat, i) => (
                <div key={i} className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm">
                  <p className="text-3xl font-black text-white">{stat.val}</p>
                  <p className="mt-1 text-sm text-slate-400 uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="সুবিধা" className="py-20">
          <div className="mb-16 text-center">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-400">Feature Highlight</h2>
            <p className="mt-4 text-4xl font-black text-white sm:text-5xl">কেন মিল ম্যানেজার বেছে নিবেন?</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {সুবিধা.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="futuristic-card group"
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-white shadow-lg`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-8 text-2xl font-black text-white group-hover:text-glow transition-all">{item.title}</h3>
                  <p className="mt-4 text-base leading-relaxed text-slate-400">{item.text}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Premium / Pricing */}
        <section className="py-20 lg:py-32">
          <div className="relative overflow-hidden rounded-[3.5rem] border border-white/10 bg-slate-900/50 p-8 lg:p-16">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-indigo-600/20 blur-[100px]" />
            
            <div className="relative z-10 grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="rounded-full bg-indigo-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-indigo-400">Premium Plan</span>
                <h2 className="mt-6 text-4xl font-black text-white sm:text-6xl">নিশ্চিন্ত থাকুন <br/><span className="gradient-text">প্রিমিয়াম ফিচারে।</span></h2>
                <p className="mt-8 text-lg text-slate-400">
                  উন্নত রিপোর্ট, মেম্বার ইনভাইট সিস্টেম, মাসশেষের অটো-হিসাব আর সিকিউরড ক্লাউড স্টোরেজ। 
                  নামমাত্র খরচে আপনার মেসকে করুন ফুল ডিজিটাল।
                </p>
                
                <div className="mt-10 space-y-4">
                  {['আনলিমিটেড মেম্বার', 'অটো ক্লোজিং রিপোর্ট', 'ডেডিকেটেড সাপোর্ট', 'অ্যাডস-ফ্রি ব্রাউজিং'].map(f => (
                    <div key={f} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 size={14} />
                      </div>
                      <span className="font-semibold text-slate-300">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-dark rounded-[2.5rem] p-8 lg:p-12 text-center border-white/10 shadow-2xl">
                <Layers className="mx-auto text-indigo-400" size={48} />
                <p className="mt-6 text-sm font-black uppercase tracking-widest text-slate-400">প্রতি মাসে মাত্র</p>
                <div className="mt-4 flex items-baseline justify-center gap-2">
                  <span className="text-7xl font-black text-white">৳{price}</span>
                </div>
                <button
                  onClick={handleLogin}
                  className="mt-10 w-full rounded-2xl bg-white py-5 text-lg font-black text-slate-950 transition hover:bg-slate-200 hover:scale-[1.02] active:scale-95"
                >
                  এখনই শুরু করুন
                </button>
                <p className="mt-6 text-xs text-slate-500 font-bold uppercase tracking-widest">No Credit Card Required For Trial</p>
              </div>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section id="ধাপ" className="py-20 lg:py-32">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-400">Workflow</h2>
              <p className="mt-4 text-4xl font-black text-white sm:text-6xl">কিভাবে কাজ <br/> শুরু করবেন?</p>
              <p className="mt-8 text-lg text-slate-400 md:w-4/5">
                খুবই সহজ ৪টি ধাপ। কোনো টেকনিক্যাল জ্ঞান ছাড়াই আপনি নিজের মেসের ডিজিটাল ম্যানেজার হয়ে উঠতে পারেন মাত্র ৫ মিনিটে।
              </p>
              
              <div className="mt-12 space-y-4">
                <div className="flex items-center gap-4 rounded-3xl border border-white/5 bg-white/5 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="font-black text-white">সম্পূর্ণ নিরাপদ</p>
                    <p className="text-sm text-slate-400">আপনার ডাটা গুগল ফায়imageBase-এ ইনক্রিপ্টেড থাকে।</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {ধাপসমূহ.map((step, index) => (
                <motion.div 
                  key={step} 
                  initial={{ x: 50, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group flex items-center gap-6 rounded-3xl border border-white/5 bg-white/5 p-8 transition-all hover:bg-indigo-500/5 hover:border-indigo-500/20"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 border border-white/10 text-xl font-black text-indigo-400 shadow-inner group-hover:bg-indigo-500 group-hover:text-white transition-all">
                    {index + 1}
                  </div>
                  <p className="text-lg font-black text-white">{step}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact / WhatsApp */}
        <section id="যোগাযোগ" className="py-20">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[3rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-500 p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                  <div className="absolute top-10 left-10 w-40 h-40 border-4 border-white rounded-full blur-2xl" />
                  <div className="absolute bottom-10 right-10 w-60 h-60 border-8 border-white rounded-full blur-3xl" />
               </div>
               <div className="relative z-10">
                <MessageCircle size={48} className="mb-8" />
                <h2 className="text-4xl font-black leading-tight lg:text-5xl">সরাসরি কথা <br/> বলে নিন।</h2>
                <p className="mt-8 text-lg text-indigo-50/80">
                  আপনার মেসের জন্য এটি কেন সেরা হবে, তা আমাদের থেকে সরাসরি হোয়াটসঅ্যাপে জেনে নিন। আমরা আপনাকে হেল্প করতে তৈরি।
                </p>
                <div className="mt-12 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full border border-white/20 bg-white/10 flex items-center justify-center">
                    <Zap size={20} />
                  </div>
                  <p className="font-bold text-lg">ইনস্ট্যান্ট সাপোর্ট</p>
                </div>
               </div>
            </div>

            <form onSubmit={handleWhatsApp} className="futuristic-card p-8 lg:p-12">
              <h3 className="text-2xl font-black text-white mb-8">যোগাযোগ ফর্ম</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-4">আপনার নাম</label>
                  <input
                    name="name"
                    value={contact.name}
                    onChange={(event) => setContact((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="e.g. শিপন তালুকদার"
                    required
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-6 py-4 text-white outline-none placeholder:text-slate-600 focus:border-indigo-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-4">ফোন নাম্বার</label>
                  <input
                    name="phone"
                    value={contact.phone}
                    onChange={(event) => setContact((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="017XXXXXXXX"
                    required
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-6 py-4 text-white outline-none placeholder:text-slate-600 focus:border-indigo-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-4">মেস / হোস্টেল / ফ্ল্যাটের নাম</label>
                  <input
                    name="mess"
                    value={contact.mess}
                    onChange={(event) => setContact((prev) => ({ ...prev, mess: event.target.value }))}
                    placeholder="আপনার মেস বা হোস্টেলের নাম লিখুন"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-6 py-4 text-white outline-none placeholder:text-slate-600 focus:border-indigo-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-4">বার্তা</label>
                  <textarea
                    name="message"
                    rows={4}
                    value={contact.message}
                    onChange={(event) => setContact((prev) => ({ ...prev, message: event.target.value }))}
                    placeholder="আপনি কি জানতে চান লিখুন..."
                    required
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-6 py-4 text-white outline-none placeholder:text-slate-600 focus:border-indigo-500/50 transition-all resize-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 py-5 text-xl font-black text-white hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20"
              >
                হোয়াটসঅ্যাপে বার্তা পাঠান
                <ArrowRight size={22} />
              </button>
            </form>
          </div>
        </section>
 
        {/* How to Start / Features Tour */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black text-white sm:text-5xl mb-6">সবচেয়ে প্রয়োজনীয় ফিচারসমূহ</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">সিস্টেমের প্রতিটি অংশ এমনভাবে ডিজাইন করা হয়েছে যাতে আপনার মেস লাইফ হয়ে ওঠে একদম নিরুদ্বেগ।</p>
            </div>
 
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                { title: 'Dashboard (ওভারভিউ)', color: 'bg-blue-500', icon: '🔵', desc: 'এটা হলো পুরো সিস্টেমের হোম স্ক্রিন। এখানে ব্যবহারকারী এক নজরে পুরো মাসের হিসাব (Cloud Sync, Meals, Rate, Balance) দেখতে পারে।' },
                { title: 'Fixed Bill (ফিক্সড বিল)', color: 'bg-emerald-500', icon: '🟩', desc: 'ভাড়া, ওয়াইফাই, বিদ্যুৎ ও বুয়া খরচ—মাসে যেসব খরচ ফিক্সড থাকে সেগুলো এখানে যোগ করুন। যা মাস শেষে অটো ডিভাইড হবে।' },
                { title: 'Meal Entry (মিল এন্ট্রি)', color: 'bg-orange-500', icon: '🟧', desc: 'প্রতিদিনের মিল সংখ্যা যোগ করার জায়গা। মিল এন্ট্রি দিলে সিস্টেম অটোমেটিকভাবে রিয়েল-টাইম মিল রেট আপডেট করে দেয়।' },
                { title: 'Bazar Expense (বাজার খরচ)', color: 'bg-yellow-500', icon: '🟨', desc: 'মেসের বাজার খরচ এখানে যোগ করুন। এটি সরাসরি মিল রেট এবং মেম্বারদের বাকি হিসাবকে প্রভাবিত করে।' },
                { title: 'Penalty (দণ্ড)', color: 'bg-red-500', icon: '🟥', desc: 'নিয়ম ভাঙলে বা দেরি করলে মেম্বারদের দণ্ড যোগ করা যায়, যা অটোমেটিকভাবে তার বকেয়া হিসাবের সাথে যুক্ত হয়।' },
                { title: 'Food Menu (AI মেনু)', color: 'bg-blue-400', icon: '🟦', desc: 'AI ব্যবহার করে সাপ্তাহিক বা দৈনিক খাবারের মেনু সাজানো যায়। কী রান্না হবে তা ঠিক করতে এটি দারুণ কার্যকরী।' },
                { title: 'Voting System (ভোটিং)', color: 'bg-brown-500', icon: '🟫', desc: 'মেসের বিভিন্ন সিদ্ধান্ত, নিয়ম বা মেনু ঠিক করতে মেম্বাররা এখানে ভোট দিতে পারে। একদম ডেমোক্রেটিক ম্যানেজমেন্ট!' },
                { title: 'Bua Tracker (বুয়া ট্র্যাকার)', color: 'bg-emerald-400', icon: '🟩', desc: 'বুয়ার কাজ, উপস্থিতি ও বেতন ট্র্যাক করা যায়। মাস শেষে বুয়ার হিসাব অটোমেটিক তৈরি হয়ে যায়।' },
                { title: 'Deposit (টাকা জমা)', color: 'bg-orange-400', icon: '🟧', desc: 'কে কত টাকা জমা দিয়েছে, কার কত বাকি বা ফেরত আছে—সবই এখানে পরিষ্কারভাবে দেখা যায়।' },
                { title: 'All Members (সব মেম্বার)', color: 'bg-yellow-400', icon: '🟨', desc: 'প্রতিটি মেম্বারের বিস্তারিত হিসাব (মিল, খরচ, বিল, দণ্ড, জমা, বাকি) দেখার মূল জায়গা এটিই।' },
                { title: 'Settings (সেটিংস)', color: 'bg-blue-600', icon: '🟦', desc: 'মেসের নাম পরিবর্তন, মাসের শুরু সেট করা, মেম্বার ম্যানেজ এবং অ্যাকাউন্ট সেটিংস করার পূর্ণ নিয়ন্ত্রণ।' },
                { title: 'Advanced & Sync', color: 'bg-purple-500', icon: '🟪', desc: 'PRO Online Sync এর মাধ্যমে ডাটা ক্লাউডে সেভ থাকে, ফলে যেকোনো ডিভাইস থেকে আপনার হিসাব নিরাপদ থাকে।' },
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -5 }}
                  className="p-6 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm group hover:bg-white/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{feature.icon}</span>
                    <h3 className="font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight text-sm">{feature.title}</h3>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
 
        {/* FAQ */}
        <section className="py-20">
          <div className="mb-12">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-400">Common Questions</h2>
            <p className="mt-4 text-4xl font-black text-white">সচরাচর জিজ্ঞাসা</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {প্রশ্নোত্তর.map(([question, answer]) => (
              <div key={question} className="rounded-3xl border border-white/5 bg-slate-900/50 p-8 backdrop-blur-sm">
                <h3 className="text-xl font-black text-white">{question}</h3>
                <p className="mt-6 text-base leading-relaxed text-slate-400">{answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 border-t border-white/10 py-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <img 
                  src="/favicon.png" 
                  alt="Meal Manager - Best Mess Management App Bangladesh" 
                  className="h-10 w-10 rounded-xl"
                />
                <span className="text-xl font-black text-white">মিল ম্যানেজার</span>
              </div>
              <p className="mt-4 text-slate-500 max-w-sm">
                Meal Manager — একটি আধুনিক ডিজিটাল মেস হিসাব প্ল্যাটফর্ম। তৈরি করেছেন শিপন তালুকদার।
              </p>
            </div>
            
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              <Link to="/about" className="text-sm font-bold text-slate-400 transition hover:text-white">আমাদের সম্পর্কে</Link>
              <Link to="/contact" className="text-sm font-bold text-slate-400 transition hover:text-white">যোগাযোগ</Link>
              <Link to="/privacy" className="text-sm font-bold text-slate-400 transition hover:text-white">গোপনীয়তা নীতি</Link>
              <Link to="/terms" className="text-sm font-bold text-slate-400 transition hover:text-white">শর্তাবলি</Link>
              <Link to="/blog" className="text-sm font-bold text-slate-400 transition hover:text-white">ডেভেলপার ব্লগ</Link>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-4 border-t border-white/5 pt-8 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">© {new Date().getFullYear()} Meal Manager. সর্বস্বত্ব সংরক্ষিত।</p>
            <div className="flex items-center gap-4 text-slate-500">
               <span className="h-1 w-1 rounded-full bg-slate-700" />
               <p className="text-xs font-black uppercase tracking-widest">Built with ❤️ in Bangladesh</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
