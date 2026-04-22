const fs = require('fs');

const file = 'src/pages/MealApp.jsx';
let content = fs.readFileSync(file, 'utf8');

// The problematic string is:
// if (await showConfirm({ message: `"${name}" কে মেম্বার লিস্ট থেকে ডিলিট করতে চান?`\n⚠️ এই মেম্বারের সব মিল, জমা ও বাজার ডাটা থেকে যাবে।" })) {
// We want to replace it with:
// if (await showConfirm({ message: `"${name}" কে মেম্বার লিস্ট থেকে ডিলিট করতে চান?\n⚠️ এই মেম্বারের সব মিল, জমা ও বাজার ডাটা থেকে যাবে।` })) {

content = content.replace(
  /message:\s*`"\$\{name\}" কে মেম্বার লিস্ট থেকে ডিলিট করতে চান\?`\n⚠️ এই মেম্বারের সব মিল, জমা ও বাজার ডাটা থেকে যাবে।"/g,
  'message: `"${name}" কে মেম্বার লিস্ট থেকে ডিলিট করতে চান?\\n⚠️ এই মেম্বারের সব মিল, জমা ও বাজার ডাটা থেকে যাবে।`'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed MealApp.jsx line 3801');
