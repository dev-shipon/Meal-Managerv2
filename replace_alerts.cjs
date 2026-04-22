/**
 * Script to replace all alert() and window.confirm() calls in the meal app
 * with showToast() and showConfirm() respectively.
 * Run from the meal-app directory.
 */
const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let count = 0;
  for (const [from, to] of replacements) {
    const before = content;
    content = content.split(from).join(to);
    if (content !== before) count++;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ ${filePath}: ${count} replacement(s)`);
  return count;
}

// ---- Login.jsx ----
replaceInFile('src/pages/Login.jsx', [
  [
    `alert('লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');`,
    `showToast('লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।', 'error');`,
  ],
]);

// ---- JoinMess.jsx ----
replaceInFile('src/pages/JoinMess.jsx', [
  [
    `import { ShieldCheck, UserPlus, Phone, CheckCircle, User } from 'lucide-react';`,
    `import { ShieldCheck, UserPlus, Phone, CheckCircle, User } from 'lucide-react';\nimport { useToast } from '../contexts/ToastContext';`,
  ],
  [
    `  const [group, setGroup] = useState(null);`,
    `  const { showToast } = useToast();\n  const [group, setGroup] = useState(null);`,
  ],
  [
    `      return alert("অনুগ্রহ করে সঠিক মোবাইল নম্বর দিন।");`,
    `      { showToast("অনুগ্রহ করে সঠিক মোবাইল নম্বর দিন।", "warning"); return; }`,
  ],
  [
    `      return alert("অনুগ্রহ করে আপনার নাম দিন।");`,
    `      { showToast("অনুগ্রহ করে আপনার নাম দিন।", "warning"); return; }`,
  ],
  [
    `      return alert('মেস আইডি সঠিক নয়। লিংক বা আইডি আবার চেক করুন।');`,
    `      { showToast('মেস আইডি সঠিক নয়। লিংক বা আইডি আবার চেক করুন।', 'error'); return; }`,
  ],
  [
    `      alert("রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।");`,
    `      showToast("রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।", "error");`,
  ],
]);

// ---- MealApp.jsx — Add imports ----
{
  let content = fs.readFileSync('src/pages/MealApp.jsx', 'utf8');
  
  // Add import after the existing imports block (near line 20)
  const importTarget = `import { generateGeminiText } from '../services/geminiService';`;
  const importReplacement = `import { generateGeminiText } from '../services/geminiService';\nimport { useToast } from '../contexts/ToastContext';\nimport { useConfirm } from '../contexts/ToastContext';`;
  content = content.split(importTarget).join(importReplacement);

  // Add hook inside MealApp function (after navigate)
  const hookTarget = `  const navigate = useNavigate();\n\n  const handleLogout`;
  const hookReplacement = `  const navigate = useNavigate();\n  const { showToast } = useToast();\n  const { showConfirm } = useConfirm();\n\n  const handleLogout`;
  content = content.split(hookTarget).join(hookReplacement);

  // ---- Replace all alert() calls ----
  const alertReplacements = [
    // success messages
    [`alert('Gemini API key সেভ হয়েছে। এখন আবার AI feature চালান।');`, `showToast('Gemini API key সেভ হয়েছে। এখন আবার AI feature চালান।', 'success');`],
    [`alert("AI suggestion failed: " + e.message);`, `showToast("AI suggestion ব্যর্থ হয়েছে। আবার চেষ্টা করুন।", "error");`],
    [`alert(\`নোটিশ আপডেট হয়েছে এবং \${emailsSent} জনকে ইমেইলে জানানো হয়েছে!\`);`, `showToast(\`নোটিশ আপডেট হয়েছে এবং \${emailsSent} জনকে ইমেইলে জানানো হয়েছে!\`, 'success');`],
    [`alert("নোটিশ আপডেট হয়েছে! (কারো ইমেইল না থাকায় মেইল পাঠানো যায়নি)");`, `showToast("নোটিশ আপডেট হয়েছে! (কারো ইমেইল না থাকায় মেইল পাঠানো যায়নি)", 'info');`],
    [`alert("শেষ তারিখ আপডেট সফল!");`, `showToast("শেষ তারিখ আপডেট সফল!", 'success');`],
    [`alert("বিল আপডেট সফল!");`, `showToast("বিল আপডেট সফল!", 'success');`],
    [`alert(\`⚠️ এই ইমেইল (\${trimmedEmail}) দিয়ে ইতিমধ্যে একজন মেম্বার আছেন! ডুপ্লিকেট তৈরি হবে না।\`);`, `showToast(\`এই ইমেইল (\${trimmedEmail}) দিয়ে ইতিমধ্যে একজন মেম্বার আছেন!\`, 'warning');`],
    [`alert('নতুন মেম্বার সফলভাবে যোগ করা হয়েছে!');`, `showToast('নতুন মেম্বার সফলভাবে যোগ করা হয়েছে!', 'success');`],
    [`alert('সমস্যা হয়েছে: ' + err.message);`, `showToast('মেম্বার যোগ করতে সমস্যা হয়েছে।', 'error');`],
    [`alert("Only the host can assign managers!");`, `showToast("শুধুমাত্র হোস্ট ম্যানেজার নির্ধারণ করতে পারবেন!", 'error');`],
    [`alert('\\u0985\\u09A8\\u09C1\\u0997\\u09CD\\u09B0\\u09B9 \\u0995\\u09B0\\u09C7 \\u09AE\\u09C7\\u09AE\\u09CD\\u09AC\\u09BE\\u09B0\\u09C7\\u09B0 \\u09A8\\u09BE\\u09AE \\u09A6\\u09BF\\u09A8\\u0964');`, `showToast('অনুগ্রহ করে মেম্বারের নাম দিন।', 'warning');`],
    [`alert("তথ্য আপডেট করা হয়েছে!");`, `showToast("তথ্য আপডেট করা হয়েছে!", 'success');`],
    [`alert("আপডেট ব্যর্থ হয়েছে!");`, `showToast("আপডেট ব্যর্থ হয়েছে!", 'error');`],
    [`alert("মিল আপডেট করতে সমস্যা হয়েছে।");`, `showToast("মিল আপডেট করতে সমস্যা হয়েছে।", 'error');`],
    [`alert("জমা সেভ করতে সমস্যা হয়েছে।");`, `showToast("জমা সেভ করতে সমস্যা হয়েছে।", 'error');`],
    [`alert("অন্তত একটি বাজার আইটেম দিন")`, `showToast("অন্তত একটি বাজার আইটেম দিন", 'warning')`],
    [`alert("অন্তত একজনকে নির্বাচন করুন")`, `showToast("অন্তত একজনকে নির্বাচন করুন", 'warning')`],
    [`alert("বাজার সেভ করতে সমস্যা হয়েছে।");`, `showToast("বাজার সেভ করতে সমস্যা হয়েছে।", 'error');`],
    [`alert("আপনার মেম্বার প্রোফাইল পাওয়া যায়নি।")`, `showToast("আপনার মেম্বার প্রোফাইল পাওয়া যায়নি।", 'error')`],
    [`alert("বাজার রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।");`, `showToast("বাজার রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।", 'error');`],
    [`alert("বাজার রিকোয়েস্ট approve করা হয়েছে।");`, `showToast("বাজার রিকোয়েস্ট approve করা হয়েছে।", 'success');`],
    [`alert("রিকোয়েস্ট approve করতে সমস্যা হয়েছে।");`, `showToast("রিকোয়েস্ট approve করতে সমস্যা হয়েছে।", 'error');`],
    [`alert("রিকোয়েস্ট reject করতে সমস্যা হয়েছে।");`, `showToast("রিকোয়েস্ট reject করতে সমস্যা হয়েছে।", 'error');`],
    [`alert("বাজার delete করতে সমস্যা হয়েছে।");`, `showToast("বাজার delete করতে সমস্যা হয়েছে।", 'error');`],
    [`alert("দণ্ড মাফ করতে সমস্যা হয়েছে।");`, `showToast("দণ্ড মাফ করতে সমস্যা হয়েছে।", 'error');`],
    [`alert("ডাটা রিসেট সম্পন্ন!");`, `showToast("ডাটা রিসেট সম্পন্ন!", 'success');`],
    [`} catch (e) { alert("Reset Error: " + e.message); }`, `} catch (e) { showToast("রিসেট করতে সমস্যা হয়েছে।", 'error'); }`],
    [`alert("সম্ভাব্য মিলরেট দেখাতে এই মাসে অন্তত কিছু meal আর bazar data লাগবে।");`, `showToast("সম্ভাব্য মিলরেট দেখাতে এই মাসে অন্তত কিছু meal আর bazar data লাগবে।", 'warning');`],
    [`alert("Gemini API key পাওয়া যায়নি।");`, `showToast("Gemini API key পাওয়া যায়নি।", 'error');`],
    [`alert("পপ-আপ ব্লক করা হয়েছে! দয়া করে পপ-আপ এলাউ করুন বা ব্রাউজারের সেটিংস চেক করুন।");`, `showToast("পপ-আপ ব্লক করা হয়েছে! ব্রাউজারে পপ-আপ এলাউ করুন।", 'warning');`],
    [`alert("ইনভাইট লিংক কপি করা হয়েছে! মেম্বারদের পাঠিয়ে দিন।");`, `showToast("ইনভাইট লিংক কপি করা হয়েছে! মেম্বারদের পাঠিয়ে দিন।", 'success');`],
    [`alert("অটোমেটিক লিংক কপি করতে সমস্যা হয়েছে। দয়া করে নিচের বক্স থেকে লিংকটি সিলেক্ট করে কপি করুন।");`, `showToast("লিংক কপি করতে সমস্যা হয়েছে। নিচের বক্স থেকে কপি করুন।", 'warning');`],
    [`alert("ফ্রি প্ল্যানে সর্বোচ্চ ১০ জন মেম্বার অ্যাড করা যাবে।");`, `showToast("ফ্রি প্ল্যানে সর্বোচ্চ ১০ জন মেম্বার অ্যাড করা যাবে।", 'warning');`],
    [`alert("মেম্বার অ্যাপ্রুভ করতে সমস্যা হয়েছে।");`, `showToast("মেম্বার অ্যাপ্রুভ করতে সমস্যা হয়েছে।", 'error');`],
    [`alert("কোনো মেম্বারের ইমেইল অ্যাড্রেস যুক্ত নেই।");`, `showToast("কোনো মেম্বারের ইমেইল অ্যাড্রেস যুক্ত নেই।", 'warning');`],
    [`alert(\`সফলভাবে \${emailsSent} টি রিমাইন্ডার ইমেইল পাঠানো হয়েছে।\`);`, `showToast(\`সফলভাবে \${emailsSent} টি রিমাইন্ডার ইমেইল পাঠানো হয়েছে।\`, 'success');`],
    [`alert("ইমেইল পাঠাতে সমস্যা হয়েছে। ব্যাকএন্ড চেক করুন।");`, `showToast("ইমেইল পাঠাতে সমস্যা হয়েছে। ব্যাকএন্ড চেক করুন।", 'error');`],
    [`alert('মেস আইডি কপি হয়েছে!');`, `showToast('মেস আইডি কপি হয়েছে!', 'success');`],
    [`alert("মেস বা গ্রুপের নাম সফলভাবে আপডেট হয়েছে!");`, `showToast("মেস বা গ্রুপের নাম সফলভাবে আপডেট হয়েছে!", 'success');`],
    [`alert('??? ??? ???? ?????? ??????');`, `showToast('পরিমাণ ও মেম্বার দিন', 'warning');`],
    [`alert('??????? ? ?????? ???');`, `showToast('পরিমাণ ও মেম্বার দিন', 'warning');`],
    [`alert("বাজার সফলভাবে আপডেট হয়েছে!");`, `showToast("বাজার সফলভাবে আপডেট হয়েছে!", 'success');`],
    [`alert("আপডেট করতে সমস্যা হয়েছে।");`, `showToast("আপডেট করতে সমস্যা হয়েছে।", 'error');`],
    // Legacy copy alert
    [`navigator.clipboard.writeText(appId); alert('মেস আইডি কপি হয়েছে!');`, `navigator.clipboard.writeText(appId); showToast('মেস আইডি কপি হয়েছে!', 'success');`],
  ];

  for (const [from, to] of alertReplacements) {
    content = content.split(from).join(to);
  }

  fs.writeFileSync('src/pages/MealApp.jsx', content, 'utf8');
  console.log('✅ MealApp.jsx: alert() replacements done');
}

// ---- AdminPanel.jsx ----
{
  let content = fs.readFileSync('src/pages/AdminPanel.jsx', 'utf8');

  // Add import
  if (!content.includes("useToast")) {
    content = content.replace(
      `import React,`,
      `import { useToast } from '../contexts/ToastContext';\nimport React,`
    );
  }

  // Replace alert calls
  const adminReplacements = [
    [`alert(\`Storage scan failed: \${error.message}\`);`, `showToast('Storage scan ব্যর্থ হয়েছে।', 'error');`],
    [`alert(\`Cleanup failed: \${error.message}\`);`, `showToast('Cleanup ব্যর্থ হয়েছে।', 'error');`],
    [`alert(\`Delete failed: \${error.message}\`);`, `showToast('Delete ব্যর্থ হয়েছে।', 'error');`],
  ];

  for (const [from, to] of adminReplacements) {
    content = content.split(from).join(to);
  }

  fs.writeFileSync('src/pages/AdminPanel.jsx', content, 'utf8');
  console.log('✅ AdminPanel.jsx: alert() replacements done');
}

console.log('\n🎉 All replacements complete!');
