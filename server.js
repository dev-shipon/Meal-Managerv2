import express from 'express';
import dotenv from 'dotenv';
import sendEmailHandler from './api/send-email.js';
import geminiHandler from './api/gemini.js';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api/send-email', sendEmailHandler);
app.use('/api/gemini', geminiHandler);

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => console.log(`Email backend running actively on http://localhost:${PORT}`));
