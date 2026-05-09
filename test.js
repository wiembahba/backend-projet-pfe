require('dotenv').config();
const Groq = require("groq-sdk");
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function test() {
  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    max_tokens: 100,
    messages: [{ role: "user", content: "dis bonjour en français" }]
  });
  console.log("OK:", response.choices[0].message.content);
}

test().catch(e => console.log("ERROR:", e.message));