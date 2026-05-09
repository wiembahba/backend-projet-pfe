// config/ollama.js
const { ChatOllama } = require('@langchain/ollama');
const { OllamaEmbeddings } = require('@langchain/ollama');
require('dotenv').config();

const getChatModel = () => new ChatOllama({
     model: "mistral:7b",  // ← Revenir à mistral (supporte les outils)
        baseUrl: "http://127.0.0.1:11434",
        temperature: 0.1,  // ✅ أقل = أسرع وأدق
        numPredict: 300,   // ✅ أقل = أسرع
        numCtx: 2048, 
});

const getFastChatModel = () => new ChatOllama({
    model: "phi3:mini",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    temperature: 0.5,
    numPredict: 500,
});

const getEmbeddingsModel = () => new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
});

module.exports = { getChatModel, getFastChatModel, getEmbeddingsModel };