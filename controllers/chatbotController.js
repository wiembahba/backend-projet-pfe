const { handleQuestion } = require('../chatbot/chatbotService');
const { getHistory, saveMessage } = require('../chatbot/memory');
const { clearUserHistory } = require('../chatbot/memory');



async function processMessage(req, res) {
  try {
    const user = req.user || { id: 1, role: "admin" };

    const response = await handleQuestion(req.body.message, user);

    res.json({ reply: response });

  } catch (err) {
    res.status(500).json({ error: "Chatbot error" });
  }
}


// 🗑️ clear history


function clearHistory(req, res) {
  try {
    const userId = req.user?.id || "guest";

    clearUserHistory(userId);

    res.json({ message: "Historique supprimé" });

  } catch (err) {
    res.status(500).json({
      error: "Erreur suppression historique"
    });
  }
}

module.exports = {
  processMessage,
  clearHistory
};