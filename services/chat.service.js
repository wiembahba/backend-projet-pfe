const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(val) {
  if (!val) return "N/A";
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString("fr-FR");
}

function getStatutEmoji(statut) {
  switch (statut) {
    case "termine":    return "✅";
    case "en_cours":   return "🔄";
    case "en_attente": return "⏳";
    case "a_faire":    return "📝";
    default:           return "•";
  }
}

function getPrioriteEmoji(priorite) {
  switch (priorite) {
    case "haute":    return "🔴";
    case "critique": return "🚨";
    case "moyenne":  return "🟡";
    case "faible":   return "🟢";
    default:         return "•";
  }
}

function formatProjets(label, rows) {
  if (!rows || rows.length === 0)
    return `❌ Aucun résultat pour : **${label}**`;
  const lines = rows.map((row, i) => {
    const statut      = getStatutEmoji(row.statut) + " " + (row.statut || "N/A");
    const priorite    = getPrioriteEmoji(row.priorite) + " " + (row.priorite || "N/A");
    const progression = row.progression !== undefined ? `📈 ${row.progression}%` : "";
    const date        = row.date_fin_prevue ? `📅 ${formatDate(row.date_fin_prevue)}` : "";
    const chef        = row.chef ? `👤 ${row.chef}` : "";
    return `**${i + 1}. ${row.nom_projet}**\n   ${statut} | ${priorite} | ${progression} | ${date} ${chef}`;
  });
  return `📂 **${label}** — ${rows.length} projet(s)\n\n${lines.join("\n\n")}`;
}

function formatTaches(label, rows) {
  if (!rows || rows.length === 0)
    return `❌ Aucun résultat pour : **${label}**`;
  const lines = rows.map((row, i) => {
    const statut      = getStatutEmoji(row.statut) + " " + (row.statut || "N/A");
    const progression = row.progression !== undefined ? `📈 ${row.progression}%` : "";
    const date        = row.date_echeance ? `📅 ${formatDate(row.date_echeance)}` : "";
    const projet      = row.nom_projet ? `📂 ${row.nom_projet}` : "";
    const assigne     = row.assigne_a ? `👤 ${row.assigne_a}` : "";
    const dateFin     = row.date_fin ? `🏁 Terminée le ${formatDate(row.date_fin)}` : "";
    return `**${i + 1}. ${row.titre}**\n   ${statut} | ${progression} | ${date} | ${projet} ${assigne} ${dateFin}`;
  });
  return `📋 **${label}** — ${rows.length} tâche(s)\n\n${lines.join("\n\n")}`;
}

function formatEquipe(label, rows) {
  if (!rows || rows.length === 0)
    return `❌ Aucun résultat pour : **${label}**`;
  const lines = rows.map((row, i) => {
    const poste     = row.poste ? `💼 ${row.poste}` : "";
    const dept      = row.departement ? `🏢 ${row.departement}` : "";
    const nb        = row.nb_taches !== undefined ? `📋 ${row.nb_taches} tâche(s)` : "";
    const terminees = row.terminees !== undefined ? `✅ ${row.terminees} terminée(s)` : "";
    const retard    = row.en_retard !== undefined ? `⚠️ ${row.en_retard} en retard` : "";
    return `**${i + 1}. ${row.nom_complet}**\n   ${poste} | ${dept}\n   ${nb} | ${terminees} | ${retard}`;
  });
  return `👥 **${label}** — ${rows.length} membre(s)\n\n${lines.join("\n\n")}`;
}

function formatAvancement(rows) {
  if (!rows || rows.length === 0) return "❌ Aucune donnée disponible.";
  const r = rows[0];
  return `📊 **Avancement global des projets**

🗂️ **Total projets** : ${r.total_projets}
📈 **Progression moyenne** : ${r.progression_moyenne}%
✅ **Terminés** : ${r.termines}
🔄 **En cours** : ${r.en_cours}
⏳ **En attente** : ${r.en_attente}`;
}

// ─── SQL Builder ──────────────────────────────────────────────────────────────

function buildSQL(question) {
  const q = question.toLowerCase();

  const namesInDB = ["wijden","adem","wiem","amna","skandeer","safa","weal","sara","ahmed","boutiti","mansouri","bahba","hamouda"];
  const mentionedName = namesInDB.find(name => q.includes(name));

  if ((q.includes("tache") || q.includes("tâche") || q.includes("combien") || q.includes("assigne")) && mentionedName)
    return {
      sql: `SELECT t.titre, t.statut, t.progression,
                   DATE_FORMAT(t.date_echeance, '%d/%m/%Y') as date_echeance,
                   p.nom_projet
            FROM taches t
            LEFT JOIN projets p ON t.projet_id = p.id
            LEFT JOIN users u ON t.assigne_a = u.id
            WHERE t.deleted_at IS NULL AND u.nom_complet LIKE '%${mentionedName}%'`,
      label: `Tâches de ${mentionedName}`,
      type: "taches"
    };

  if (q.includes("projet") && mentionedName)
    return {
      sql: `SELECT p.nom_projet, p.statut, p.progression, p.priorite,
                   DATE_FORMAT(p.date_fin_prevue, '%d/%m/%Y') as date_fin_prevue,
                   u.nom_complet as chef
            FROM projets p
            LEFT JOIN users u ON p.chef_projet_id = u.id
            WHERE p.deleted_at IS NULL AND u.nom_complet LIKE '%${mentionedName}%'`,
      label: `Projets de ${mentionedName}`,
      type: "projets"
    };

  const tacheKeyword = q.match(/(?:tache|tâche)\s+[""']?([a-zA-ZÀ-ÿ0-9\s]{3,30}?)[""']?\s*(?:est|a été|terminée?|en cours|en retard|\?|$)/i);
  if (tacheKeyword) {
    const keyword = tacheKeyword[1].trim();
    return {
      sql: `SELECT t.titre, t.statut, t.progression,
                   DATE_FORMAT(t.date_echeance, '%d/%m/%Y') as date_echeance,
                   DATE_FORMAT(t.date_fin, '%d/%m/%Y') as date_fin,
                   p.nom_projet, u.nom_complet as assigne_a
            FROM taches t
            LEFT JOIN projets p ON t.projet_id = p.id
            LEFT JOIN users u ON t.assigne_a = u.id
            WHERE t.deleted_at IS NULL AND t.titre LIKE '%${keyword}%'`,
      label: `Tâche "${keyword}"`,
      type: "taches"
    };
  }

  if (q.includes("avancement") || q.includes("progression") || q.includes("global") || (q.includes("quel") && q.includes("projet") && q.includes("avanc")))
    return {
      sql: `SELECT COUNT(*) as total_projets,
              ROUND(AVG(progression), 1) as progression_moyenne,
              SUM(CASE WHEN statut='termine' THEN 1 ELSE 0 END) as termines,
              SUM(CASE WHEN statut='en_cours' THEN 1 ELSE 0 END) as en_cours,
              SUM(CASE WHEN statut='en_attente' THEN 1 ELSE 0 END) as en_attente
            FROM projets WHERE deleted_at IS NULL`,
      label: "Avancement global",
      type: "avancement"
    };

  if (q.includes("en cours") && q.includes("projet"))
    return {
      sql: `SELECT nom_projet, statut, progression, priorite,
                   DATE_FORMAT(date_fin_prevue, '%d/%m/%Y') as date_fin_prevue
            FROM projets WHERE deleted_at IS NULL AND statut = 'en_cours'`,
      label: "Projets en cours",
      type: "projets"
    };

  if (q.includes("termin") && q.includes("projet"))
    return {
      sql: `SELECT nom_projet, statut, progression, priorite,
                   DATE_FORMAT(date_fin_prevue, '%d/%m/%Y') as date_fin_prevue
            FROM projets WHERE deleted_at IS NULL AND statut = 'termine'`,
      label: "Projets terminés",
      type: "projets"
    };

  if (q.includes("attente") && q.includes("projet"))
    return {
      sql: `SELECT nom_projet, statut, progression, priorite,
                   DATE_FORMAT(date_fin_prevue, '%d/%m/%Y') as date_fin_prevue
            FROM projets WHERE deleted_at IS NULL AND statut = 'en_attente'`,
      label: "Projets en attente",
      type: "projets"
    };

  if (q.includes("priorite") || q.includes("priorité") || (q.includes("haute") && q.includes("projet")))
    return {
      sql: `SELECT nom_projet, statut, progression, priorite,
                   DATE_FORMAT(date_fin_prevue, '%d/%m/%Y') as date_fin_prevue
            FROM projets WHERE deleted_at IS NULL AND priorite = 'haute'`,
      label: "Projets priorité haute",
      type: "projets"
    };

  if (q.includes("retard"))
    return {
      sql: `SELECT t.titre,
                   DATE_FORMAT(t.date_echeance, '%d/%m/%Y') as date_echeance,
                   u.nom_complet as assigne_a, p.nom_projet
            FROM taches t
            LEFT JOIN users u ON t.assigne_a = u.id
            LEFT JOIN projets p ON t.projet_id = p.id
            WHERE t.date_echeance < CURDATE() AND t.statut != 'termine'
            AND t.deleted_at IS NULL`,
      label: "Tâches en retard",
      type: "taches"
    };

  if (q.includes("termin") && (q.includes("tache") || q.includes("tâche")))
    return {
      sql: `SELECT t.titre, p.nom_projet,
                   DATE_FORMAT(t.date_fin, '%d/%m/%Y') as date_fin
            FROM taches t LEFT JOIN projets p ON t.projet_id = p.id
            WHERE t.statut = 'termine' AND t.deleted_at IS NULL LIMIT 10`,
      label: "Tâches terminées",
      type: "taches"
    };

  if (q.includes("tache") || q.includes("tâche"))
    return {
      sql: `SELECT t.titre, t.statut, t.progression,
                   DATE_FORMAT(t.date_echeance, '%d/%m/%Y') as date_echeance,
                   p.nom_projet
            FROM taches t LEFT JOIN projets p ON t.projet_id = p.id
            WHERE t.deleted_at IS NULL LIMIT 10`,
      label: "Tâches",
      type: "taches"
    };

  if (q.includes("employe") || q.includes("employé") || q.includes("equipe") || q.includes("équipe") || q.includes("membre"))
    return {
      sql: `SELECT u.nom_complet, u.poste, u.departement,
                   COUNT(t.id) as nb_taches,
                   SUM(CASE WHEN t.statut='termine' THEN 1 ELSE 0 END) as terminees,
                   SUM(CASE WHEN t.date_echeance < CURDATE() AND t.statut!='termine' THEN 1 ELSE 0 END) as en_retard
            FROM users u
            LEFT JOIN taches t ON t.assigne_a = u.id AND t.deleted_at IS NULL
            WHERE u.role = 'employe' AND u.deleted_at IS NULL
            GROUP BY u.id`,
      label: "Équipe",
      type: "equipe"
    };

  if (q.includes("projet"))
    return {
      sql: `SELECT nom_projet, statut, progression, priorite,
                   DATE_FORMAT(date_fin_prevue, '%d/%m/%Y') as date_fin_prevue
            FROM projets WHERE deleted_at IS NULL`,
      label: "Projets",
      type: "projets"
    };

  return null;
}

// ─── Groq Text ────────────────────────────────────────────────────────────────

async function askGroq(prompt) {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile", // ✅ model actif
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content: "Tu es un assistant intelligent de gestion de projets. Réponds toujours en français, de manière claire et concise."
      },
      { role: "user", content: prompt }
    ]
  });
  return response.choices[0].message.content;
}

// ─── Groq Vision ─────────────────────────────────────────────────────────────

async function askGroqVision(base64Image, mimetype, question) {
  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct", // ✅ vision model actif
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimetype};base64,${base64Image}` }
          },
          {
            type: "text",
            text: `Réponds en français. ${question}`
          }
        ]
      }
    ]
  });
  return response.choices[0].message.content;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

async function handleQuestion(question, user, options = {}) {
  try {
    const { runSQL } = require('../services/dbService');
    const q = question.toLowerCase();

    // ── 1. IMAGE mode ──────────────────────────────────────────────────────────
    if (options.imageBase64 && options.imageMimetype) {
      const reply = await askGroqVision(options.imageBase64, options.imageMimetype, question);
      return reply || "❌ Impossible d'analyser l'image.";
    }

    // ── 2. DOCUMENT mode ───────────────────────────────────────────────────────
    if (options.documentText) {
      const maxChars = 4000;
      const truncated = options.documentText.length > maxChars
        ? options.documentText.slice(0, maxChars) + "\n\n[... document tronqué ...]"
        : options.documentText;

      const prompt = `Tu es un assistant intelligent. L'utilisateur a partagé un document nommé "${options.documentName || 'document'}".

Contenu du document:
${truncated}

Question: ${question}
Réponds en français de façon claire et précise basée sur le contenu du document.`;

      return await askGroq(prompt);
    }

    // ── 3. Document sauvegardé en DB ───────────────────────────────────────────
    try {
      const docs = await runSQL(
        `SELECT content, filename FROM document_store
         WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
        [user?.id || 0]
      );
      if (docs && docs.length > 0) {
        const maxChars = 3000;
        const truncated = docs[0].content.length > maxChars
          ? docs[0].content.slice(0, maxChars) + "..."
          : docs[0].content;

        const prompt = `Tu es un assistant de gestion de projets.
L'utilisateur a uploadé un document nommé "${docs[0].filename}".

Contenu:
${truncated}

Question: ${question}
Réponds en français.`;

        return await askGroq(prompt);
      }
    } catch (e) {}

    // ── 4. Recherche projet spécifique par nom ─────────────────────────────────
    try {
      const allProjets = await runSQL(`SELECT nom_projet FROM projets WHERE deleted_at IS NULL`);
      if (allProjets && allProjets.length > 0) {
        const mentionedProjet = allProjets.find(p =>
          p.nom_projet && q.includes(p.nom_projet.toLowerCase())
        );
        if (mentionedProjet) {
          const rows = await runSQL(`
            SELECT p.nom_projet, p.statut, p.progression, p.priorite,
                   DATE_FORMAT(p.date_fin_prevue, '%d/%m/%Y') as date_fin_prevue,
                   u.nom_complet as chef
            FROM projets p
            LEFT JOIN users u ON p.chef_projet_id = u.id
            WHERE p.deleted_at IS NULL AND p.nom_projet = ?
          `, [mentionedProjet.nom_projet]);
          return formatProjets(`Projet : ${mentionedProjet.nom_projet}`, rows);
        }
      }
    } catch (e) {}

    // ── 5. Recherche tâche spécifique par titre ────────────────────────────────
    try {
      const allTaches = await runSQL(`SELECT titre FROM taches WHERE deleted_at IS NULL`);
      if (allTaches && allTaches.length > 0) {
        const mentionedTache = allTaches.find(t =>
          t.titre && q.includes(t.titre.toLowerCase())
        );
        if (mentionedTache) {
          const rows = await runSQL(`
            SELECT t.titre, t.statut, t.progression,
                   DATE_FORMAT(t.date_echeance, '%d/%m/%Y') as date_echeance,
                   DATE_FORMAT(t.date_fin, '%d/%m/%Y') as date_fin,
                   p.nom_projet, u.nom_complet as assigne_a
            FROM taches t
            LEFT JOIN projets p ON t.projet_id = p.id
            LEFT JOIN users u ON t.assigne_a = u.id
            WHERE t.deleted_at IS NULL AND t.titre = ?
          `, [mentionedTache.titre]);
          return formatTaches(`Tâche : ${mentionedTache.titre}`, rows);
        }
      }
    } catch (e) {}

    // ── 6. buildSQL règles génériques ─────────────────────────────────────────
    const result = buildSQL(question);
    if (result) {
      const rows = await runSQL(result.sql);
      switch (result.type) {
        case "projets":    return formatProjets(result.label, rows);
        case "taches":     return formatTaches(result.label, rows);
        case "equipe":     return formatEquipe(result.label, rows);
        case "avancement": return formatAvancement(rows);
        default:           return formatTaches(result.label, rows);
      }
    }

    // ── 7. Fallback LLM avec contexte DB ──────────────────────────────────────
    let dbContext = "";
    try {
      const [projets, taches] = await Promise.all([
        runSQL(`SELECT nom_projet, statut, progression, priorite FROM projets WHERE deleted_at IS NULL LIMIT 10`),
        runSQL(`SELECT t.titre, t.statut, u.nom_complet as assigne_a FROM taches t LEFT JOIN users u ON t.assigne_a = u.id WHERE t.deleted_at IS NULL LIMIT 10`)
      ]);
      if (projets.length > 0) {
        dbContext += `\nProjets actuels:\n`;
        projets.forEach(p => {
          dbContext += `- ${p.nom_projet} (${p.statut}, ${p.progression}%, priorité: ${p.priorite})\n`;
        });
      }
      if (taches.length > 0) {
        dbContext += `\nTâches récentes:\n`;
        taches.forEach(t => {
          dbContext += `- ${t.titre} (${t.statut}) → ${t.assigne_a || "N/A"}\n`;
        });
      }
    } catch (e) {}

    const prompt = `Tu es un assistant intelligent de gestion de projets.
${dbContext ? `Données actuelles du système:\n${dbContext}\n` : ""}
Question: ${question}

Réponds en français de façon précise. Si la question concerne les données ci-dessus, utilise-les. Sinon réponds de façon générale sur la gestion de projets.`;

    return await askGroq(prompt);

  } catch (err) {
    console.error("ERROR chatbot:", err.message);
    return "❌ Erreur serveur chatbot.";
  }
}

module.exports = { handleQuestion, askGroq, askGroqVision };