const memory = new Map();

function saveMessage(userId, msg) {
  if (!memory.has(userId)) memory.set(userId, []);
  memory.get(userId).push(msg);
}

function getHistory(userId) {
  return memory.get(userId) || [];
}

function clearUserHistory(userId) {
  memory.delete(userId);
}

module.exports = { saveMessage, getHistory, clearUserHistory };