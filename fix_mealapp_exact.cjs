const fs = require('fs');

const file = 'src/pages/MealApp.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Line index 3800 corresponds to line number 3801.
// We'll rewrite the exact line to remove the syntax error.
// The issue was: message: `"${name}" কে মেম্বার লিস্ট থেকে ডিলিট করতে চান?`\n⚠️ এই মেম্বারের সব মিল, জমা ও বাজার ডাটা থেকে যাবে।"
// We need to change it to: `"${name}" কে মেম্বার লিস্ট থেকে ডিলিট করতে চান?\n⚠️ এই মেম্বারের সব মিল, জমা ও বাজার ডাটা থেকে যাবে।`

lines[3800] = '                            if (await showConfirm({ message: `"${name}" কে মেম্বার লিস্ট থেকে ডিলিট করতে চান?\\n⚠️ এই মেম্বারের সব মিল, জমা ও বাজার ডাটা থেকে যাবে।` })) {';

fs.writeFileSync(file, lines.join('\n'), 'utf8');
