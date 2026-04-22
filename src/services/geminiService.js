export const generateGeminiText = async ({
  prompt,
  temperature = 0.7,
  responseMimeType,
  systemPrompt,
}) => {
  const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
  
  const bodyPayload = {
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          systemPrompt ||
          "You are a helpful AI assistant that answers concisely and always follows the user's formatting instructions perfectly.",
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: temperature,
  };

  if (responseMimeType === 'application/json') {
     bodyPayload.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(bodyPayload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Groq API Error:", data);
    throw new Error(data?.error?.message || 'AI request failed');
  }

  return data.choices[0].message.content;
};
