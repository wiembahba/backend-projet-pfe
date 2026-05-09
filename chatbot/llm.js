const Groq = require("groq-sdk");
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function askLLM(prompt) {
  try {
    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.log("GROQ ERROR:", err.message);
    return "Erreur LLM";
  }
}

module.exports = { askLLM };