import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, Plus, Users, UserPlus, FileText, 
  Wallet, CreditCard, CheckCircle, Loader2, Clock, X, XCircle 
} from 'lucide-react';
import { safeNum, safeStr, formatDate } from '../../utils/formatters';
import EmptyState from './Shared/EmptyState';


export default function BazarSection({
  isManager,
  loggedInMember,
  members,
  bazarList,
  bazarRequests,
  monthlyBazarList,
  cashBazar,
  creditBazarTotal,
  bazarFilter,
  setBazarFilter,
  bazarSearchMember,
  setBazarSearchMember,
  bazarSearchDate,
  setBazarSearchDate,
  getMemberName,
  setSelectedBazarDetail,
  setSelectedReceipt,
  removeBazar,
  handleApproveBazarRequest,
  handleRejectBazarRequest,
  submitBazarRequest,
  addBazar,
  bazarRows,
  setBazarRows,
  handlePhotoUpload,
  bazarPhotoBase64,
  isBazarSubmitting,
  isBazarReqSubmitting,
  setShowBazarMemberModal,
  selectedBazarMembers
}) {
  const renderBazarItem = (i) => (
    <div key={i.id} onClick={(e) => {
      if (e.target.closest('button')) return;
      setSelectedBazarDetail(i);
    }} className="p-4 flex justify-between items-center hover:bg-slate-50 relative cursor-pointer group transition-colors border-b border-slate-100 last:border-0 w-full bg-white animate-in fade-in">
      <div className="flex flex-col">
        <span className="font-bold text-slate-700 text-sm group-hover:text-indigo-600 transition-colors">{i.items && i.items.length > 0 ? `${i.items.length}টি আইটেম` : safeStr(i.item)}</span>
        <span className="text-[10px] text-slate-400 font-medium">
          {getMemberName(i.memberId)} • {formatDate(i.date)}
        </span>
        {safeNum(i.sharedCount) > 1 && (
          <span className="mt-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full w-max">
            {safeNum(i.sharedCount)} জনে ভাগ করা বাজার
          </span>
        )}
        {i.photo && (
          <button onClick={(e) => { e.stopPropagation(); setSelectedReceipt(i.photo); }} className="mt-1 text-[10px] text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded flex items-center gap-1 w-max active:scale-95 transition"><FileText size={10} /> রসিদ দেখুন</button>
        )}
      </div>
      <div className="text-right flex flex-col items-end gap-1">
        <span className="font-black text-slate-800 text-sm bg-slate-100 px-2 py-1 rounded-lg block w-max">৳{safeNum(i.amount)}</span>
        <span className={`text-[9px] uppercase font-black tracking-wider mt-1 block ${i.type === 'credit' ? 'text-rose-500' : 'text-emerald-500'}`}>
          {i.type === 'credit' ? 'বাকি' : 'নগদ'}
        </span>
        {isManager && (
          <button onClick={(e) => { e.stopPropagation(); removeBazar(i.id); }} className="text-[10px] font-black text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-2 py-1 rounded-lg transition">
            ডিলিট
          </button>
        )}
      </div>
    </div>
  );

  return (
    <motion.div key="bazar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-6 transform-gpu">
      {isManager && (
        <div className="space-y-4">
          {bazarRequests.length > 0 && (
            <div className="bg-amber-50 p-6 rounded-[2rem] shadow-sm border border-amber-200">
              <h3 className="font-black text-amber-900 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-amber-500" /> বাজার রিকোয়েস্ট ({bazarRequests.length})
              </h3>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {bazarRequests
                  .slice()
                  .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
                  .map((req) => (
                    <div key={req.id} className="bg-white p-4 rounded-xl border border-amber-100 flex flex-col gap-3 shadow-sm content-visibility-auto">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm">{req.memberName || getMemberName(req.memberId)}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{formatDate(req.date)} • ৳{safeNum(req.amount)}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => setSelectedBazarDetail(req)} className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-100"><FileText size={14} /></button>
                          <button onClick={() => handleApproveBazarRequest(req)} className="bg-emerald-500 text-white p-1.5 rounded-lg shadow-sm hover:bg-emerald-600"><CheckCircle size={14} /></button>
                          <button onClick={() => handleRejectBazarRequest(req.id)} className="bg-rose-100 text-rose-500 p-1.5 rounded-lg hover:bg-rose-200"><XCircle size={14} /></button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-600 font-semibold truncate">{req.items && req.items.length > 0 ? `${req.items.length}টি আইটেম জমা দিয়েছে` : safeStr(req.item)}</p>
                        <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-1 rounded-full ${req.type === 'credit' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {req.type === 'credit' ? 'বাকি' : 'নগদ'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition transition-all transform-gpu duration-300 space-y-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2"><ShoppingCart size={18} className="text-indigo-600" /> বাজার খরচ</h3>
              <form onSubmit={addBazar} className="space-y-4">
                <div className="space-y-3">
                  {bazarRows.map((row, index) => (
                    <div key={row.id} className="flex flex-col gap-2 bg-white/80 p-3 rounded-xl border border-indigo-100 shadow-sm relative pt-4 mt-2">
                      <h4 className="text-[10px] font-black text-indigo-400 absolute -top-2 left-3 bg-white px-2 py-0.5 rounded border border-indigo-50">আইটেম {index + 1}</h4>
                      <div className="flex flex-col md:flex-row gap-2 mt-1">
                        <div className="flex-1">
                          <input value={row.item} onChange={e => { const newRows = [...bazarRows]; newRows[index].item = e.target.value; setBazarRows(newRows); }} placeholder="কী কিনেছেন?" className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm font-bold outline-none" required />
                        </div>
                        <div className="flex gap-2">
                          <div className="w-1/2 md:w-auto">
                            <input value={row.qty} onChange={e => { const newRows = [...bazarRows]; newRows[index].qty = e.target.value; setBazarRows(newRows); }} placeholder="পরিমাণ" className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm font-bold outline-none" required />
                          </div>
                          <div className="w-1/2 md:w-auto">
                            <input value={row.amount} type="text" inputMode="numeric" onChange={e => { const newRows = [...bazarRows]; newRows[index].amount = e.target.value; setBazarRows(newRows); }} placeholder="দাম" className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm font-black text-indigo-700 outline-none" required />
                          </div>
                        </div>
                      </div>
                      {bazarRows.length > 1 && (
                        <button type="button" onClick={() => setBazarRows(bazarRows.filter((_, i) => i !== index))} className="absolute -top-2 -right-2 p-1.5 text-rose-500 bg-white border border-rose-200 rounded-lg shadow-sm"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row justify-between shrink-0 items-center gap-2">
                  <button type="button" onClick={() => setBazarRows([...bazarRows, { id: Date.now(), item: '', amount: '', qty: '' }])} className="w-full sm:w-auto text-xs font-bold text-indigo-600 bg-indigo-50 border border-dashed border-indigo-200 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100"><Plus size={16} /> আইটেম যোগ করুন</button>
                  <div className="w-full sm:w-auto bg-green-50 border border-green-200 px-4 py-2 rounded-xl flex items-center justify-between sm:justify-start gap-4">
                    <span className="text-xs font-bold text-green-700">মোট খরচ:</span>
                    <span className="text-lg font-black text-green-700">৳{bazarRows.reduce((a, b) => a + Number(b.amount || 0), 0)}</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-indigo-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-700">কে বাজার করেছে?</p>
                      <p className="text-[9px] text-slate-400 font-medium">নিজে বা অন্যের নাম দিন</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowBazarMemberModal(true)} className={`px-3 py-2 rounded-lg border font-bold text-[11px] flex items-center gap-1.5 shrink-0 ${selectedBazarMembers.length > 0 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200'}`}>
                    <UserPlus size={14} />
                    {selectedBazarMembers.length > 0 ? `${selectedBazarMembers.length} জন সিলেক্টেড` : 'সিলেক্ট করুন'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block">তারিখ</label>
                    <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-xs font-bold outline-none" required />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block">মেমো (অপশনাল)</label>
                    <div className="bg-white border border-slate-200 p-1.5 rounded-xl flex items-center gap-2 relative overflow-hidden cursor-pointer h-[38px]">
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 w-full h-full opacity-0" />
                      <div className={`w-6 h-6 rounded shrink-0 flex items-center justify-center ${bazarPhotoBase64 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                        {bazarPhotoBase64 ? <CheckCircle size={14} /> : <FileText size={14} />}
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 truncate mr-1">{bazarPhotoBase64 ? 'ছবি আছে' : 'ছবি দিন'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer [&:has(input:checked)]:border-emerald-500 [&:has(input:checked)]:bg-emerald-50 text-emerald-600">
                    <input type="radio" name="type" value="cash" defaultChecked className="w-4 h-4 accent-emerald-500 shrink-0 ml-1" />
                    <span className="font-bold text-slate-700 text-[11px]"><Wallet size={12} className="inline mr-1 text-emerald-500" /> নগদ</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer [&:has(input:checked)]:border-rose-500 [&:has(input:checked)]:bg-rose-50 text-rose-500">
                    <input type="radio" name="type" value="credit" className="w-4 h-4 accent-rose-500 shrink-0 ml-1" />
                    <span className="font-bold text-slate-700 text-[11px]"><CreditCard size={12} className="inline mr-1 text-rose-500" /> বাকি</span>
                  </label>
                </div>

                <button disabled={isBazarSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold text-sm shadow-md active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2">
                  {isBazarSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'বাজার সেভ করুন'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {!isManager && loggedInMember && (
        <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-700 flex items-center gap-2"><ShoppingCart size={18} className="text-indigo-600" /> বাজার রিকোয়েস্ট পাঠান</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">আপনি বাজার করলে এখান থেকে জমা দিন। ম্যানেজার approve করলে সেটা মূল বাজার তালিকায় যোগ হবে।</p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-100">approve লাগবে</span>
          </div>
          <form onSubmit={submitBazarRequest} className="space-y-4">
            <div className="space-y-3">
              {bazarRows.map((row, index) => (
                <div key={row.id} className="flex flex-col gap-2 bg-white/80 p-3 rounded-xl border border-indigo-100 shadow-sm relative pt-4 mt-2">
                  <h4 className="text-[10px] font-black text-indigo-400 absolute -top-2 left-3 bg-white px-2 py-0.5 rounded border border-indigo-50">আইটেম {index + 1}</h4>
                  <div className="flex flex-col md:flex-row gap-2 mt-1">
                    <div className="flex-1">
                      <input value={row.item} onChange={e => { const newRows = [...bazarRows]; newRows[index].item = e.target.value; setBazarRows(newRows); }} placeholder="কী কিনেছেন?" className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm font-bold outline-none" required />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-1/2 md:w-auto">
                        <input value={row.qty} onChange={e => { const newRows = [...bazarRows]; newRows[index].qty = e.target.value; setBazarRows(newRows); }} placeholder="পরিমাণ" className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm font-bold outline-none" required />
                      </div>
                      <div className="w-1/2 md:w-auto">
                        <input value={row.amount} type="text" inputMode="numeric" onChange={e => { const newRows = [...bazarRows]; newRows[index].amount = e.target.value; setBazarRows(newRows); }} placeholder="দাম" className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm font-black text-indigo-700 outline-none" required />
                      </div>
                    </div>
                  </div>
                  {bazarRows.length > 1 && (
                    <button type="button" onClick={() => setBazarRows(bazarRows.filter((_, i) => i !== index))} className="absolute -top-2 -right-2 p-1.5 text-rose-500 bg-white border border-rose-200 rounded-lg shadow-sm"><X size={14} /></button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-between shrink-0 items-center gap-2">
              <button type="button" onClick={() => setBazarRows([...bazarRows, { id: Date.now(), item: '', amount: '', qty: '' }])} className="w-full sm:w-auto text-xs font-bold text-indigo-600 bg-indigo-50 border border-dashed border-indigo-200 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100"><Plus size={16} /> আইটেম যোগ করুন</button>
              <div className="w-full sm:w-auto bg-green-50 border border-green-200 px-4 py-2 rounded-xl flex items-center justify-between sm:justify-start gap-4">
                <span className="text-xs font-bold text-green-700">মোট খরচ:</span>
                <span className="text-lg font-black text-green-700">৳{bazarRows.reduce((a, b) => a + safeNum(b.amount), 0)}</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-black">
                  {safeStr(loggedInMember.name).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{safeStr(loggedInMember.name)}</p>
                  <p className="text-[9px] font-bold text-indigo-500">আপনার নামে জমা হবে</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block">তারিখ</label>
                <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-xs font-bold outline-none" required />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block">মেমো (অপশনাল)</label>
                <div className="bg-white border border-slate-200 p-1.5 rounded-xl flex items-center gap-2 relative overflow-hidden cursor-pointer h-[38px]">
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 w-full h-full opacity-0" />
                  <div className={`w-6 h-6 rounded shrink-0 flex items-center justify-center ${bazarPhotoBase64 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                    {bazarPhotoBase64 ? <CheckCircle size={14} /> : <FileText size={14} />}
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 truncate mr-1">{bazarPhotoBase64 ? 'ছবি আছে' : 'ছবি দিন'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer [&:has(input:checked)]:border-emerald-500 [&:has(input:checked)]:bg-emerald-50 text-emerald-600">
                <input type="radio" name="type" value="cash" defaultChecked className="w-4 h-4 accent-emerald-500 shrink-0 ml-1" />
                <span className="font-bold text-slate-700 text-[11px]"><Wallet size={12} className="inline mr-1 text-emerald-500" /> নগদ</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer [&:has(input:checked)]:border-rose-500 [&:has(input:checked)]:bg-rose-50 text-rose-500">
                <input type="radio" name="type" value="credit" className="w-4 h-4 accent-rose-500 shrink-0 ml-1" />
                <span className="font-bold text-slate-700 text-[11px]"><CreditCard size={12} className="inline mr-1 text-rose-500" /> বাকি</span>
              </label>
            </div>

            <button disabled={isBazarReqSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold text-sm shadow-md active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2">
              {isBazarReqSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'রিকোয়েস্ট পাঠান'}
            </button>
          </form>
        </div>
      )}
      {/* Bazar Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 sm:p-6 rounded-[2rem] shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] border border-emerald-400 flex flex-col justify-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-xl -mr-8 -mt-8"></div>
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-100 mb-1 relative z-10">মোট নগদ বাজার</p>
          <h3 className="text-2xl sm:text-3xl font-black relative z-10">৳{cashBazar}</h3>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-red-600 p-5 sm:p-6 rounded-[2rem] shadow-[0_10px_20px_-10px_rgba(244,63,94,0.5)] border border-rose-400 flex flex-col justify-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-xl -mr-8 -mt-8"></div>
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-rose-100 mb-1 relative z-10">মোট বাকি বাজার</p>
          <h3 className="text-2xl sm:text-3xl font-black relative z-10">৳{creditBazarTotal}</h3>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex bg-white/80 p-1 rounded-2xl shadow-sm border border-slate-200 mx-auto w-full max-md relative">
            <button onClick={() => setBazarFilter('all')} className={`flex-1 py-3 rounded-[14px] text-[11px] font-black uppercase transition-all duration-300 ${bazarFilter === 'all' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>সব বাজার</button>
            <button onClick={() => setBazarFilter('cash')} className={`flex-1 py-3 rounded-[14px] text-[11px] font-black uppercase transition-all duration-300 ${bazarFilter === 'cash' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>নগদ বাজার</button>
            <button onClick={() => setBazarFilter('credit')} className={`flex-1 py-3 rounded-[14px] text-[11px] font-black uppercase transition-all duration-300 ${bazarFilter === 'credit' ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>বাকি বাজার</button>
          </div>

          <div className="flex gap-2 w-full">
            <select value={bazarSearchMember} onChange={e => setBazarSearchMember(e.target.value)} className="p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 outline-none flex-1 shadow-inner bg-white">
              <option value="">সব মেম্বার</option>
              {members.map(m => <option key={m.id} value={m.id}>{safeStr(m.name)}</option>)}
            </select>
            <input type="date" value={bazarSearchDate} onChange={e => setBazarSearchDate(e.target.value)} className="p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 outline-none flex-1 shadow-inner bg-white" />
            {(bazarSearchMember || bazarSearchDate || bazarFilter !== 'all') && (
              <button onClick={() => { setBazarSearchMember(''); setBazarSearchDate(''); setBazarFilter('all'); }} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition shadow-sm"><X size={16} /></button>
            )}
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto w-full">
          {(() => {
            const filteredBazars = monthlyBazarList.slice()
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .filter(b => {
                const matchDate = bazarSearchDate ? b.date === bazarSearchDate : true;
                const matchMember = bazarSearchMember ? b.memberId === bazarSearchMember : true;
                return matchDate && matchMember;
              });

            if (bazarFilter === 'all') {
              const cashBazars = filteredBazars.filter(b => b.type !== 'credit');
              const creditBazars = filteredBazars.filter(b => b.type === 'credit');
              return (
                <div className="flex flex-col w-full animate-in fade-in">
                  <div className="bg-emerald-50 text-emerald-700 p-2 px-4 font-black text-xs uppercase tracking-widest border-y border-emerald-100 w-full sticky top-0 z-10 backdrop-blur-md bg-emerald-50/90">নগদ বাজার শাখা</div>
                  {cashBazars.length > 0 ? cashBazars.map(renderBazarItem) : <p className="text-center text-slate-400 text-xs italic py-6 bg-white w-full">কোনো নগদ বাজার নেই</p>}

                  <div className="bg-rose-50 text-rose-700 p-2 px-4 font-black text-xs uppercase tracking-widest border-y border-rose-100 w-full sticky top-0 z-10 backdrop-blur-md bg-rose-50/90">বাকি বাজার শাখা</div>
                  {creditBazars.length > 0 ? creditBazars.map(renderBazarItem) : <p className="text-center text-slate-400 text-xs italic py-6 bg-white w-full">কোনো বাকি বাজার নেই</p>}
                </div>
              );
            } else {
              const items = filteredBazars.filter(b => bazarFilter === 'cash' ? b.type !== 'credit' : b.type === 'credit');
              return items.length > 0 ? items.map(renderBazarItem) : <p className="text-center text-slate-400 text-xs italic py-8 bg-white w-full">কোনো বাজার নেই</p>;
            }
          })()}
        </div>
      </div>
    </motion.div>
  );
}
