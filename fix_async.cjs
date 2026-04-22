const fs = require('fs');

const files = [
  'src/pages/MealApp.jsx',
  'src/pages/Dashboard.jsx',
  'src/pages/AdminPanel.jsx',
  'src/pages/Checkout.jsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let originalContent = content;

  // Add async to onClick handlers where await showConfirm is used.
  // E.g., onClick={(e) => { e.stopPropagation(); if (await showConfirm(...)) }}
  // Or onClick={() => { if (await showConfirm(...)) }}

  // Since it could be multiline, we can use a more general approach or targeted regex for React JSX inline functions.
  
  // This regex looks for onClick={() => or onClick={(e) => or onClick={(event) =>
  // and adds async if the body contains await.
  content = content.replace(/onClick=\{\(\s*([^)]*)\s*\)\s*=>\s*\{(?=[^}]*await\s+showConfirm)/g, "onClick={async ($1) => {");

  // Fix onClick={() => if (await ...)} (without braces) just in case
  content = content.replace(/onClick=\{\(\s*([^)]*)\s*\)\s*=>\s*(?=await\s+showConfirm)/g, "onClick={async ($1) => ");
  
  // Sometimes it's like onClick={() => deleteDoc(...)}
  // Wait, I did `if (await showConfirm(...))` which requires braces. Or maybe it was `onClick={() => { if (await showConfirm...` which the first covers.
  
  if (content !== originalContent) {
    fs.writeFileSync(f, content, 'utf8');
    console.log(`✅ Fixed async/await syntax in ${f}`);
  }
});

console.log('Done checking async syntax.');
