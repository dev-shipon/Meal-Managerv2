const fs = require('fs');

// Convert window.confirm() patterns to showConfirm() in MealApp.jsx
// window.confirm is synchronous, showConfirm is async-Promise based
// We need to convert: if (window.confirm("msg")) { ... }
// To: const confirmed = await showConfirm({ message: "msg", ... }); if (confirmed) { ... }
// 
// Since these are inside async functions already, we can add await.

{
  let c = fs.readFileSync('src/pages/MealApp.jsx', 'utf8');
  
  // Pattern 1: if (window.confirm("msg")) { body }
  // → if (await showConfirm({ message: "msg" })) { body }
  c = c.replace(/if \(window\.confirm\(("([^"]+)"|'([^']+)'|`([^`]+)`)\)\)/g, (match, fullStr) => {
    const msg = fullStr.replace(/^["'`]|["'`]$/g, '');
    return `if (await showConfirm({ message: "${msg}" }))`;
  });
  
  // Pattern 2: if (!window.confirm("msg")) return;
  // → if (!(await showConfirm({ message: "msg" }))) return;
  c = c.replace(/if \(!window\.confirm\(("([^"]+)"|'([^']+)'|`([^`]+)`)\)\)/g, (match, fullStr) => {
    const msg = fullStr.replace(/^["'`]|["'`]$/g, '');
    return `if (!(await showConfirm({ message: "${msg}" })))`;
  });
  
  // Check remaining window.confirm
  const remaining = (c.match(/window\.confirm/g) || []).length;
  console.log(`window.confirm remaining after replacement: ${remaining}`);
  
  if (remaining > 0) {
    // Show them
    const lines = c.split('\n');
    lines.forEach((l, i) => {
      if (l.includes('window.confirm')) console.log(`  line ${i+1}: ${l.trim().substring(0, 100)}`);
    });
  }
  
  fs.writeFileSync('src/pages/MealApp.jsx', c, 'utf8');
}

// Also handle Dashboard.jsx window.confirm
{
  let c = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
  const confirms = (c.match(/window\.confirm/g) || []).length;
  console.log(`Dashboard window.confirm: ${confirms}`);
  
  if (confirms > 0) {
    // Add import if needed
    if (!c.includes('useToast') && !c.includes('useConfirm')) {
      c = c.replace(
        /^(import .+from 'react-router-dom';)/m,
        `$1\nimport { useToast, useConfirm } from '../contexts/ToastContext';`
      );
    }
    
    // Convert window.confirm patterns
    c = c.replace(/if \(window\.confirm\(("([^"]+)"|'([^']+)'|`([^`]+)`)\)\)/g, (match, fullStr) => {
      const msg = fullStr.replace(/^["'`]|["'`]$/g, '');
      return `if (await showConfirm({ message: "${msg}", danger: true }))`;
    });
    c = c.replace(/if \(!window\.confirm\(("([^"]+)"|'([^']+)'|`([^`]+)`)\)\)/g, (match, fullStr) => {
      const msg = fullStr.replace(/^["'`]|["'`]$/g, '');
      return `if (!(await showConfirm({ message: "${msg}", danger: true })))`;
    });
    
    fs.writeFileSync('src/pages/Dashboard.jsx', c, 'utf8');
    const remaining = (c.match(/window\.confirm/g) || []).length;
    console.log(`Dashboard window.confirm remaining: ${remaining}`);
  }
}

// Handle AdminPanel.jsx window.confirm
{
  let c = fs.readFileSync('src/pages/AdminPanel.jsx', 'utf8');
  const confirms = (c.match(/window\.confirm/g) || []).length;
  console.log(`AdminPanel window.confirm: ${confirms}`);
  
  if (confirms > 0) {
    c = c.replace(/if \(window\.confirm\(("([^"]+)"|'([^']+)'|`([^`]+)`)\)\)/g, (match, fullStr) => {
      const msg = fullStr.replace(/^["'`]|["'`]$/g, '');
      return `if (await showConfirm({ message: "${msg}", danger: true }))`;
    });
    c = c.replace(/if \(!window\.confirm\(("([^"]+)"|'([^']+)'|`([^`]+)`)\)\)/g, (match, fullStr) => {
      const msg = fullStr.replace(/^["'`]|["'`]$/g, '');
      return `if (!(await showConfirm({ message: "${msg}", danger: true })))`;
    });
    
    // Add useConfirm import and hook
    if (!c.includes('useConfirm')) {
      c = c.replace(
        `import { useToast } from '../contexts/ToastContext';`,
        `import { useToast, useConfirm } from '../contexts/ToastContext';`
      );
      c = c.replace(
        'const { showToast } = useToast();',
        'const { showToast } = useToast();\n  const { showConfirm } = useConfirm();'
      );
    }
    
    fs.writeFileSync('src/pages/AdminPanel.jsx', c, 'utf8');
    const remaining = (c.match(/window\.confirm/g) || []).length;
    console.log(`AdminPanel window.confirm remaining: ${remaining}`);
  }
}

// Handle Checkout.jsx window.confirm
{
  let c = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');
  const confirms = (c.match(/window\.confirm/g) || []).length;
  console.log(`Checkout window.confirm: ${confirms}`);
}

console.log('\n✅ window.confirm conversion done!');
