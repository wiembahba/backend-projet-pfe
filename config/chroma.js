// config/chroma.js
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { OllamaEmbeddings } = require('@langchain/ollama');

const getEmbeddingsModel = () => new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://127.0.0.1:11434",
});

let vectorStore = null;

const getVectorStore = async () => {
    if (!vectorStore) {
        vectorStore = new Chroma(getEmbeddingsModel(), {
            collectionName: "maison_du_web",
            url: "http://localhost:8000",
        });
    }
    return vectorStore;
};

const addDocuments = async (documents) => {
    try {
        const store = await getVectorStore();
        await store.addDocuments(documents);
    } catch(err) {
        console.error("❌ Chroma addDocuments:", err.message);
    }
};

const searchSimilar = async (query, k = 3) => {
    try {
        const store = await getVectorStore();
        return await store.similaritySearch(query, k);
    } catch(err) {
        console.error("❌ Chroma search:", err.message);
        return [];
    }
};

module.exports = { getVectorStore, addDocuments, searchSimilar };