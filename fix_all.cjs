const fs = require('fs');

// ─── Fix MealApp.jsx ─────────────────────────────────────────────
{
  let c = fs.readFileSync('src/pages/MealApp.jsx', 'utf8');

  // 1. Add imports (already has useToast import but let's verify)
  if (!c.includes("from '../contexts/ToastContext'")) {
    c = c.replace(
      `import { generateGeminiText }`,
      `import { useToast, useConfirm } from '../contexts/ToastContext';\nimport { generateGeminiText }`
    );
  }

  // 2. Add hook declaration inside the MealApp function
  // The function starts with: export default function MealApp() {
  // We need to add hook after: const navigate = useNavigate();
  if (!c.includes('const { showToast }')) {
    c = c.replace(
      '  const navigate = useNavigate();\n',
      '  const navigate = useNavigate();\n  const { showToast } = useToast();\n  const { showConfirm } = useConfirm();\n'
    );
  }

  // 3. Replace remaining alert() calls using regex patterns
  // Pattern: alert("...") or alert('...')  or alert(`...`)
  
  // Simple string alerts - replace with showToast
  const alertMappings = [
    // Success
    [/alert\("(\u09ac\u09be\u099c\u09be\u09b0 \u09b8\u09ab\u09b2\u09ad\u09be\u09ac\u09c7 \u0986\u09aa\u09a1\u09c7\u099f \u09b9\u09af\u09bc\u09c7\u099b\u09c7!)"\)/, `showToast("বাজার সফলভাবে আপডেট হয়েছে!", 'success')`],
    [/alert\("(\u0986\u09aa\u09a1\u09c7\u099f \u0995\u09b0\u09a4\u09c7 \u09b8\u09ae\u09b8\u09cd\u09af\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964)"\)/, `showToast("আপডেট করতে সমস্যা হয়েছে।", 'error')`],
    // For deposit modal
    [/return alert\('([^']+)'\)/, (m, p1) => `return showToast('${p1}', 'warning')`],
    [/alert\('([^']+)'\)/, (m, p1) => `showToast('${p1}', 'success')`],
    [/alert\("([^"]+)"\)/, (m, p1) => `showToast("${p1}", 'info')`],
    [/alert\(`([^`]+)`\)/, (m, p1) => `showToast(\`${p1}\`, 'success')`],
  ];

  for (const [from, to] of alertMappings) {
    if (typeof to === 'function') {
      c = c.replace(from, to);
    } else {
      c = c.replace(new RegExp(from.source, from.flags), to);
    }
  }

  // Final sweep: replace any remaining alert( with showToast(
  // This handles edge cases
  c = c.replace(/\balert\(/g, 'showToast(');
  
  // Fix showToast calls that need a type
  // showToast("...", 'info') - already replaced
  // But some plain showToast("msg") without type - add default type
  // Actually the above mappings add types, so remaining ones may need fixing
  // Let's just do a final check
  
  fs.writeFileSync('src/pages/MealApp.jsx', c, 'utf8');
  
  const alertCount = (c.match(/\balert\(/g) || []).length;
  const toastCount = (c.match(/showToast\(/g) || []).length;
  console.log(`MealApp: ${alertCount} alerts remaining, ${toastCount} showToast calls`);
}

// ─── Fix Admin Panel ─────────────────────────────────────────────
{
  let c = fs.readFileSync('src/pages/AdminPanel.jsx', 'utf8');

  // Find AdminPanel function and add hook
  if (!c.includes('const { showToast } = useToast()')) {
    // Find where the component function starts
    const funcMatch = c.match(/export default function AdminPanel\(\) \{/);
    if (funcMatch) {
      c = c.replace(
        'export default function AdminPanel() {',
        'export default function AdminPanel() {\n  const { showToast } = useToast();'
      );
    } else {
      // Try other patterns
      const lines = c.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('function Admin') || lines[i].includes('const Admin')) {
          lines.splice(i + 1, 0, '  const { showToast } = useToast();');
          break;
        }
      }
      c = lines.join('\n');
    }
  }

  // Replace remaining alerts
  c = c.replace(/\balert\(/g, 'showToast(');
  
  // Fix showToast calls that don't have type
  // Pattern: showToast('message') → add type
  c = c.replace(/showToast\(`([^`]+) successfully deleted\.`\)/, "showToast('সফলভাবে ডিলিট হয়েছে!', 'success')");
  c = c.replace(/showToast\(`Storage scan failed: \${error\.message}`\)/, "showToast('Storage scan ব্যর্থ হয়েছে।', 'error')");
  c = c.replace(/showToast\(`Cleanup failed: \${error\.message}`\)/, "showToast('Cleanup ব্যর্থ হয়েছে।', 'error')");
  c = c.replace(/showToast\(`Delete failed: \${error\.message}`\)/, "showToast('Delete ব্যর্থ হয়েছে।', 'error')");

  fs.writeFileSync('src/pages/AdminPanel.jsx', c, 'utf8');
  const alertCount = (c.match(/\balert\(/g) || []).length;
  console.log(`AdminPanel: ${alertCount} alerts remaining`);
}

// ─── Fix Login.jsx ─────────────────────────────────────────────
{
  let c = fs.readFileSync('src/pages/Login.jsx', 'utf8');
  c = c.replace(/\balert\(/g, 'showToast(');
  // Fix calls without type
  c = c.replace(/showToast\('\u09ae\u09c7\u09b8 \u0986\u0987\u09a1\u09bf \u09a6\u09bf\u09a8'\)/, "showToast('মেস আইডি দিন', 'warning')");
  c = c.replace(/showToast\('\u09b2\u0997\u0987\u09a8 \u09ac\u09cd\u09af\u09b0\u09cd\u09a5 \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964 \u0986\u09ac\u09be\u09b0 \u099a\u09c7\u09b7\u09cd\u099f\u09be \u0995\u09b0\u09c1\u09a8\u0964'\)/, "showToast('লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।', 'error')");
  fs.writeFileSync('src/pages/Login.jsx', c, 'utf8');
  const alertCount = (c.match(/\balert\(/g) || []).length;
  console.log(`Login: ${alertCount} alerts remaining`);
}

// ─── Fix JoinMess.jsx ─────────────────────────────────────────────
{
  let c = fs.readFileSync('src/pages/JoinMess.jsx', 'utf8');
  // Check if useToast is already imported
  if (!c.includes('useToast')) {
    c = c.replace(
      `import { ShieldCheck, UserPlus, Phone, CheckCircle, User } from 'lucide-react';`,
      `import { ShieldCheck, UserPlus, Phone, CheckCircle, User } from 'lucide-react';\nimport { useToast } from '../contexts/ToastContext';`
    );
  }
  // Add hook to component
  if (!c.includes('const { showToast }')) {
    c = c.replace(
      '  const [group, setGroup] = useState(null);',
      '  const { showToast } = useToast();\n  const [group, setGroup] = useState(null);'
    );
  }
  c = c.replace(/\balert\(/g, 'showToast(');
  // Fix calls without type
  c = c.replace(/showToast\("(\u0985\u09a8\u09c1\u0997\u09cd\u09b0\u09b9 \u0995\u09b0\u09c7 \u09b8\u09a0\u09bf\u0995 \u09ae\u09cb\u09ac\u09be\u0987\u09b2 \u09a8\u09ae\u09cd\u09ac\u09b0 \u09a6\u09bf\u09a8\u0964)"\)/, `showToast("অনুগ্রহ করে সঠিক মোবাইল নম্বর দিন।", "warning")`);
  c = c.replace(/showToast\("(\u0985\u09a8\u09c1\u0997\u09cd\u09b0\u09b9 \u0995\u09b0\u09c7 \u0986\u09aa\u09a8\u09be\u09b0 \u09a8\u09be\u09ae \u09a6\u09bf\u09a8\u0964)"\)/, `showToast("অনুগ্রহ করে আপনার নাম দিন।", "warning")`);
  c = c.replace(/showToast\('(\u09ae\u09c7\u09b8 \u0986\u0987\u09a1\u09bf \u09b8\u09a0\u09bf\u0995 \u09a8\u09af\u09bc\u0964.*)'\)/, `showToast('মেস আইডি সঠিক নয়। লিংক বা আইডি আবার চেক করুন।', 'error')`);
  c = c.replace(/showToast\("\u09b0\u09bf\u0995\u09cb\u09af\u09bc\u09c7\u09b8\u09cd\u099f \u09aa\u09be\u09a0\u09be\u09a4\u09c7 \u09b8\u09ae\u09b8\u09cd\u09af\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964"\)/, `showToast("রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।", "error")`);
  
  fs.writeFileSync('src/pages/JoinMess.jsx', c, 'utf8');
  const alertCount = (c.match(/\balert\(/g) || []).length;
  console.log(`JoinMess: ${alertCount} alerts remaining`);
}

// ─── Fix Dashboard.jsx ─────────────────────────────────────────────
{
  let c = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
  const alertCount = (c.match(/\balert\(/g) || []).length;
  console.log(`Dashboard: ${alertCount} alerts (using confirm only)`);
}

console.log('\n✅ All files processed!');
