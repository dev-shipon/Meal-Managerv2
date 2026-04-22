import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Code2, ArrowLeft, Globe, Smartphone, Database, Zap, Mail, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const techStack = [
  { name: 'React 18', desc: 'ফ্রন্টএন্ড ফ্রেমওয়ার্ক', color: 'bg-sky-100 text-sky-700', icon: '⚛️' },
  { name: 'Vite', desc: 'লাইটনিং ফাস্ট বিল্ড টুল', color: 'bg-violet-100 text-violet-700', icon: '⚡' },
  { name: 'Firebase Firestore', desc: 'রিয়েলটাইম ড্যাটাবেস', color: 'bg-amber-100 text-amber-700', icon: '🔥' },
  { name: 'Firebase Auth', desc: 'গুগল লগইন সিস্টেম', color: 'bg-red-100 text-red-700', icon: '🔐' },
  { name: 'Tailwind CSS', desc: 'মডার্ন স্টাইলিং', color: 'bg-cyan-100 text-cyan-700', icon: '🎨' },
  { name: 'Framer Motion', desc: 'স্মুথ অ্যানিমেশন', color: 'bg-pink-100 text-pink-700', icon: '✨' },
  { name: 'Vite PWA Plugin', desc: 'Progressive Web App', color: 'bg-emerald-100 text-emerald-700', icon: '📱' },
  { name: 'Gemini AI', desc: 'AI মেনু জেনারেটর', color: 'bg-indigo-100 text-indigo-700', icon: '🤖' },
];

export default function Developer() {
  useEffect(() => {
    document.title = 'Developer – Shipon Talukdar | Senior SEO Specialist | Meal Manager';
    const schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.id = 'dev-schema';
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Shipon Talukdar",
      "jobTitle": "Senior SEO Specialist & Web Developer",
      "url": "https://mealmanager.eu.cc/developer",
      "sameAs": ["https://www.facebook.com/shipontalukdar1209"],
      "worksFor": { "@type": "Organization", "name": "Webestone Agency", "address": { "@type": "PostalAddress", "addressLocality": "Dhanmondi", "addressRegion": "Dhaka", "addressCountry": "BD" } },
      "alumniOf": [
        { "@type": "EducationalOrganization", "name": "Habiganj Polytechnic Institute" },
        { "@type": "EducationalOrganization", "name": "Creative IT Institute" },
        { "@type": "EducationalOrganization", "name": "Public High School, Sakhipur, Tangail" }
      ],
      "description": "Shipon Talukdar is a Senior SEO Specialist and Full Stack Web Developer from Bangladesh. Creator of Meal Manager app for Bangladesh messes and hostels."
    });
    if (!document.getElementById('dev-schema')) document.head.appendChild(schema);
    window.scrollTo(0, 0);
    return () => { const el = document.getElementById('dev-schema'); if (el) el.remove(); };
  }, []);
  const [showPhoto, setShowPhoto] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', mess: '', message: '' });
  const handleFormChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleWhatsApp = e => {
    e.preventDefault();
    const text = `Hello! I want to know about Meal Manager.\n\nName: ${form.name}\nPhone: ${form.phone}\nMess/Hostel: ${form.mess}\nMessage: ${form.message}`;
    window.open(`https://wa.me/8801570215792?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-slate-50 font-sans">
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

      <main className="max-w-5xl mx-auto px-4 py-16">
        {/* Developer Hero */}
        <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-[2.5rem] p-10 md:p-16 text-white text-center mb-16 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div 
              className="w-28 h-28 rounded-full mx-auto mb-6 overflow-hidden shadow-2xl shadow-indigo-900/50 border-4 border-white/20 cursor-zoom-in hover:scale-105 transition-transform"
              onClick={() => setShowPhoto(true)}
              title="ছবি বড় করে দেখুন"
            >
              <img 
                src="https://lh3.googleusercontent.com/d/1pDdYeVgz9jq-DuhptMmrFLKvkszFVIW9" 
                alt="Shipon Talukdar - Developer" 
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML='<div class="w-full h-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-5xl font-black text-white">S</div>'; }}
              />
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">Shipon Talukdar</h1>
            <p className="text-indigo-300 font-bold text-lg mb-1">Senior SEO Specialist & Web Developer</p>
            <p className="text-slate-400 font-medium text-sm">Webestone Agency, Dhanmondi, Dhaka</p>
            <p className="text-slate-400 text-sm mt-1">📍 Bangladesh</p>

            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <a href="https://www.facebook.com/shipontalukdar1209" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-[#1877F2]/20 hover:bg-[#1877F2]/30 border border-[#1877F2]/30 px-5 py-2.5 rounded-full text-sm font-bold transition-colors backdrop-blur-sm text-blue-300">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </a>
              <a href="mailto:shipontalukdaroffice@gmail.com" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-full text-sm font-bold transition-colors backdrop-blur-sm">
                <Mail size={16} /> ইমেইল করুন
              </a>
              <a href="https://wa.me/8801570215792" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/30 px-5 py-2.5 rounded-full text-sm font-bold transition-colors backdrop-blur-sm text-green-300">
                <MessageSquare size={16} /> WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Photo Lightbox Modal */}
        {showPhoto && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md"
            onClick={() => setShowPhoto(false)}
          >
            <style>{`
              @keyframes zoomIn { from { transform: scale(0.7); opacity:0; } to { transform: scale(1); opacity:1; } }
              .lightbox-img { animation: zoomIn 0.25s cubic-bezier(0.2,0.8,0.2,1); }
            `}</style>
            <div className="relative lightbox-img" onClick={e => e.stopPropagation()}>
              <img
                src="https://lh3.googleusercontent.com/d/1pDdYeVgz9jq-DuhptMmrFLKvkszFVIW9"
                alt="Shipon Talukdar"
                className="max-h-[85vh] max-w-[90vw] rounded-3xl shadow-2xl border-4 border-white/20 object-contain"
              />
              <button
                onClick={() => setShowPhoto(false)}
                className="absolute -top-4 -right-4 w-10 h-10 bg-white text-slate-800 rounded-full flex items-center justify-center font-black text-xl shadow-xl hover:bg-red-50 hover:text-red-500 transition"
              >×</button>
              <p className="text-center text-white/50 text-xs mt-3">Shipon Talukdar — click anywhere to close</p>
            </div>
          </div>
        )}

        {/* About Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
            <h2 className="text-2xl font-black text-slate-800 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center"><Code2 size={20}/></div>
              ডেভেলপার পরিচিতি
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              আমি <strong className="text-slate-800">Shipon Talukdar</strong>, একজন বাংলাদেশি ওয়েব ডেভেলপার এবং UI/UX ডিজাইনার।
            </p>
            <p className="text-slate-600 text-sm leading-relaxed mt-3">
              Meal Manager প্রজেক্টটি আমার ব্যক্তিগত অভিজ্ঞতা থেকে তৈরি — আমি নিজেও একসময় মেসে থেকেছি এবং হিসাব রাখার ঝামেলা বুঝেছি। সেই উপলব্ধি থেকেই এই অ্যাপটি তৈরি।
            </p>
          </div>

          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
            <h2 className="text-2xl font-black text-slate-800 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center"><Zap size={20}/></div>
              পরিষেবাসমূহ
            </h2>
            <ul className="space-y-3 text-sm text-slate-600">
              {[
                '🌐 ওয়েবসাইট ও ওয়েব অ্যাপ ডিজাইন',
                '📱 PWA ও মোবাইল-ফার্স্ট অ্যাপ ডেভেলপমেন্ট',
                '🔧 কাস্টম সফটওয়্যার সমাধান',
                '🛒 ই-কমার্স স্টোর ডিজাইন',
                '🎨 UI/UX ডিজাইন ও ব্র্যান্ডিং',
                '🔥 Firebase ব্যাকএন্ড ইন্টিগ্রেশন',
              ].map((s, i) => (
                <li key={i} className="flex items-center gap-2">{s}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Education & Experience — Timeline */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">

          {/* Education */}
          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center text-xl">🎓</div>
              শিক্ষা ও কোর্স
            </h2>
            <ol className="relative border-l-2 border-slate-100 ml-3 space-y-8">
              {[
                {
                  year: 'চলমান',
                  color: 'bg-indigo-500',
                  title: 'CST (Computer Science & Technology)',
                  place: 'Habiganj Polytechnic Institute',
                  detail: '3rd Semester — বর্তমানে অধ্যয়নরত',
                  badge: 'current'
                },
                {
                  year: '২০২৩',
                  color: 'bg-emerald-500',
                  title: 'Digital Marketing Complete Course',
                  place: 'Creative IT Institute',
                  detail: 'SEO, Social Media, Google Ads & Content Marketing',
                  badge: 'done'
                },
                {
                  year: 'SSC',
                  color: 'bg-amber-500',
                  title: 'Secondary School Certificate (SSC)',
                  place: 'Public High School, Sakhipur, Tangail',
                  detail: 'বিজ্ঞান বিভাগ',
                  badge: 'done'
                },
              ].map((item, i) => (
                <li key={i} className="ml-6">
                  <span className={`absolute -left-[9px] flex items-center justify-center w-4 h-4 ${item.color} rounded-full ring-4 ring-white`} />
                  {item.badge === 'current' && (
                    <span className="inline-block bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">চলমান</span>
                  )}
                  <p className="text-xs text-slate-400 font-medium mb-1">{item.year}</p>
                  <h3 className="font-black text-slate-800 text-sm">{item.title}</h3>
                  <p className="text-indigo-600 text-xs font-bold mt-0.5">{item.place}</p>
                  <p className="text-slate-500 text-xs mt-1">{item.detail}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Work Experience */}
          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center text-xl">💼</div>
              কর্ম অভিজ্ঞতা
            </h2>
            <ol className="relative border-l-2 border-slate-100 ml-3 space-y-8">
              {[
                {
                  year: 'বর্তমান',
                  color: 'bg-indigo-500',
                  role: 'Senior SEO Specialist',
                  company: 'Webestone Agency',
                  location: 'Dhanmondi, Dhaka, Bangladesh',
                  badge: 'current'
                },
                {
                  year: 'পূর্বে',
                  color: 'bg-emerald-500',
                  role: 'SEO & Digital Marketing Specialist',
                  company: 'Fast IT',
                  location: 'Dhaka, Bangladesh',
                },
                {
                  year: 'পূর্বে',
                  color: 'bg-amber-500',
                  role: 'Digital Marketing Executive',
                  company: 'Digital Dynamos Agency',
                  location: 'Bangladesh',
                },
                {
                  year: 'পূর্বে',
                  color: 'bg-sky-500',
                  role: 'SEO Specialist',
                  company: 'Blue Wave Agency',
                  location: 'Sydney, Australia (Remote)',
                },
              ].map((item, i) => (
                <li key={i} className="ml-6">
                  <span className={`absolute -left-[9px] flex items-center justify-center w-4 h-4 ${item.color} rounded-full ring-4 ring-white`} />
                  {item.badge === 'current' && (
                    <span className="inline-block bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">Current</span>
                  )}
                  <p className="text-xs text-slate-400 font-medium mb-1">{item.year}</p>
                  <h3 className="font-black text-slate-800 text-sm">{item.role}</h3>
                  <p className="text-indigo-600 text-xs font-bold mt-0.5">{item.company}</p>
                  <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">📍 {item.location}</p>
                </li>
              ))}
            </ol>
          </div>

        </div>
        {/* Tech Stack */}
        <div className="mb-16">
          <h2 className="text-3xl font-black text-slate-800 text-center mb-8">Meal Manager-এ ব্যবহৃত প্রযুক্তি</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {techStack.map((tech, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:-translate-y-1 transition-transform text-center">
                <div className="text-3xl mb-3">{tech.icon}</div>
                <p className="font-black text-slate-800 text-sm">{tech.name}</p>
                <p className="text-xs text-slate-500 mt-1">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* App Stats */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[2rem] p-10 text-white text-center shadow-2xl shadow-indigo-200">
          <h2 className="text-2xl font-black mb-8">Meal Manager সম্পর্কে</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '১০০%', label: 'বাংলাদেশি প্রজেক্ট' },
              { value: 'PWA', label: 'অ্যাপ ইনস্টলযোগ্য' },
              { value: 'অফলাইন', label: 'সাপোর্ট আছে' },
              { value: 'ফ্রি', label: '৩০ দিনের ট্রায়াল' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-3xl font-black">{stat.value}</p>
                <p className="text-indigo-200 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">💬</div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Contact Developer</h2>
            <p className="text-slate-500 text-sm">Fill out the form — clicking Submit will open WhatsApp with all your details ready to send.</p>
          </div>
          <form onSubmit={handleWhatsApp} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Your Name *</label>
                <input name="name" value={form.name} onChange={handleFormChange} required placeholder="e.g. Rahel Islam" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Phone Number *</label>
                <input name="phone" value={form.phone} onChange={handleFormChange} required placeholder="01XXXXXXXXX" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">Mess / Hostel Name</label>
              <input name="mess" value={form.mess} onChange={handleFormChange} placeholder="e.g. DU Hostel, Room 6" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">Message / Question *</label>
              <textarea name="message" value={form.message} onChange={handleFormChange} required rows={4} placeholder="e.g. I have 15 members in my mess. I want to know about premium pricing." className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none" />
            </div>
            <button type="submit" className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-black text-lg py-4 rounded-2xl hover:shadow-xl hover:shadow-green-200 hover:scale-[1.02] transition-all transform-gpu">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Send Message on WhatsApp
            </button>
            <p className="text-center text-slate-400 text-xs">Usually replies within 24 hours.</p>
          </form>
        </div>
      </main>

      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-200 bg-white mt-12">
        <p>&copy; {new Date().getFullYear()} Meal Manager by Shipon Talukdar. সর্বস্বত্ব সংরক্ষিত।</p>
        <div className="flex justify-center gap-6 mt-3">
          <Link to="/" className="hover:text-indigo-600 transition-colors">হোম</Link>
          <Link to="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-indigo-600 transition-colors">Terms</Link>
        </div>
      </footer>
    </motion.div>
  );
}
