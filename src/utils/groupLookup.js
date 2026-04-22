import { doc, getDoc, setDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/db';

/** Public index: doc id = lowercase Firestore group id; only needs `get` (no list) for anonymous member lookup. */
export const JOIN_KEY_INDEX = 'join_key_index';

/**
 * Ensures join_key_index has a pointer to the canonical groups/{groupId} document.
 */
export async function writeJoinKeyIndex(groupId) {
  if (!groupId) return;
  const key = groupId.toLowerCase();
  await setDoc(doc(db, JOIN_KEY_INDEX, key), { groupId }, { merge: true });
}

/**
 * Extracts the real Firestore group doc id from pasted input: plain id, slug--id, or full /join/ or /app/ URL.
 */
export function parseGroupIdInput(raw) {
  let t = (raw || '').trim();
  if (!t) return '';
  const urlMatch = t.match(/\/(?:join|app)\/([^/?#]+)/i);
  if (urlMatch) t = urlMatch[1];
  let decoded = t;
  try {
    decoded = decodeURIComponent(t);
  } catch {
    /* ignore malformed escape */
  }
  const last = decoded.includes('--') ? decoded.split('--').pop() : decoded;
  return (last || '').trim();
}

/**
 * Resolves a group by exact document id or by joinLookupKey (lowercase copy for case-insensitive login).
 */
export async function fetchResolvedGroup(rawInput) {
  const candidate = parseGroupIdInput(rawInput);
  if (!candidate) return { found: false };

  const direct = await getDoc(doc(db, 'groups', candidate));
  if (direct.exists()) {
    return { found: true, id: direct.id, data: direct.data() };
  }

  const key = candidate.toLowerCase();

  const indexSnap = await getDoc(doc(db, JOIN_KEY_INDEX, key));
  if (indexSnap.exists()) {
    const gid = indexSnap.data()?.groupId;
    if (gid && typeof gid === 'string') {
      const groupSnap = await getDoc(doc(db, 'groups', gid));
      if (groupSnap.exists()) {
        return { found: true, id: groupSnap.id, data: groupSnap.data() };
      }
    }
  }

  try {
    const q = query(collection(db, 'groups'), where('joinLookupKey', '==', key), limit(1));
    const list = await getDocs(q);
    if (!list.empty) {
      const d = list.docs[0];
      return { found: true, id: d.id, data: d.data() };
    }
  } catch {
    /* permission-denied on list is common for logged-out users */
  }

  return { found: false };
}
