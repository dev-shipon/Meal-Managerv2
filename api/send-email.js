import nodemailer from 'nodemailer';
import { checkRateLimit, ensureApiRequest, validateEmailRequest } from './_lib/httpSecurity.js';

export default async function handler(req, res) {
  if (!ensureApiRequest(req, res)) return;

  const rate = checkRateLimit(req, 'send-email', 8, 10 * 60_000);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return res.status(429).json({ success: false, error: 'Too many email requests. Please try again later.' });
  }

  const { to, subject, html } = req.body;
  const validationError = validateEmailRequest({ to, subject, html });
  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(503).json({ success: false, error: 'Email service is not configured.' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    return res.status(200).json({ success: true, message: 'Email sent' });
  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
