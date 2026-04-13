const express = require('express');
const router = express.Router();

const { processMessage, clearHistory } = require('../controllers/chatbotController');

// 🧠 envoyer message au chatbot
router.post('/message', processMessage);

// 🗑️ supprimer historique (memory)
router.delete('/history', clearHistory);

module.exports = router;