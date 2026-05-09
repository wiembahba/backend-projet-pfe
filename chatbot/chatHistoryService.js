// ============================================================
//  chatHistoryService.js  –  Version 1.0
//  ✅ Sessions kima ChatGPT  ✅ Historique persistant
//  ✅ Auto-titre  ✅ CRUD sessions
// ============================================================

const { v4: uuidv4 } = require('uuid');

// ─── Créer une nouvelle session ──────────────────────────────

async function createSession(userId, runSQL) {
  const id = uuidv4();
  await runSQL(
    `INSERT INTO chat_sessions (id, user_id, title) VALUES (?, ?, 'Nouvelle conversation')`,
    [id, userId]
  );
  return id;
}

// ─── Auto-titre avec le 1er message (kima ChatGPT) ──────────

async function autoTitleSession(sessionId, firstMessage, runSQL) {
  const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
  await runSQL(
    `UPDATE chat_sessions SET title = ? WHERE id = ?`,
    [title, sessionId]
  );
}

// ─── Récupérer toutes les sessions d'un user ────────────────

async function getSessions(userId, runSQL) {
  return await runSQL(
    `SELECT id, title, created_at, updated_at
     FROM chat_sessions
     WHERE user_id = ?
     ORDER BY updated_at DESC`,
    [userId]
  );
}

// ─── Charger l'historique d'une session ─────────────────────

async function loadHistory(sessionId, runSQL) {
  if (!sessionId) return [];
  return await runSQL(
    `SELECT role, content FROM chat_history
     WHERE session_id = ?
     ORDER BY created_at ASC`,
    [sessionId]
  );
}

// ─── Sauvegarder un message ──────────────────────────────────

async function saveMessage(sessionId, userId, role, content, runSQL) {
  await runSQL(
    `INSERT INTO chat_history (session_id, user_id, role, content) VALUES (?, ?, ?, ?)`,
    [sessionId, userId, role, content]
  );
  // Met à jour le timestamp de la session (pour tri par récence)
  await runSQL(
    `UPDATE chat_sessions SET updated_at = NOW() WHERE id = ?`,
    [sessionId]
  );
}

// ─── Supprimer une session (et tout son historique via CASCADE) ──

async function deleteSession(sessionId, userId, runSQL) {
  await runSQL(
    `DELETE FROM chat_sessions WHERE id = ? AND user_id = ?`,
    [sessionId, userId]
  );
}

// ─── Renommer une session ────────────────────────────────────

async function renameSession(sessionId, userId, newTitle, runSQL) {
  await runSQL(
    `UPDATE chat_sessions SET title = ? WHERE id = ? AND user_id = ?`,
    [newTitle, sessionId, userId]
  );
}

module.exports = {
  createSession,
  autoTitleSession,
  getSessions,
  loadHistory,
  saveMessage,
  deleteSession,
  renameSession,
};