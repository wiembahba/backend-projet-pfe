const { handleQuestion } = require('../chatbot/chatbotService');
const { clearUserHistory } = require('../chatbot/memory');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const Groq = require('groq-sdk');


// ─── Multer config ───────────────────────────────────────────────────────────
const upload = multer({
  dest: 'uploads/chatbot/',
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ─── Process text message ────────────────────────────────────────────────────
async function processMessage(req, res) {
  try {
    const user = req.user;

    if (!user || !user.id) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message vide" });
    }

    const result = await handleQuestion(message, user, { sessionId });
    res.json({ reply: result.answer, sessionId: result.sessionId });

  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ error: "Chatbot error" });
  }
}

// ─── Process document (PDF / Word) ──────────────────────────────────────────
async function processDocument(req, res) {
  try {
    const user = req.user;

    if (!user || !user.id) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier reçu" });
    }

    const { originalname, path: filePath, mimetype } = req.file;
    const question = req.body.message || "Résume ce document en français.";
    const sessionId = req.body.sessionId || null;
    let extractedText = "";

    if (mimetype === "application/pdf") {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      extractedText = data.text;

    } else if (
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      originalname.endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ path: filePath });
      extractedText = result.value;

    } else if (mimetype === "text/plain") {
      extractedText = fs.readFileSync(filePath, "utf-8");

    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: "Format non supporté (PDF, DOCX, TXT seulement)" });
    }

    fs.unlinkSync(filePath);

    if (!extractedText.trim()) {
      return res.status(400).json({ error: "Document vide ou illisible" });
    }

    const result = await handleQuestion(question, user, {
      sessionId,
      documentText: extractedText,
      documentName: originalname,
    });

    res.json({ reply: result.answer, sessionId: result.sessionId, filename: originalname });

  } catch (err) {
    console.error("Document error:", err);
    res.status(500).json({ error: "Erreur traitement document" });
  }
}

// ─── Process image (vision) ──────────────────────────────────────────────────
async function processImage(req, res) {
  try {
    const user = req.user;

    if (!user || !user.id) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Aucune image reçue" });
    }

    const { path: filePath, mimetype } = req.file;
    const question = req.body.message || "Décris cette image en français.";
    const sessionId = req.body.sessionId || null;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(mimetype)) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: "Format image non supporté" });
    }

    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString("base64");
    fs.unlinkSync(filePath);

    const result = await handleQuestion(question, user, {
      sessionId,
      imageBase64: base64Image,
      imageMimetype: mimetype,
    });

    res.json({ reply: result.answer, sessionId: result.sessionId });

  } catch (err) {
    console.error("Image error:", err);
    res.status(500).json({ error: "Erreur traitement image" });
  }
}

// ─── Clear history ────────────────────────────────────────────────────────────
function clearHistory(req, res) {
  try {
    const userId = req.user?.id || "guest";
    clearUserHistory(userId);
    res.json({ message: "Historique supprimé" });
  } catch (err) {
    res.status(500).json({ error: "Erreur suppression historique" });
  }
}

module.exports = {
  processMessage,
  processDocument,
  processImage,
  clearHistory,
  upload,
};