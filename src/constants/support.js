/** Landing page ও অ্যাপ সেটিংস — একই WhatsApp (E.164, country code সহ, আগের শূন্য ছাড়া) */
export const SUPPORT_WHATSAPP_E164 = '8801570215792';

export function getWhatsAppSupportUrl(prefillMessage = '') {
  const base = `https://wa.me/${SUPPORT_WHATSAPP_E164}`;
  if (!prefillMessage || !String(prefillMessage).trim()) return base;
  return `${base}?text=${encodeURIComponent(String(prefillMessage).trim())}`;
}
