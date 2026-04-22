import React from 'react';
import { motion } from 'framer-motion';
import { Target, Users, ShieldCheck, Zap, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function About() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-200">
      <SEO 
        title="About Us - Meal Manager | Leading Digital Mess Solution"
        description="Learn more about Meal Manager, its mission to digitalize mess management in Bangladesh, and why thousands of users trust us."
        canonical="https://mealmanager.eu.cc/about"
      />

      {/* Background decoration */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] h-[70%] w-[70%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[70%] w-[70%] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-indigo-400 mb-6">
            Our Journey
          </div>
          <h1 className="text-4xl font-black text-white sm:text-6xl mb-6">আমাদের মূল লক্ষ্য</h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            মেস বা হোস্টেল লাইফে হিসাব নিয়ে দুশ্চিন্তা কমানোর জন্য 'মিল ম্যানেজার' তৈরি করা হয়েছে। 
            আমরা বিশ্বাস করি প্রযুক্তি জীবনকে সহজ করার জন্য।
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 mb-20">
          <div className="p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm">
            <Target className="text-indigo-400 mb-6" size={32} />
            <h2 className="text-2xl font-black text-white mb-4">উদ্দেশ্য (Mission)</h2>
            <p className="text-slate-400 leading-relaxed">
              বাংলাদেশের প্রতিটি মেস ও হোস্টেলের হিসাব খাতা-কলম মুক্ত করে ডিজিটাল করা। স্বচ্ছতা বৃদ্ধি করা এবং ভুল বোঝাবুঝি কমানো আমাদের প্রধান লক্ষ্য।
            </p>
          </div>
          <div className="p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm">
            <Users className="text-violet-400 mb-6" size={32} />
            <h2 className="text-2xl font-black text-white mb-4">কাদের জন্য?</h2>
            <p className="text-slate-400 leading-relaxed">
              যারা মেসে থাকেন, হোস্টেলে থাকেন বা শেয়ারড ফ্ল্যাটে থাকেন - তাদের সবার জন্যই মিল ম্যানেজার একটি ওয়ান-স্টপ সলিউশন।
            </p>
          </div>
        </div>

        <section className="mb-20">
          <h2 className="text-3xl font-black text-white mb-8 text-center">কেন আমরা মেস লাইফ নিয়ে কাজ করছি?</h2>
          <div className="prose prose-invert max-w-none text-slate-400 text-lg leading-relaxed space-y-6">
            <p>
              মেস লাইফে বাজারের হিসাব, মিল হিসাব আর মাসশেষে ড্রয়ারে জমানো সেই ছিঁড়ে যাওয়া খাতা - এই দৃশ্যটিই আমাদের মোটিভেশন। 
              একটি ছোট ভুলে মেসে সদস্যদের মধ্যে ভুল বোঝাবুঝি সৃষ্টি হতে পারে। 
              'মিল ম্যানেজার' এই সমস্যাটি স্থায়ীভাবে সমাধান করে প্রতিটি লেনদেনের রেকর্ড স্বচ্ছ রাখে।
            </p>
            <p>
              আমাদের প্ল্যাটফর্মে একজন ম্যানেজার হিসেবে আপনি যেমন সহজে হিসাব রাখতে পারবেন, ঠিক তেমনি একজন সদস্য হিসেবে আপনিও সবসময় আপ-টু-ডেট থাকবেন। 
              কোনো লুকানো হিসাব নেই, সবকিছুই আপনার নখদর্পণে।
            </p>
          </div>
        </section>

        <div className="p-12 rounded-[3.5rem] bg-gradient-to-br from-indigo-600 to-violet-700 text-white text-center">
          <Heart className="mx-auto mb-6" size={48} />
          <h2 className="text-3xl font-black mb-6">আমাদের সাথে যুক্ত হোন</h2>
          <p className="text-indigo-100 mb-10 max-w-lg mx-auto">
            ৫০০০+ ব্যবহারকারীর এই কমিউনিটিতে যোগ দিন এবং আপনার মেস লাইফকে ডিজিটাল রূপ দিন।
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="px-8 py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-slate-100 transition">
              শুরু করুন
            </Link>
            <Link to="/contact" className="px-8 py-4 bg-white/10 text-white font-black rounded-2xl border border-white/20 hover:bg-white/20 transition">
              যোগাযোগ করুন
            </Link>
          </div>
        </div>
        
        <div className="mt-20 text-center">
          <Link to="/" className="text-indigo-400 font-bold hover:underline inline-flex items-center gap-2">
            ফিরে যান হোমপেজে
          </Link>
        </div>
      </div>
    </div>
  );
}
