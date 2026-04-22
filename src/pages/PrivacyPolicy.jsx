import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-slate-50 font-sans">
      <SEO 
        title="Privacy Policy | Meal Manager Bangladesh"
        description="Read our privacy policy to understand how Meal Manager protects your mess data and personal information."
        canonical="https://mealmanager.eu.cc/privacy"
      />
      {/* Header */}
      <nav className="bg-white border-b border-slate-100 px-4 md:px-12 py-4 flex items-center gap-4 sticky top-0 z-50 shadow-sm">
        <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors">
          <ArrowLeft size={18} /> হোমে ফিরুন
        </Link>
        <span className="text-slate-300">|</span>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M12 2C8.13 2 5 4.02 5 6.5V7c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-.5C19 4.02 15.87 2 12 2zm-7 9v7c0 1.66 3.13 3 7 3s7-1.34 7-3v-7c0 1.66-3.13 3-7 3s-7-1.34-7-3z"/></svg>
          </div>
          <span className="text-lg font-black text-indigo-600">Meal Manager</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">গোপনীয়তা নীতি</h1>
          <p className="text-slate-500 font-medium">Privacy Policy</p>
          <p className="text-sm text-slate-400 mt-2">সর্বশেষ আপডেট: ৫ এপ্রিল, ২০২৬</p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 md:p-12 space-y-10 text-slate-700 leading-relaxed">

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
            <p className="font-bold text-indigo-800">
              আপনার গোপনীয়তা আমাদের কাছে অত্যন্ত গুরুত্বপূর্ণ। এই গোপনীয়তা নীতিটি বর্ণনা করে যে Meal Manager অ্যাপ কীভাবে আপনার তথ্য সংগ্রহ, ব্যবহার এবং সুরক্ষা করে।
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-black text-slate-800 mb-4">১. আমরা কোন তথ্য সংগ্রহ করি</h2>
            <p className="mb-3">আমরা নিম্নলিখিত ধরনের তথ্য সংগ্রহ করি:</p>
            <ul className="space-y-2 list-none">
              {['আপনার Google অ্যাকাউন্টের নাম এবং ইমেইল ঠিকানা (লগইনের সময়)', 'আপনার মেসের নাম, সদস্য তালিকা এবং সংশ্লিষ্ট তথ্য', 'মিল, বাজার, এবং বিল সংক্রান্ত এন্ট্রি ডেটা', 'ডিভাইসের ধরন ও ব্রাউজার তথ্য (অ্যাপ উন্নয়নের জন্য)', 'পেমেন্ট ভেরিফিকেশনের জন্য ট্রানজেকশন আইডি'].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-800 mb-4">২. আমরা কীভাবে তথ্য ব্যবহার করি</h2>
            <p className="mb-3">সংগৃহীত তথ্য ব্যবহার করা হয়:</p>
            <ul className="space-y-2 list-none">
              {['আপনার মেসের ড্যাশবোর্ড এবং সদস্য পরিচালনার জন্য', 'মিল, বাজার ও বিল হিসাব গণনার জন্য', 'প্রিমিয়াম সদস্যপদ যাচাই করার জন্য', 'অ্যাপের পারফরম্যান্স ও ত্রুটি সংশোধনের জন্য'].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-800 mb-4">৩. ডেটা সুরক্ষা</h2>
            <p className="text-sm leading-relaxed">আপনার সমস্ত ডেটা <strong>Google Firebase Firestore</strong>-এ সংরক্ষিত, যা Google-এর উচ্চমানের নিরাপত্তা প্রযুক্তি দ্বারা সুরক্ষিত। আমরা কখনো আপনার পাসওয়ার্ড সংরক্ষণ করি না। সমস্ত সংযোগ HTTPS এনক্রিপশন ব্যবহার করে।</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-800 mb-4">৪. তৃতীয় পক্ষের সাথে তথ্য ভাগাভাগি</h2>
            <p className="text-sm leading-relaxed">আমরা আপনার ব্যক্তিগত তথ্য কখনো বিক্রি করি না বা বিজ্ঞাপনের উদ্দেশ্যে তৃতীয় পক্ষের সাথে ভাগাভাগি করি না। শুধুমাত্র পরিষেবা প্রদানের জন্য Google Firebase ব্যবহার করা হয়।</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-800 mb-4">৫. কুকিজ এবং ট্র্যাকিং</h2>
            <p className="text-sm leading-relaxed">আমরা ব্যবহারকারীর পরিচয় যাচাইয়ের জন্য Firebase Authentication কুকি ব্যবহার করি। বিজ্ঞাপন ট্র্যাকিং কুকি আমরা ব্যবহার করি না।</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-800 mb-4">৬. আপনার অধিকার</h2>
            <ul className="space-y-2 list-none">
              {['আপনার ডেটা দেখতে ও সংশোধন করতে পারবেন', 'যেকোনো সময় আপনার অ্যাকাউন্ট মুছে ফেলার অনুরোধ করতে পারবেন', 'আপনার মেসের সমস্ত ডেটা ডিলিট করতে পারবেন'].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="w-2 h-2 bg-sky-500 rounded-full mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-800 mb-4">৭. যোগাযোগ</h2>
            <p className="text-sm leading-relaxed">গোপনীয়তা সংক্রান্ত যেকোনো প্রশ্নের জন্য নিচের মাধ্যমে আমাদের সাথে যোগাযোগ করুন:</p>
            <div className="mt-4 bg-slate-50 rounded-xl p-4 text-sm">
              <p><strong>ইমেইল:</strong> shipontalukdaroffice@gmail.com</p>
              <p className="mt-1"><strong>WhatsApp:</strong> +8801570215792</p>
            </div>
          </section>
        </div>
      </main>

      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-200 bg-white mt-12">
        <p>&copy; {new Date().getFullYear()} Meal Manager by Shipon Webestone. সর্বস্বত্ব সংরক্ষিত।</p>
        <div className="flex justify-center gap-6 mt-3">
          <Link to="/" className="hover:text-indigo-600 transition-colors">হোম</Link>
          <Link to="/terms" className="hover:text-indigo-600 transition-colors">Terms</Link>
          <Link to="/blog" className="hover:text-indigo-600 transition-colors">Blog</Link>
        </div>
      </footer>
    </motion.div>
  );
}
