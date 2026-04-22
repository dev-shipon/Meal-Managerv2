const fs = require('fs');

// Fix showToast calls that don't have proper type argument
// Pattern: showToast("msg") → needs type
{
  let c = fs.readFileSync('src/pages/MealApp.jsx', 'utf8');
  
  // Fix validation/warning toasts that were replaced without type
  // These ones came from alert() calls which are blocking warnings
  c = c.replace(/showToast\("অন্তত একটি বাজার আইটেম দিন"\)/, `showToast("অন্তত একটি বাজার আইটেম দিন", 'warning')`);
  c = c.replace(/showToast\("অন্তত একজনকে নির্বাচন করুন"\)/, `showToast("অন্তত একজনকে নির্বাচন করুন", 'warning')`);
  c = c.replace(/showToast\("আপনার মেম্বার প্রোফাইল পাওয়া যায়নি।"\)/, `showToast("আপনার মেম্বার প্রোফাইল পাওয়া যায়নি।", 'error')`);
  c = c.replace(/showToast\("Only the host can assign managers!"\)/, `showToast("শুধুমাত্র হোস্ট ম্যানেজার নির্ধারণ করতে পারবেন!", 'error')`);

  // Fix showToast calls with type already - keep them (from mapping step)
  // The blind replacement at the end of fix_all.cjs replaced remaining alerts
  // Those will now be showToast("msg") without type  
  // Let's fix them smartly:
  
  // Error patterns (failures, problems)
  c = c.replace(/showToast\("([^"]*সমস্যা[^"]*)"\)(?!,)/g, `showToast("$1", 'error')`);
  c = c.replace(/showToast\("([^"]*ব্যর্থ[^"]*)"\)(?!,)/g, `showToast("$1", 'error')`);
  c = c.replace(/showToast\("([^"]*Error[^"]*)"\)(?!,)/g, `showToast("$1", 'error')`);
  
  // Warning patterns  
  c = c.replace(/showToast\("([^"]*লাগবে[^"]*)"\)(?!,)/g, `showToast("$1", 'warning')`);
  c = c.replace(/showToast\("([^"]*পাওয়া যায়নি[^"]*)"\)(?!,)/g, `showToast("$1", 'warning')`);
  c = c.replace(/showToast\("([^"]*ব্লক[^"]*)"\)(?!,)/g, `showToast("$1", 'warning')`);
  c = c.replace(/showToast\("([^"]*সর্বোচ্চ[^"]*)"\)(?!,)/g, `showToast("$1", 'warning')`);
  
  // Success patterns
  c = c.replace(/showToast\("([^"]*সফল[^"]*)"\)(?!,)/g, `showToast("$1", 'success')`);
  c = c.replace(/showToast\("([^"]*সম্পন্ন[^"]*)"\)(?!,)/g, `showToast("$1", 'success')`);
  c = c.replace(/showToast\("([^"]*আপডেট হয়েছে[^"]*)"\)(?!,)/g, `showToast("$1", 'success')`);
  c = c.replace(/showToast\("([^"]*কপি হয়েছে[^"]*)"\)(?!,)/g, `showToast("$1", 'success')`);
  c = c.replace(/showToast\("([^"]*যোগ করা হয়েছে[^"]*)"\)(?!,)/g, `showToast("$1", 'success')`);
  c = c.replace(/showToast\("([^"]*approve[^"]*)"\)(?!,)/g, `showToast("$1", 'success')`);
  
  // Template literal patterns (backtick)
  c = c.replace(/showToast\(`([^`]*সফলভাবে[^`]*)`\)(?!,)/g, "showToast(`$1`, 'success')");
  c = c.replace(/showToast\(`([^`]*জানানো হয়েছে[^`]*)`\)(?!,)/g, "showToast(`$1`, 'success')");
  c = c.replace(/showToast\(`([^`]*আপডেট হয়েছে[^`]*)`\)(?!,)/g, "showToast(`$1`, 'success')");
  c = c.replace(/showToast\(`([^`]*সমস্যা[^`]*)`\)(?!,)/g, "showToast(`$1`, 'error')");
  
  // Single quote patterns
  c = c.replace(/showToast\('([^']*সফল[^']*)'\)(?!,)/g, `showToast('$1', 'success')`);
  c = c.replace(/showToast\('([^']*কপি হয়েছে[^']*)'\)(?!,)/g, `showToast('$1', 'success')`);
  c = c.replace(/showToast\('([^']*সমস্যা[^']*)'\)(?!,)/g, `showToast('$1', 'error')`);
  c = c.replace(/showToast\('([^']*হয়েছে[^']*)'\)(?!,)/g, `showToast('$1', 'success')`);
  
  fs.writeFileSync('src/pages/MealApp.jsx', c, 'utf8');
  
  // Count calls with and without type
  const withType = (c.match(/showToast\([^)]+,\s*'[^']+'\)/g) || []).length;
  const total = (c.match(/showToast\(/g) || []).length;
  console.log(`MealApp: ${total} total showToast calls, ~${withType} have type parameter`);
}

// Also fix window.confirm() → showConfirm() in MealApp
{
  let c = fs.readFileSync('src/pages/MealApp.jsx', 'utf8');
  
  // window.confirm returns boolean, but showConfirm returns Promise
  // We need to convert sync confirm checks to async
  // For now, let's just count them to know what we're dealing with
  const confirms = (c.match(/window\.confirm\(/g) || []).length;
  console.log(`MealApp window.confirm calls remaining: ${confirms}`);
}

console.log('✅ Type-fixing done!');
