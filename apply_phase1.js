import fs from 'fs';
const file = 'src/pages/MealApp.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add EmptyState component
const emptyStateCode = `
// --- Empty State Component ---
const EmptyState = ({ icon: Icon, title, subtitle, color = 'indigo' }) => {
  const cm = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-500', border: 'border-indigo-200', sub: 'text-indigo-300' },
    rose:   { bg: 'bg-rose-50',   text: 'text-rose-500',   border: 'border-rose-200',   sub: 'text-rose-300' },
    emerald:{ bg: 'bg-emerald-50',text: 'text-emerald-500',border: 'border-emerald-200',sub: 'text-emerald-300' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-500',  border: 'border-amber-200',  sub: 'text-amber-300' },
    slate:  { bg: 'bg-slate-50',  text: 'text-slate-400',  border: 'border-slate-200',  sub: 'text-slate-300' },
  };
  const c = cm[color] || cm.indigo;
  return (
    <div className={\`flex flex-col items-center justify-center py-14 px-6 rounded-3xl border-2 border-dashed \${c.border} \${c.bg}\`}>
      <div className={\`w-16 h-16 rounded-2xl \${c.bg} border \${c.border} flex items-center justify-center mb-4 shadow-sm \${c.text}\`}>
        {Icon && <Icon size={32} strokeWidth={1.5} />}
      </div>
      <p className={\`font-black text-base \${c.text} mb-1 text-center\`}>{title}</p>
      {subtitle && <p className={\`text-xs font-medium text-center max-w-[200px] \${c.sub}\`}>{subtitle}</p>}
    </div>
  );
};

// --- Helper: Robust Safe Data Rendering (CRASH PROTECTION) ---`;

content = content.replace('// --- Helper: Robust Safe Data Rendering (CRASH PROTECTION) ---', emptyStateCode);

// 2. Add State variables
const stateHookTarget = `  const [pendingWrites, setPendingWrites] = useState(0);`;
const stateHookReplacement = `  const [pendingWrites, setPendingWrites] = useState(0);
  const [recentlySavedMeals, setRecentlySavedMeals] = useState({});
  const [isBazarSubmitting, setIsBazarSubmitting] = useState(false);
  const [isBazarReqSubmitting, setIsBazarReqSubmitting] = useState(false);
  const [isFineSubmitting, setIsFineSubmitting] = useState(false);`;

content = content.replace(stateHookTarget, stateHookReplacement);

// 3. updateMeal logic
const updateMealTarget = `    setMeals((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [mId]: nextCount,
      },
    }));

    runInBackground(`;

const updateMealReplacement = `    setMeals((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [mId]: nextCount,
      },
    }));

    setRecentlySavedMeals(prev => ({ ...prev, [mId]: true }));
    setTimeout(() => setRecentlySavedMeals(prev => {
      const next = { ...prev }; delete next[mId]; return next;
    }), 1600);

    runInBackground(`;

content = content.replace(updateMealTarget, updateMealReplacement);

// 4. addFine logic
const addFineRegex = /const addFine = async \(e\) => {[\s\S]*?e\.target\.reset\(\);\n  };/;
const addFineReplacement = `const addFine = async (e) => {
    e.preventDefault();
    setIsFineSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'fines'), {
        memberId: e.target.memberId.value,
        reason: e.target.reason.value,
        mealCount: Number(e.target.mealCount.value || 2),
        date: e.target.date.value || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });
      e.target.reset();
      showToast('দণ্ড সফলভাবে যোগ হয়েছে!', 'success');
    } catch (err) {
      showToast('দণ্ড যোগ করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setIsFineSubmitting(false);
    }
  };`;
content = content.replace(addFineRegex, addFineReplacement);

// 5. addDeposit logic
const addDepositTarget = `    setDeposits((prev) => [optimisticDeposit, ...prev]);
    form.reset();
    runInBackground(`;
const addDepositReplacement = `    setDeposits((prev) => [optimisticDeposit, ...prev]);
    form.reset();
    showToast('টাকা জমা সফল হয়েছে!', 'success');
    runInBackground(`;
content = content.replace(addDepositTarget, addDepositReplacement);

// 6. addBazar logic
const addBazarTarget = `    setBazarList((prev) => [...optimisticEntries, ...prev]);
    setBazarRows([{ id: Date.now(), item: '', amount: '', qty: '' }]);
    setBazarPhotoBase64('');
    setSelectedBazarMembers([]);
    form.reset();

    runInBackground(`;
const addBazarReplacement = `    setBazarList((prev) => [...optimisticEntries, ...prev]);
    setBazarRows([{ id: Date.now(), item: '', amount: '', qty: '' }]);
    setBazarPhotoBase64('');
    setSelectedBazarMembers([]);
    form.reset();
    setIsBazarSubmitting(true);
    
    runInBackground(
      async () => {
        // execute batch
        const batch = writeBatch(db);
        optimisticEntries.forEach((entry) => {
          const docRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'bazar'), entry.id);
          batch.set(docRef, { ...entry, id: undefined });
        });
        await batch.commit();
        setIsBazarSubmitting(false);
        showToast('বাজার সেভ হয়েছে!', 'success');
      },
      () => {
        const optimisticIds = new Set(optimisticEntries.map((item) => item.id));
        setBazarList((prev) => prev.filter((item) => !optimisticIds.has(item.id)));
        setIsBazarSubmitting(false);
        showToast("বাজার সেভ করতে সমস্যা হয়েছে।", 'error');
      }
    );
     // DO NOT RUN ORIGINAL RUNINBACKGROUND
     return;
  };
   const OLD_RUN_BG_MARKER_IGNORE = () => {  runInBackground(`;
// We actually just need to inject the toast and state inside the original callbacks. Wait, easier:
content = content.replace(/setBazarList\(\(prev\) => \[\.\.\.optimisticEntries, \.\.\.prev\]\);\s*setBazarRows\(\[\{ id: Date\.now\(\), item: '', amount: '', qty: '' \}\]\);\s*setBazarPhotoBase64\(''\);\s*setSelectedBazarMembers\(\[\]\);\s*form\.reset\(\);\s*runInBackground\([\s\S]*?showToast\("বাজার সেভ করতে সমস্যা হয়েছে।", 'error'\);\s*\}\s*\);\s*\};/, 
`    setBazarList((prev) => [...optimisticEntries, ...prev]);
    setBazarRows([{ id: Date.now(), item: '', amount: '', qty: '' }]);
    setBazarPhotoBase64('');
    setSelectedBazarMembers([]);
    form.reset();
    setIsBazarSubmitting(true);

    runInBackground(
      async () => {
        const batch = writeBatch(db);
        optimisticEntries.forEach((entry) => {
          const docRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'bazar'), entry.id);
          batch.set(docRef, { ...entry, id: undefined });
        });
        await batch.commit();
        setIsBazarSubmitting(false);
        showToast('বাজার সেভ হয়েছে!', 'success');
      },
      () => {
        const optimisticIds = new Set(optimisticEntries.map((item) => item.id));
        setBazarList((prev) => prev.filter((item) => !optimisticIds.has(item.id)));
        setIsBazarSubmitting(false);
        showToast("বাজার সেভ করতে সমস্যা হয়েছে।", 'error');
      }
    );
  };`);

// 7. submitBazarRequest logic
content = content.replace(/setBazarRequests\(\(prev\) => \[\optimisticRequest, \.\.\.prev\]\);\s*setBazarRows\(\[\{ id: Date\.now\(\), item: '', amount: '', qty: '' \}\]\);\s*setBazarPhotoBase64\(''\);\s*form\.reset\(\);\s*runInBackground\([\s\S]*?showToast\("বাজার রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।", 'error'\);\s*\}\s*\);\s*\};/, 
`    setBazarRequests((prev) => [optimisticRequest, ...prev]);
    setBazarRows([{ id: Date.now(), item: '', amount: '', qty: '' }]);
    setBazarPhotoBase64('');
    form.reset();
    setIsBazarReqSubmitting(true);

    runInBackground(
      () =>
        addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bazar_requests'), {
          item: optimisticRequest.item,
          items: optimisticRequest.items,
          amount: optimisticRequest.amount,
          memberId: optimisticRequest.memberId,
          memberName: optimisticRequest.memberName,
          memberUid: optimisticRequest.memberUid,
          date: optimisticRequest.date,
          type: optimisticRequest.type,
          photo: optimisticRequest.photo,
          status: optimisticRequest.status,
          createdAt: optimisticRequest.createdAt,
        }).then(() => {
          setIsBazarReqSubmitting(false);
          showToast('বাজার রিকোয়েস্ট পাঠানো হয়েছে!', 'success');
        }),
      () => {
        setBazarRequests((prev) => prev.filter((item) => item.id !== optimisticRequest.id));
        setIsBazarReqSubmitting(false);
        showToast("বাজার রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।", 'error');
      }
    );
  };`);

// 8. Progressbar animation in HTML and tab transitioning
const tabPendingTarget = `        <main className={\`relative z-10 max-w-7xl mx-auto px-4 pt-4 pb-6 md:p-8 space-y-8 transition-opacity duration-150 \${isTabPending ? 'opacity-85' : 'opacity-100'}\`}>`;
const tabPendingReplacement = `
        {/* Tab Switch Progress Bar */}
        {isTabPending && (
          <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] overflow-hidden pointer-events-none">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-400 to-indigo-600 w-full" style={{animation: 'tab-progress 0.4s ease-out forwards'}} />
          </div>
        )}

        <main className={\`relative z-10 max-w-7xl mx-auto px-4 pt-4 pb-6 md:p-8 space-y-8 transition-all duration-200 \${isTabPending ? 'opacity-60 scale-[0.997] blur-[0.5px]' : 'opacity-100 scale-100 blur-0'}\`}>`;

content = content.replace(tabPendingTarget, tabPendingReplacement);

// 9. Meal flash card logic
const mealCardRegex = /<div key=\{m\.id\} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center animate-in fade-in">/g;
const mealCardReplacement = `<div key={m.id} className={\`relative p-4 rounded-2xl shadow-sm border-2 flex justify-between items-center transition-all duration-300 ease-out \${recentlySavedMeals[m.id] ? 'border-emerald-400 bg-emerald-50/80 scale-[1.01]' : 'border-slate-100 bg-white'}\`}>\n                    {recentlySavedMeals[m.id] && (<span className="absolute top-1.5 right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 z-10"><CheckCircle size={8}/> সেভ!</span>)}`;
content = content.replace(mealCardRegex, mealCardReplacement);

// Fix empty members list
content = content.replace(/{members.length === 0 \? <p className="p-10 text-center text-slate-400 italic">মেম্বার যোগ করা নেই।<\/p> :/g, 
`{members.length === 0 ? <EmptyState icon={Utensils} title="কোনো মেম্বার নেই" subtitle="Settings থেকে মেম্বার যোগ করুন" color="indigo" /> :`);

// Add today total
const dateSelectTarget = `              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-2 rounded-xl bg-slate-50 font-bold text-slate-700 outline-none text-center" />`;
const dateSelectReplacement = `              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-2 rounded-xl bg-slate-50 font-bold text-slate-700 outline-none text-center" />
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shrink-0 tabular-nums">
                {Object.values(meals[selectedDate] || {}).reduce((a, b) => a + safeNum(b), 0)} মিল
              </span>`;
content = content.replace(dateSelectTarget, dateSelectReplacement);


// Window confirm logic
content = content.replace(/if\(window\.confirm\('Notice মুছে ফেলতে চান\?'\)\)/g, "if(await showConfirm({ message: 'Notice মুছে ফেলতে চান?' }))");

fs.writeFileSync(file, content);
console.log('Patch successfully applied to MealApp.jsx');
