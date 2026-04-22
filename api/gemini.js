import { checkRateLimit, ensureApiRequest, validateGeminiRequest } from './_lib/httpSecurity.js';

const GEMINI_ENDPOINT = (model, apiKey) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

export default async function handler(req, res) {
  if (!ensureApiRequest(req, res)) return;

  const rate = checkRateLimit(req, 'gemini', 25, 10 * 60_000);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return res.status(429).json({ success: false, error: 'Too many AI requests. Please try again shortly.' });
  }

  const validationError = validateGeminiRequest(req.body || {});
  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) {
    return res.status(503).json({ success: false, error: 'Server Gemini API key is not configured.' });
  }

  const prompt = String(req.body.prompt || '');
  const temperature = Number(req.body.temperature ?? 0.7);
  const responseMimeType = req.body.responseMimeType === 'application/json' ? 'application/json' : undefined;

  try {
    const response = await fetch(GEMINI_ENDPOINT(model, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          ...(responseMimeType ? { responseMimeType } : {}),
        },
      }),
    });

    const data = await response.json();
    if (!response.ok || data?.error) {
      const message = data?.error?.message || 'Gemini request failed';
      return res.status(response.status || 502).json({ success: false, error: message });
    }

    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('').trim();
    if (!text) {
      return res.status(502).json({ success: false, error: 'Empty Gemini response.' });
    }

    return res.status(200).json({ success: true, text });
  } catch (error) {
    console.error('Gemini proxy error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Gemini proxy failed.' });
  }
}

