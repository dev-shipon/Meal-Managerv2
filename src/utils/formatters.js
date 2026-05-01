
export const convertBengaliToEnglishNumbers = (str) => {
  if (str === null || str === undefined) return '';
  const bengaliNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(str).replace(/[০-৯]/g, (match) => bengaliNumbers.indexOf(match));
};

export const toBengaliNumber = (str) => {
  const bengaliNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(str).replace(/[0-9]/g, (match) => bengaliNumbers[match]);
};

export const toBengaliMonth = (monthCode) => {
  const [year, month] = monthCode.split('-');
  const months = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  return `${months[parseInt(month) - 1]} ${toBengaliNumber(year)}`;
};

export const safeNum = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  const englishVal = convertBengaliToEnglishNumbers(val);
  const n = Number(englishVal);
  return isNaN(n) ? 0 : n;
};

export const safeStr = (val) => {
  if (val === null || val === undefined) return "";
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return String(val);
  return "";
};

export const getMonthKey = (dateVal) => {
  if (!dateVal) return '';
  try {
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}/.test(dateVal)) {
      return dateVal.slice(0, 7);
    }
    const d = dateVal && typeof dateVal.toDate === 'function'
      ? dateVal.toDate()
      : new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  } catch (e) {
    return '';
  }
};

export const formatDate = (dateVal, toBengali = false) => {
  if (!dateVal) return "";
  try {
    let d;
    if (dateVal && typeof dateVal.toDate === 'function') {
      d = dateVal.toDate();
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) return "";
    const enDate = d.toLocaleDateString('en-GB');
    return toBengali ? toBengaliNumber(enDate) : enDate;
  } catch (e) {
    return "";
  }
};
