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

  // Replace double quotes enclosing the message with backticks 
  // ONLY for cases where the string contains template variables like ${...} or inner quotes
  content = content.replace(/showConfirm\(\{ message: "([^"]*\$\{[^}]+\}[^"]*)"(?:, danger: true )? \}\)/g, (match, msg) => {
    // Unescape anything safely and wrap in backticks
    return match.replace(/"([^"]*\$\{[^}]+\}[^"]*)"/, '`$1`');
  });
  
  // Also fix nested quotes gracefully, e.g. message: ""something""
  content = content.replace(/message: ""(.*?)""/g, "message: `\"$1\"`");
  
  // Specific fix for the AdminPanel error: message: ""${groupName || groupId}" mess-এর সব data delete হবে। চালিয়ে যাবেন?"
  content = content.replace(/message: ""(\$\{[^}]+\})"([ a-zA-Z0-9\u0980-\u09FF\.\-]+)\?/g, "message: `\"$1\"$2?`");

  if (content !== originalContent) {
    fs.writeFileSync(f, content, 'utf8');
    console.log(`✅ Fixed syntax in ${f}`);
  }
});

console.log('Done checking syntax errors.');
