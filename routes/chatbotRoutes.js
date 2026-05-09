const express = require('express');
const router = express.Router();
const {
  processMessage,
  processDocument,
  processImage,
  clearHistory,
  upload,
} = require('../controllers/chatbotController');
const {
  getSessions,
  createSession,
  deleteSession,
  loadHistory,
  renameSession,
} = require('../chatbot/chatHistoryService');
const { runSQL } = require('../services/dbService');
const { verifyToken } = require('../middleware/authMiddleware');

// ─── Sessions (/api/chatbot/sessions) ────────────────────────
router.get('/sessions', verifyToken, async (req, res) => {
  try {
    const sessions = await getSessions(req.user.id, runSQL);
    res.json(sessions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sessions', verifyToken, async (req, res) => {
  try {
    const sessionId = await createSession(req.user.id, runSQL);
    res.json({ sessionId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/sessions/:id/messages', verifyToken, async (req, res) => {
  try {
    const messages = await loadHistory(req.params.id, runSQL);
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/sessions/:id', verifyToken, async (req, res) => {
  try {
    await deleteSession(req.params.id, req.user.id, runSQL);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/sessions/:id', verifyToken, async (req, res) => {
  try {
    await renameSession(req.params.id, req.user.id, req.body.title, runSQL);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Chatbot (/api/chatbot/message ...) ──────────────────────
router.post('/message',  verifyToken, processMessage);
router.post('/document', verifyToken, upload.single('file'), processDocument);
router.post('/image',    verifyToken, upload.single('file'), processImage);
router.delete('/history', verifyToken, clearHistory);

module.exports = router;