const LOCAL_API = '/api/send-email';

/**
 * Sends an email using the local backend.
 * @param {string} to - Recipient email
 * @param {string} subject - Email Subject
 * @param {string} html - HTML Content
 */
export const sendEmail = async (to, subject, html) => {
  try {
    const res = await fetch(LOCAL_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, subject, html })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('sendEmail failed (is the backend running?):', err);
    return { success: false, error: err.message };
  }
};
