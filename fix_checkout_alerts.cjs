const fs = require('fs');

// Fix Checkout.jsx remaining alerts
{
  let c = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');
  
  // Replace alerts
  c = c.replace(/alert\("([^"]+)"\)/g, (match, msg) => `showToast("${msg}", "warning")`);
  c = c.replace(/alert\('([^']+)'\)/g, (match, msg) => `showToast("${msg}", "warning")`);
  
  fs.writeFileSync('src/pages/Checkout.jsx', c, 'utf8');
  const alerts = (c.match(/\balert\(/g) || []).length;
  console.log(`Checkout: ${alerts} alerts remaining`);
}
