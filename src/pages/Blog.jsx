import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react';
import { motion } from 'framer-motion';

const FB_LINK = 'https://www.facebook.com/shipontalukdar1209';
const WA_LINK = 'https://wa.me/8801570215792';
const EMAIL   = 'shipontalukdaroffice@gmail.com';
const PHOTO   = 'https://lh3.googleusercontent.com/d/1pDdYeVgz9jq-DuhptMmrFLKvkszFVIW9';

const FBIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);
const WAIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);

function DeveloperCard() {
  return (
    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2rem] overflow-hidden shadow-2xl mb-10">
      <div className="p-8 md:p-10">
        <p className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-6">Developer</p>
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="shrink-0 text-center">
            <div className="w-24 h-24 rounded-2xl mx-auto overflow-hidden shadow-2xl shadow-indigo-900/50 border-2 border-white/10">
              <img src={PHOTO} alt="Shipon Talukdar"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML='<div class="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-4xl font-black text-white">S</div>'; }}
              />
            </div>
            <p className="text-white font-black mt-3 text-lg">Shipon Talukdar</p>
            <p className="text-indigo-400 text-xs mt-1">Senior SEO Specialist</p>
            <p className="text-slate-500 text-xs mt-0.5">📍 Bangladesh</p>
          </div>
          <div className="flex-1">
            <p className="text-slate-300 text-sm leading-relaxed">
              I am Shipon Talukdar — a passionate web developer from Bangladesh. I built Meal Manager from personal experience living in a mess, to help millions of students and workers manage their daily meals digitally.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <a href={FB_LINK} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-[#1877F2]/20 hover:bg-[#1877F2]/30 border border-[#1877F2]/40 text-blue-300 hover:text-blue-200 px-4 py-2.5 rounded-full text-sm font-bold transition-all">
                <FBIcon /> Facebook
              </a>
              <a href={WA_LINK} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-green-300 hover:text-green-200 px-4 py-2.5 rounded-full text-sm font-bold transition-all">
                <WAIcon /> WhatsApp
              </a>
              <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-slate-300 hover:text-white px-4 py-2.5 rounded-full text-sm font-bold transition-all">
                ✉️ Email
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-slate-800/50 border-t border-white/5 px-10 py-4 text-xs text-slate-500">
        Made with ❤️ by <strong className="text-indigo-400">Shipon Talukdar</strong> — Built for Bangladesh mess &amp; hostel management.
      </div>
    </div>
  );
}

export default function Blog() {
  useEffect(() => {
    document.title = 'Blog – Mess Management Guide Bangladesh | Meal Manager';
    // JSON-LD Blog Schema
    const schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.id = 'blog-schema';
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "Why Digital Meal Management is Essential for Bangladesh Mess & Hostel",
      "description": "Millions of students and workers in Bangladesh messes and hostels need a smart meal tracking solution. Meal Manager provides daily meal records, bazar cost tracking, monthly bill management — all in one Bengali app.",
      "image": "https://mealmanager.eu.cc/pwa-512x512.png",
      "author": { "@type": "Person", "name": "Shipon Talukdar", "url": FB_LINK },
      "publisher": { "@type": "Organization", "name": "Meal Manager", "logo": { "@type": "ImageObject", "url": "https://mealmanager.eu.cc/pwa-192x192.png" } },
      "datePublished": "2026-04-05",
      "dateModified": "2026-04-05",
      "mainEntityOfPage": { "@type": "WebPage", "@id": "https://mealmanager.eu.cc/blog" },
      "keywords": ["meal manager Bangladesh", "mess management app", "hostel meal tracker", "digital meal tracking", "Bangladesh mess app", "meal app Dhaka university", "hostel bill management Bangladesh"]
    });
    if (!document.getElementById('blog-schema')) document.head.appendChild(schema);
    window.scrollTo(0, 0);
    return () => { const el = document.getElementById('blog-schema'); if (el) el.remove(); };
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-100 px-4 md:px-12 py-4 flex items-center gap-4 sticky top-0 z-50 shadow-sm">
        <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors">
          <ArrowLeft size={18} /> Home
        </Link>
        <span className="text-slate-300">|</span>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M12 2C8.13 2 5 4.02 5 6.5V7c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-.5C19 4.02 15.87 2 12 2zm-7 9v7c0 1.66 3.13 3 7 3s7-1.34 7-3v-7c0 1.66-3.13 3-7 3s-7-1.34-7-3z"/></svg>
          </div>
          <span className="text-lg font-black text-indigo-600">Meal Manager Blog</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Meal Manager Blog</h1>
          <p className="text-slate-500 font-medium max-w-xl mx-auto">Guides, tips and insights about mess management, hostel life and digital solutions in Bangladesh.</p>
        </div>

        {/* Developer Profile BEFORE article */}
        <DeveloperCard />

        {/* Featured Article */}
        <article className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mb-12">
          <div className="bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-800 p-10 md:p-14 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl" />
            <span className="inline-block bg-amber-400 text-amber-900 text-xs font-black px-3 py-1 rounded-full mb-6 uppercase tracking-wider">⭐ Featured Post</span>
            <h2 className="text-2xl md:text-3xl font-black leading-tight mb-6 relative z-10">
              Why Digital Meal Management is Essential for Bangladesh Mess, Hostels &amp; Schools
            </h2>
            <div className="flex flex-wrap gap-4 text-indigo-200 text-sm relative z-10">
              <span className="flex items-center gap-1"><Calendar size={14} /> April 5, 2026</span>
              <span className="flex items-center gap-1"><Clock size={14} /> 7 min read</span>
              <span className="flex items-center gap-1"><Tag size={14} /> Guide</span>
            </div>
          </div>

          <div className="p-8 md:p-12 text-slate-700 text-sm leading-[2]">
            <div className="bg-indigo-50 border-l-4 border-indigo-500 rounded-r-2xl p-6 mb-8">
              <p className="font-bold text-indigo-800 text-base">Summary:</p>
              <p className="text-indigo-700 mt-1">Tracking daily meal records in Bangladesh messes and hostels no longer needs paper notebooks. Use Meal Manager to generate a complete monthly bill in minutes — completely free.</p>
            </div>

            <h3 className="text-xl font-black text-slate-800 mt-8 mb-4">The Reality of Mess Life in Bangladesh</h3>
            <p>Every year, millions of students come to study at <strong>Dhaka University</strong>, <strong>BUET</strong>, <strong>Chittagong University</strong>, <strong>Rajshahi University</strong> and thousands of colleges and medical colleges across the country. A large portion of them live in <strong>student messes</strong> or dormitories.</p>
            <p className="mt-4">A typical mess has 4–20 members. Meals are cooked three times a day. Tracking who ate how many meals, who did the bazar run, and who owes how much at month-end leads to monthly arguments and broken friendships!</p>

            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 my-8">
              <h4 className="font-black text-rose-700 mb-3">😓 Problems with paper-based meal tracking:</h4>
              <ul className="space-y-2 text-sm text-rose-700">
                {['Notebooks get lost or torn', 'Month-end calculations are chaotic', 'Someone always feels overcharged', 'Bazar receipts are hard to keep', 'Meal counts get wrong when members are absent'].map((p, i) => (
                  <li key={i} className="flex items-start gap-2"><span className="text-rose-400 mt-0.5">✕</span>{p}</li>
                ))}
              </ul>
            </div>

            <h3 className="text-xl font-black text-slate-800 mt-8 mb-4">Where Can Meal Manager Be Used?</h3>
            <p>Meal Manager is not just for messes — it works anywhere in Bangladesh where <strong>groups of people share meals together</strong>:</p>

            <div className="grid md:grid-cols-2 gap-4 my-8">
              {[
                { icon: '🏫', title: 'University / College Hostels', desc: 'DU, BUET, RU, CU and all public & private university dormitories across Bangladesh.' },
                { icon: '🏥', title: 'Medical College Hostels', desc: 'Student hostels at every medical college in the country.' },
                { icon: '🔧', title: 'Polytechnic Institute Hostels', desc: 'Dormitories at polytechnic institutes nationwide.' },
                { icon: '🏢', title: 'Office / Working Professional Messes', desc: 'Bachelor messes and flat shares in Dhaka and other cities.' },
                { icon: '🧑‍💼', title: 'Government Officer Messes', desc: 'Messes for government officers posted across different districts.' },
                { icon: '🏠', title: 'Landlord Mess Services', desc: 'Professional management tools for mess owners and operators.' },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <span className="text-3xl">{item.icon}</span>
                  <h5 className="font-black text-slate-800 mt-2 mb-1 text-sm">{item.title}</h5>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-black text-slate-800 mt-8 mb-4">How Does Meal Manager Solve These Problems?</h3>
            <p>With Meal Manager, you can record daily meals and the system automatically calculates everything at month-end. No arguments, no confusion.</p>

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 my-8">
              <h4 className="font-black text-emerald-700 mb-3">✅ What Meal Manager does:</h4>
              <ul className="space-y-2 text-sm text-emerald-700">
                {['Automatically calculates daily meal rates', 'Tracks bazar costs and splits by member', 'Manages monthly WiFi, electricity & rent bills', 'Real-time access for all members simultaneously', 'Download PDF report at month end', 'Works offline (PWA)', 'AI-powered weekly menu generator'].map((p, i) => (
                  <li key={i} className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span>{p}</li>
                ))}
              </ul>
            </div>

            <h3 className="text-xl font-black text-slate-800 mt-8 mb-4">Bangladesh Mess Culture and the Digital Future</h3>
            <p>85% of messes in Bangladesh still use handwritten notebooks. But with the rapid spread of smartphones and internet, this is changing fast. Local apps like Meal Manager play an important role in building <strong>Digital Bangladesh</strong>.</p>
            <p className="mt-4">From <strong>SSC and HSC students to university scholars</strong>, everyone uses smartphones today. Meal Manager leverages this to make daily mess life easier for millions.</p>

            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 my-8 text-white text-center">
              <h4 className="text-xl font-black mb-3">Start Today — 100% Free!</h4>
              <p className="text-indigo-200 text-sm mb-6">30-day free trial. No credit card required.</p>
              <Link to="/login" className="inline-block bg-white text-indigo-600 font-black px-8 py-3 rounded-full hover:shadow-xl hover:scale-105 transition-all transform-gpu">
                Start Free Trial →
              </Link>
            </div>

            <div className="flex flex-wrap gap-2 mt-10">
              {['meal manager bangladesh', 'mess management app', 'hostel meal tracker', 'digital meal tracking', 'bangladesh mess app', 'meal app dhaka university', 'hostel bill app', 'mess software bangladesh', 'meal tracker pwa'].map((tag, i) => (
                <span key={i} className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-full">#{tag}</span>
              ))}
            </div>
          </div>
        </article>
      </main>

      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-200 bg-white">
        <p>&copy; {new Date().getFullYear()} Meal Manager by Shipon Talukdar. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-3">
          <Link to="/" className="hover:text-indigo-600 transition-colors">Home</Link>
          <Link to="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-indigo-600 transition-colors">Terms</Link>
          <Link to="/developer" className="hover:text-indigo-600 transition-colors">Developer</Link>
        </div>
      </footer>
    </motion.div>
  );
}
