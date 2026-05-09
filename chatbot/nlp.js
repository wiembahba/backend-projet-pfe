const { askLLM } = require("./llm");

async function extractInfo(question) {
  const prompt = `
  Analyse la question suivante et retourne JSON فقط:

  {
    "intent": "",
    "project": "",
    "indicator": ""
  }

  Question: ${question}
  `;

  const response = await askLLM(prompt);

  try {
    return JSON.parse(response);
  } catch {
    return { intent: "unknown" };
  }
}

module.exports = { extractInfo };