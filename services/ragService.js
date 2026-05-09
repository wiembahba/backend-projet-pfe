// services/ragService.js
// ⚠️ ChromaDB désactivé — le chatbot utilise SQL directement

const initializeRAG = async () => {
  console.log("⚠️ RAG désactivé (ChromaDB non disponible) — chatbot SQL actif ✅");
};

const semanticSearch = async (query_text, role, userId, k = 4) => {
  return [];
};

module.exports = { initializeRAG, semanticSearch };