const { ChromaClient } = require("chromadb");

const client = new ChromaClient();

async function getCollection() {
  return await client.getOrCreateCollection({
    name: "smart_context",
  });
}

// ⚡ context dynamique من DB
async function buildContextFromDB(db) {
  const [projects] = await db.execute("SELECT nom, avancement FROM projets");

  return projects.map(p =>
    `Projet ${p.nom} est à ${p.avancement}%`
  );
}

module.exports = { getCollection, buildContextFromDB };