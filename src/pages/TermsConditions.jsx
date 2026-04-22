import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';

export default function TermsConditions() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-slate-50 font-sans">
      <SEO 
        title="Terms & Conditions | Meal Manager Bangladesh"
        description="Review the terms and conditions for using Meal Manager, the leading mess management platform in Bangladesh."
        canonical="https://mealmanager.eu.cc/terms"
      />
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
        <div className="text-center mb-16">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FileText size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">ব্যবহারের শর্তাবলী</h1>
          <p className="text-slate-500 font-medium">Terms & Conditions</p>
          <p className="text-sm text-slate-400 mt-2">সর্বশেষ আপডেট: ৫ এপ্রিল, ২০২৬</p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 md:p-12 space-y-10 text-slate-700 leading-relaxed">

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
            <p className="font-bold text-amber-800">
              Meal Manager ব্যবহার করার আগে অনুগ্রহ করে এই শর্তাবলী মনোযোগ দিয়ে পড়ুন। এই অ্যাপ ব্যবহার করে আপনি এই শর্তাবলী মেনে নিচ্ছেন বলে গণ্য হবে।
            </p>
          </div>

          {[
            {
              title: '১. পরিষেবার বিবরণ',
              content: 'Meal Manager একটি ডিজিটাল মেস ম্যানেজমেন্ট সিস্টেম যা বাংলাদেশের মেস, হোস্টেল, ফ্লাট এবং শিক্ষাপ্রতিষ্ঠানের ডরমিটরিগুলোর জন্য তৈরি। এটি মিল রেকর্ড, বাজার খরচ, মাসিক বিল এবং সদস্য পরিচালনার সুবিধা দেয়।'
            },
            {
              title: '২. অ্যাকাউন্ট ও নিবন্ধন',
              content: 'অ্যাপ ব্যবহার করতে আপনার একটি বৈধ Google অ্যাকাউন্ট প্রয়োজন। একটি Google অ্যাকাউন্ট দিয়ে সর্বোচ্চ একটি মেস পরিচালনা করা যাবে। আপনার অ্যাকাউন্টের নিরাপত্তা বজায় রাখার দায়িত্ব সম্পূর্ণ আপনার।'
            },
            {
              title: '৩. ফ্রি ট্রায়াল ও প্রিমিয়াম পরিষেবা',
              content: 'নতুন মেসের জন্য ৩০ দিনের বিনামূল্যে ট্রায়াল প্রদান করা হয়। ট্রায়াল শেষে নিরবচ্ছিন্ন পরিষেবার জন্য প্রিমিয়াম প্ল্যানে আপগ্রেড করতে হবে। প্রতিটি মেস সর্বোচ্চ একবার ফ্রি ট্রায়াল পাওয়ার যোগ্য।'
            },
            {
              title: '৪. পেমেন্ট নীতি',
              content: 'পেমেন্ট সম্পূর্ণ bKash বা Nagad-এর মাধ্যমে সরাসরি প্রদান করতে হবে। পেমেন্টের পর ট্রানজেকশন আইডি সাবমিট করলে ৬ ঘণ্টার মধ্যে ম্যানুয়ালি যাচাই করা হবে। অ্যাক্টিভেশন সম্পন্ন হলে মেসেজ বা ইমেইলে নিশ্চিত করা হবে।'
            },
            {
              title: '৫. তথ্যের দায়িত্ব',
              content: 'আপনি আপনার মেসের সকল তথ্য সঠিকভাবে এন্ট্রি করার জন্য দায়বদ্ধ। Meal Manager কোনো ভুল তথ্যের কারণে সৃষ্ট আর্থিক ক্ষতির জন্য দায়ী নয়।'
            },
            {
              title: '৬. নিষিদ্ধ কার্যক্রম',
              content: 'অ্যাপটি ব্যক্তিগত মেস বা হোস্টেল ব্যবস্থাপনার বাইরে কোনো বাণিজ্যিক উদ্দেশ্যে ব্যবহার করা নিষেধ। অ্যাপের কোড রিভার্স ইঞ্জিনিয়ারিং, হ্যাকিং বা অননুমোদিত ব্যবহার থেকে বিরত থাকুন।'
            },
            {
              title: '৭. পরিষেবা বিচ্ছিন্নকরণ',
              content: 'আমরা যেকোনো সময় শর্ত লঙ্ঘনকারী অ্যাকাউন্ট স্থগিত বা বাতিল করার অধিকার সংরক্ষণ করি। প্রিমিয়াম পেমেন্ট ফেরত দেওয়া সম্ভব নয় কারণ পরিষেবা ইতিমধ্যে সক্রিয় করা হয়ে যায়।'
            },
            {
              title: '৮. পরিষেবার পরিবর্তন',
              content: 'আমরা যেকোনো সময় পরিষেবার শর্ত, মূল্য বা ফিচার পরিবর্তন করার অধিকার রাখি। পরিবর্তন কার্যকর হওয়ার আগে ব্যবহারকারীদের অবহিত করা হবে।'
            }
          ].map((section, i) => (
            <section key={i}>
              <h2 className="text-xl font-black text-slate-800 mb-3">{section.title}</h2>
              <p className="text-sm leading-relaxed">{section.content}</p>
            </section>
          ))}

          <section className="bg-slate-50 rounded-2xl p-6">
            <h2 className="text-xl font-black text-slate-800 mb-3">৯. যোগাযোগ</h2>
            <p className="text-sm mb-3">শর্তাবলী সম্পর্কে যেকোনো প্রশ্নের জন্য:</p>
            <p className="text-sm"><strong>ডেভেলপার:</strong> Shipon Talukdar (Shipon Webestone)</p>
            <p className="text-sm mt-1"><strong>ইমেইল:</strong> shipontalukdaroffice@gmail.com</p>
            <p className="text-sm mt-1"><strong>WhatsApp:</strong> +8801570215792</p>
          </section>
        </div>
      </main>

      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-200 bg-white mt-12">
        <p>&copy; {new Date().getFullYear()} Meal Manager by Shipon Webestone. সর্বস্বত্ব সংরক্ষিত।</p>
        <div className="flex justify-center gap-6 mt-3">
          <Link to="/" className="hover:text-indigo-600 transition-colors">হোম</Link>
          <Link to="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</Link>
          <Link to="/blog" className="hover:text-indigo-600 transition-colors">Blog</Link>
        </div>
      </footer>
    </motion.div>
  );
}
