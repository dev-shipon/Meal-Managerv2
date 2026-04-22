const fs = require('fs');

// Fix Login.jsx - remaining alert
{
  let c = fs.readFileSync('src/pages/Login.jsx', 'utf8');
  const before = c;
  // Replace any remaining alert() calls
  c = c.replace(/alert\('লগইন ব্যর্থ হয়েছে।[^']*'\)/g, "showToast('লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।', 'error')");
  c = c.replace(/alert\("মেস আইডি দিন"\)/g, "showToast('মেস আইডি দিন', 'warning')");
  if (c !== before) {
    fs.writeFileSync('src/pages/Login.jsx', c, 'utf8');
    console.log('✅ Login.jsx fixed');
  } else {
    console.log('⚠️ Login.jsx: no changes (may need manual check)');
  }
  // verify
  const lines = c.split('\n');
  lines.forEach((l, i) => { if (l.includes('alert(')) console.log('  REMAINING ALERT: line ' + (i+1) + ': ' + l.trim()); });
}

// Fix JoinMess.jsx - check remaining alerts
{
  let c = fs.readFileSync('src/pages/JoinMess.jsx', 'utf8');
  const lines = c.split('\n');
  lines.forEach((l, i) => { if (l.includes('alert(')) console.log('JoinMess ALERT: line ' + (i+1) + ': ' + l.trim()); });
}

// Fix MealApp - check remaining alerts
{
  let c = fs.readFileSync('src/pages/MealApp.jsx', 'utf8');
  const lines = c.split('\n');
  let count = 0;
  lines.forEach((l, i) => { if (l.includes('alert(')) { count++; if(count<=10) console.log('MealApp ALERT: line ' + (i+1) + ': ' + l.trim()); } });
  console.log('MealApp: ' + count + ' alerts remaining');
}

// Fix AdminPanel - check remaining alerts
{
  let c = fs.readFileSync('src/pages/AdminPanel.jsx', 'utf8');
  const lines = c.split('\n');
  lines.forEach((l, i) => { if (l.includes('alert(')) console.log('AdminPanel ALERT: line ' + (i+1) + ': ' + l.trim()); });
}
