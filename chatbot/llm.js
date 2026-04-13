const axios = require("axios");

async function askLLM(prompt) {
  try {
    const res = await axios.post("http://127.0.0.1:11434/api/generate", {
      model: "mistral",
      prompt: prompt,
      stream: false
    });

    return res.data.response || "Erreur LLM";

  } catch (err) {
    console.log("💥 LLM ERROR:", err.message);
    return "Erreur LLM";
  }
}

module.exports = { askLLM };