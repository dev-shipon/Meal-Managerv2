/** মেম্বার ডিসপ্লে নাম — টেবিল/মোবাইল UI ভেঙে না যায় */
export const MEMBER_NAME_MAX_LENGTH = 50;

export function clampMemberName(raw) {
  if (raw == null || raw === undefined) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';
  return trimmed.length <= MEMBER_NAME_MAX_LENGTH
    ? trimmed
    : trimmed.slice(0, MEMBER_NAME_MAX_LENGTH);
}
