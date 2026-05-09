const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { askLLM } = require("../chatbot/llm");
const { runSQL } = require("../services/dbService");
const path = require("path");

async function analyzeDocument(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });

    const ext = path.extname(req.file.originalname).toLowerCase();
    let text = "";

    if (ext === ".pdf") {
      const data = await pdfParse(req.file.buffer);
      text = data.text;
    } else if (ext === ".docx" || ext === ".doc") {
      const data = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = data.value;
    } else if (ext === ".txt") {
      text = req.file.buffer.toString("utf-8");
    } else {
      return res.status(400).json({ error: "Format non supporté. Utilisez PDF, DOCX ou TXT" });
    }

    if (!text || text.trim().length === 0)
      return res.status(400).json({ error: "Document vide ou illisible" });

    const userId = req.user.id;

    // ✅ احذف القديم وخزن الجديد في MySQL
    await runSQL(`DELETE FROM document_store WHERE user_id = ?`, [userId]);
    await runSQL(
      `INSERT INTO document_store (user_id, filename, content) VALUES (?, ?, ?)`,
      [userId, req.file.originalname, text]
    );

    // رد سريع على السؤال
    const maxChars = 3000;
    const truncated = text.length > maxChars ? text.substring(0, maxChars) + "..." : text;
    const question = req.body.question || "Fais un résumé de ce document en français.";

    const prompt = `Tu es un assistant intelligent. Réponds en français de façon claire.
Document:
${truncated}
Question: ${question}
Réponse:`;

    const answer = await askLLM(prompt);
    res.json({ reply: answer, saved: true });

  } catch (err) {
    console.log("DOC ERROR:", err.message);
    res.status(500).json({ error: "Erreur lors de l'analyse du document" });
  }
}

module.exports = { analyzeDocument };