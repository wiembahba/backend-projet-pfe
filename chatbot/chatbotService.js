const db = require("../config/db");
const { askLLM } = require("../chatbot/llm");

// =============================
// 1. INTENT DETECTION (AI ONLY)
// =============================
async function detectIntent(question) {
  const prompt = `
You are an AI classifier.

Classify this question into ONE of:

- count_tasks
- list_tasks
- risk_tasks
- late_tasks
- general

Also extract name if exists.

Return ONLY JSON:
{
  "intent": "...",
  "name": "..."
}

Question:
${question}
`;

  const res = await askLLM(prompt);

  try {
    return JSON.parse(res);
  } catch {
    return { intent: "general", name: null };
  }
}

// =============================
// MAIN CHATBOT
// =============================
async function handleQuestion(question, user) {
  try {

    const { intent, name } = await detectIntent(question);

    // =========================
    // 1. COUNT TASKS
    // =========================
    if (intent === "count_tasks") {

      const [rows] = await db.query(`
        SELECT COUNT(*) as total
        FROM taches t
        JOIN users u ON t.assigne_a = u.id
        WHERE LOWER(u.nom_complet) LIKE ?
      `, [`%${name || ""}%`]);

      return `👤 ${name} عندو ${rows[0].total} مهام.`;
    }

    // =========================
    // 2. LIST TASKS
    // =========================
    if (intent === "list_tasks") {

      const [rows] = await db.query(`
        SELECT t.titre, t.statut, t.date_echeance
        FROM taches t
        JOIN users u ON t.assigne_a = u.id
        WHERE LOWER(u.nom_complet) LIKE ?
        LIMIT 50
      `, [`%${name || ""}%`]);

      if (!rows.length) return "ما فما حتى tasks.";

      return await askLLM(`
User tasks:
${JSON.stringify(rows)}

Explain clearly in French.
`);
    }

    // =========================
    // 3. RISK TASKS (FIXED LOGIC)
    // =========================
    if (intent === "risk_tasks") {

      const [rows] = await db.query(`
        SELECT titre, progression, date_echeance
        FROM taches
        WHERE progression < 30
           OR date_echeance < CURDATE()
        LIMIT 50
      `);

      return await askLLM(`
These are risky tasks:
${JSON.stringify(rows)}

Explain why they are risky in simple French.
`);
    }

    // =========================
    // 4. LATE TASKS
    // =========================
    if (intent === "late_tasks") {

      const [rows] = await db.query(`
        SELECT titre, date_echeance
        FROM taches
        WHERE statut = 'a_faire'
          AND date_echeance < CURDATE()
      `);

      return await askLLM(`
Late tasks:
${JSON.stringify(rows)}

Explain briefly.
`);
    }

    // =========================
    // 5. GENERAL CHAT (ChatGPT MODE)
    // =========================
    return await askLLM(`
You are a project management assistant.

User question:
${question}

Answer clearly in French.
`);

  } catch (err) {
    console.log("💥 CHATBOT ERROR:", err);
    return "Erreur serveur chatbot.";
  }
}

module.exports = { handleQuestion };