// api/ai.js — Vercel Serverless Function (Groq AI Proxy)
// ═══════════════════════════════════════════════════════

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages, systemPrompt, jsonMode = false } = req.body;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 2048,
        temperature: jsonMode ? 0.1 : 0.7,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: systemPrompt || "أنت مساعد ذكي متخصص في إدارة الأملاك والتطوير العقاري." },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq API error:", err);
      return res.status(500).json({ error: "Groq API error", details: err });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "عذراً، لم أتمكن من الإجابة.";

    return res.status(200).json({ reply, usage: data.usage });

  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}
