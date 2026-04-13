const sessions = {};

function saveMessage(userId, message) {
  if (!sessions[userId]) sessions[userId] = [];
  sessions[userId].push(message);
}

function getHistory(userId) {
  return sessions[userId] || [];
}

function clearUserHistory(userId) {
  sessions[userId] = [];
}

module.exports = { saveMessage, getHistory, clearUserHistory };