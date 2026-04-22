const fs = require('fs');

// Fix Checkout.jsx
{
  let c = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');
  
  // Add import
  if (!c.includes('useConfirm')) {
    // Find first import and add after
    c = c.replace(
      /^(import React.*from 'react';)/m,
      `$1\nimport { useToast, useConfirm } from '../contexts/ToastContext';`
    );
  }
  
  // Convert window.confirm patterns
  c = c.replace(/if \(window\.confirm\(("([^"]+)"|'([^']+)'|`([^`]+)`)\)\)/g, (match, fullStr) => {
    const msg = fullStr.replace(/^["'`]|["'`]$/g, '');
    return `if (await showConfirm({ message: "${msg}" }))`;
  });
  c = c.replace(/if \(!window\.confirm\(("([^"]+)"|'([^']+)'|`([^`]+)`)\)\)/g, (match, fullStr) => {
    const msg = fullStr.replace(/^["'`]|["'`]$/g, '');
    return `if (!(await showConfirm({ message: "${msg}" })))`;
  });
  
  // Add hook to Checkout component function
  if (!c.includes('showConfirm') || !c.includes('const { showConfirm }')) {
    // Find the function body start
    c = c.replace(
      /export default function Checkout\(\) \{\s*\n/,
      (m) => m + '  const { showToast } = useToast();\n  const { showConfirm } = useConfirm();\n'
    );
  }
  
  fs.writeFileSync('src/pages/Checkout.jsx', c, 'utf8');
  const remaining = (c.match(/window\.confirm/g) || []).length;
  console.log(`Checkout: ${remaining} window.confirm remaining`);
}

// Final audit of ALL files
const files = [
  'src/pages/MealApp.jsx',
  'src/pages/Login.jsx', 
  'src/pages/JoinMess.jsx',
  'src/pages/AdminPanel.jsx',
  'src/pages/Dashboard.jsx',
  'src/pages/Checkout.jsx',
];

console.log('\n=== FINAL AUDIT ===');
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const alerts = (c.match(/\balert\(/g) || []).length;
  const confs = (c.match(/window\.confirm/g) || []).length;
  const toasts = (c.match(/showToast\(/g) || []).length;
  const showConfs = (c.match(/showConfirm\(/g) || []).length;
  console.log(`${f.split('/').pop()}: alerts=${alerts}, confirms=${confs}, showToast=${toasts}, showConfirm=${showConfs}`);
}
