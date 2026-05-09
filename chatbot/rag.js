const { Chroma } = require("langchain/vectorstores/chroma");
const { OllamaEmbeddings } = require("@langchain/ollama");

const embeddings = new OllamaEmbeddings({
  model: "mistral"
});

async function retrieveContext(question) {
  const db = await Chroma.fromExistingCollection(
    embeddings,
    { collectionName: "gestion_docs" }
  );

  const results = await db.similaritySearch(question, 3);

  return results.map(r => r.pageContent).join("\n");
}

module.exports = { retrieveContext };