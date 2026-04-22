const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
];

const rateBuckets = new Map();

const getAllowedOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  if (raw === '*') return ['*'];
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
};

const getRequestHost = (req) => String(req.headers['x-forwarded-host'] || req.headers.host || '').trim();

export const isOriginAllowed = (req) => {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) return true;

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return true;

  try {
    return new URL(origin).host === getRequestHost(req);
  } catch {
    return false;
  }
};

export const applyCors = (req, res) => {
  const origin = String(req.headers.origin || '').trim();
  if (origin && isOriginAllowed(req)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

export const ensureApiRequest = (req, res) => {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }

  if (!isOriginAllowed(req)) {
    res.status(403).json({ success: false, error: 'Origin not allowed' });
    return false;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
    return false;
  }

  return true;
};

const getClientIp = (req) => {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwardedFor || req.socket?.remoteAddress || 'unknown';
};

export const checkRateLimit = (req, scope, limit = 10, windowMs = 60_000) => {
  const now = Date.now();
  const key = `${scope}:${getClientIp(req)}`;
  const current = rateBuckets.get(key);

  if (!current || current.expiresAt <= now) {
    rateBuckets.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - current.count) };
};

export const validateEmailRequest = ({ to, subject, html }) => {
  const email = String(to || '').trim();
  const subjectText = String(subject || '').trim();
  const htmlText = String(html || '');

  if (!email || !subjectText || !htmlText) {
    return 'Missing required fields';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Invalid recipient email';
  }

  if (subjectText.length > 180) {
    return 'Subject is too long';
  }

  if (htmlText.length > 50_000) {
    return 'Email body is too large';
  }

  return '';
};

export const validateGeminiRequest = ({ prompt, temperature }) => {
  const promptText = String(prompt || '').trim();
  if (!promptText) return 'Prompt is required';
  if (promptText.length > 12_000) return 'Prompt is too large';

  const tempValue = Number(temperature);
  if (Number.isNaN(tempValue) || tempValue < 0 || tempValue > 2) {
    return 'Temperature must be between 0 and 2';
  }

  return '';
};

