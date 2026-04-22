const fs = require('fs');

// Fix Login.jsx line 48 - has CRLF issues or encoding
{
  let bytes = fs.readFileSync('src/pages/Login.jsx');
  let c = bytes.toString('utf8');
  
  // Use regex with any Bengali characters
  const oldAlert = /alert\('[^']+'\);/g;
  const matches = c.match(oldAlert);
  if (matches) {
    console.log('Found alert patterns in Login.jsx:', matches.length);
    matches.forEach(m => console.log('  -', m));
  }
  
  // Replace using regex - handle the specific login alert
  c = c.replace(/alert\('([^']*)ব্যর্থ হয়েছে([^']*)'\);/, "showToast('লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।', 'error');");
  
  fs.writeFileSync('src/pages/Login.jsx', c, 'utf8');
  
  // Verify
  const remaining = c.match(/alert\(/g);
  console.log('Login.jsx remaining alerts:', remaining ? remaining.length : 0);
}

// Fix AdminPanel.jsx - add useToast hook and showToast usage
{
  let c = fs.readFileSync('src/pages/AdminPanel.jsx', 'utf8');
  
  // Check line 382 (successDelete)
  const lines = c.split('\n');
  lines.forEach((l, i) => { if (l.includes('alert(')) console.log('AdminPanel line ' + (i+1) + ':', l.trim()); });
  
  // Replace success delete alert
  c = c.replace(/alert\(`[^`]*successfully deleted[^`]*`\)/g, "showToast('সফলভাবে ডিলিট হয়েছে!', 'success')");
  c = c.replace(/alert\(`[^`]*deleted successfully[^`]*`\)/g, "showToast('সফলভাবে ডিলিট হয়েছে!', 'success')");
  // Generic 
  c = c.replace(/alert\('([^']+) successfully deleted\.'\)/g, "showToast('সফলভাবে ডিলিট হয়েছে!', 'success')");
  
  // Add showToast hook usage to AdminPanel function
  // Check if already has useToast
  if (!c.includes('useToast') && !c.includes('showToast')) {
    // It's admin only so we just add import and hook
    c = c.replace(
      "import React,",
      "import { useToast } from '../contexts/ToastContext';\nimport React,"
    );
  }
  
  fs.writeFileSync('src/pages/AdminPanel.jsx', c, 'utf8');
  
  const remaining = c.match(/alert\(/g);
  console.log('AdminPanel.jsx remaining alerts:', remaining ? remaining.length : 0);
}

// Now check MealApp.jsx status  
{
  let c = fs.readFileSync('src/pages/MealApp.jsx', 'utf8');
  const alertMatches = c.match(/\balert\(/g);
  console.log('MealApp.jsx remaining alerts:', alertMatches ? alertMatches.length : 0);
  if (alertMatches && alertMatches.length > 0) {
    const lines = c.split('\n');
    lines.forEach((l, i) => { if (l.includes('alert(')) console.log('  line ' + (i+1) + ':', l.trim().substring(0, 80)); });
  }
  
  // Check if showToast import was added
  console.log('MealApp has useToast import:', c.includes('useToast'));
  console.log('MealApp has showToast hook:', c.includes('const { showToast }'));
}
