import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Mail, Phone, MapPin, ArrowRight, Zap } from 'lucide-react';
import { getWhatsAppSupportUrl } from '../constants/support';
import SEO from '../components/SEO';

export default function Contact() {
  const [contact, setContact] = useState({ name: '', mess: '', phone: '', message: '' });


  const whatsappText = useMemo(
    () =>
      `আসসালামু আলাইকুম, মিল ম্যানেজার সম্পর্কে জানতে চাই।
      
নাম: ${contact.name}
মেস/হোস্টেল: ${contact.mess}
ফোন: ${contact.phone}
বার্তা: ${contact.message}`,
    [contact],
  );

  const handleWhatsApp = (event) => {
    event.preventDefault();
    window.open(getWhatsAppSupportUrl(whatsappText), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-200">
      <SEO 
        title="Contact Support | #1 Digital Mess App"
        description="Have questions about Meal Manager? Contact our support team for help with mess management, premium pricing, or technical issues."
        canonical="https://mealmanager.eu.cc/contact"
      />
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-indigo-400 mb-6">
            Help Center
          </div>
          <h1 className="text-4xl font-black text-white sm:text-6xl mb-6">আমাদের সাথে যোগাযোগ করুন</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            বিল বা হিসাব নিয়ে কোনো প্রশ্ন আছে? অথবা প্রিমিয়াম প্ল্যান নিয়ে জানতে চান? আমরা আপনাকে সাহায্য করতে পারি।
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Info Side */}
          <div className="space-y-8">
            <div className="p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm group hover:border-indigo-500/30 transition-all">
              <Phone className="text-indigo-400 mb-4" size={24} />
              <h3 className="text-xl font-black text-white mb-2">সরাসরি কল</h3>
              <p className="text-slate-400">+8801570215792</p>
            </div>
            
            <div className="p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm group hover:border-violet-500/30 transition-all">
              <Mail className="text-violet-400 mb-4" size={24} />
              <h3 className="text-xl font-black text-white mb-2">ইমেইল</h3>
              <p className="text-slate-400">shipontalukdaroffice@gmail.com</p>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 border border-white/5">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">ইনস্ট্যান্ট সাপোর্ট</h3>
                  <p className="text-sm text-slate-500">Fast Response Time</p>
                </div>
              </div>
              <p className="text-slate-400 leading-relaxed mb-8">
                মেস ম্যানেজারের যেকোনো ফিচারের ব্যবহার বিধি জানতে বা ট্রায়াল পিরিয়ড বাড়ানো নিয়ে কথা বলতে আমাদের মেসেজ দিন।
              </p>
              <button 
                onClick={handleWhatsApp}
                className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 rounded-2xl font-black hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/20"
              >
                হোয়াটসঅ্যাপে কথা বলুন
                <MessageCircle size={20} />
              </button>
            </div>
          </div>

          {/* Form Side */}
          <form onSubmit={handleWhatsApp} className="p-8 lg:p-12 rounded-[3rem] border border-white/10 bg-white/5 backdrop-blur-xl">
              <h3 className="text-2xl font-black text-white mb-8">মেসেজ পাঠান</h3>
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-4">আপনার নাম</label>
                  <input
                    name="name"
                    value={contact.name}
                    onChange={(e) => setContact({...contact, name: e.target.value})}
                    placeholder="আপনার নাম লিখুন"
                    required
                    className="w-full rounded-2xl border border-white/5 bg-slate-900/50 px-6 py-4 text-white outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-4">ফোন নাম্বার</label>
                  <input
                    name="phone"
                    value={contact.phone}
                    onChange={(e) => setContact({...contact, phone: e.target.value})}
                    placeholder="017XXXXXXXX"
                    required
                    className="w-full rounded-2xl border border-white/5 bg-slate-900/50 px-6 py-4 text-white outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-4">মেসেজ</label>
                  <textarea
                    name="message"
                    rows={4}
                    value={contact.message}
                    onChange={(e) => setContact({...contact, message: e.target.value})}
                    placeholder="আপনি কি জানতে চান লিখুন..."
                    required
                    className="w-full rounded-2xl border border-white/5 bg-slate-900/50 px-6 py-4 text-white outline-none focus:border-indigo-500/50 transition-all resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-5 text-lg font-black text-slate-950 transition hover:bg-slate-200"
                >
                  Send Inquiry
                  <ArrowRight size={20} />
                </button>
              </div>
          </form>
        </div>
      </div>
    </div>
  );
}
