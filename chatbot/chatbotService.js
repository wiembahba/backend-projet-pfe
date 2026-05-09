// ============================================================
//  chatbotService.js  –  Version 4.0
//  ✅ Multi-langue  ✅ SQL généré par IA  ✅ Réponses intelligentes
//  ✅ Sessions kima ChatGPT  ✅ Historique persistant par session
//  ✅ Fix v3.1: document store guard
//  ✅ Fix v4.0: salutations → réponse directe SANS passer par Groq
//  ✅ Fix v4.0: conversation type → réponse simple sans hallucination
// ============================================================

const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const {
  createSession,
  autoTitleSession,
  loadHistory,
  saveMessage,
} = require('./chatHistoryService');

// ─── Schéma DB ───────────────────────────────────────────────

const DB_SCHEMA = `
Base de données MySQL: gestion_projet

TABLE projets:
  id, nom_projet, description, chef_projet_id (FK→users.id),
  date_debut, date_fin_prevue, date_fin_reelle,
  statut ENUM('en_attente','en_cours','termine','annule','en_pause'),
  priorite ENUM('faible','moyenne','haute','critique'),
  progression INT(0-100), created_at, updated_at, deleted_at, created_by

TABLE taches:
  id, projet_id (FK→projets.id), titre, description,
  assigne_a (FK→users.id), statut ENUM('a_faire','en_cours','termine'),
  priorite ENUM('faible','moyenne','haute'),
  date_debut, date_echeance, date_fin, progression INT(0-100),
  created_at, updated_at, deleted_at, created_by

TABLE users:
  id, nom_complet, prenom, email,
  role ENUM('admin','chef_projet','employe'),
  status, matricule, telephone, poste, departement, deleted_at

TABLE commentaires_tache:
  id, tache_id, user_id, commentaire, created_at

TABLE sous_taches:
  id, tache_id (FK→taches.id), titre, termine TINYINT(1 = terminée, 0 = pas terminée),
  created_by (FK→users.id), created_at
  NOTE: sous_taches n'a PAS de deleted_at

TABLE events:
  id, title, description, start_date, end_date,
  visibility ENUM('public','private'), created_by, deleted_at

RÈGLES SQL OBLIGATOIRES:
- Toujours: WHERE deleted_at IS NULL pour projets, taches, users
- sous_taches: PAS de filtre deleted_at (la table n'en a pas)
- Employés: WHERE role = 'employe'
- Tâches en retard: date_echeance < CURDATE() AND statut != 'termine'
- Dates: DATE_FORMAT(champ, '%d/%m/%Y')
- Recherche nom: LIKE '%keyword%'
- Max résultats: LIMIT 30

RÈGLES CRITIQUES SUR LES INTENTIONS:
- "tâches de X" / "tache X" / "donne tache X" / "a3tini tache X" → JOIN taches + users WHERE nom_complet LIKE '%X%'
- Ne JAMAIS retourner un user seul quand on demande ses tâches
- "projets de X" → JOIN projets + users WHERE chef_projet_id = user.id AND nom_complet LIKE '%X%'
- "tâches en retard" → date_echeance < CURDATE() AND statut != 'termine'
- "equipe" / "membres" → SELECT users avec leurs stats de tâches

EXEMPLES SQL CRITIQUES:

-- ✅ Tâches assignées à un utilisateur par son nom:
SELECT t.titre, t.statut, t.priorite, t.progression,
       DATE_FORMAT(t.date_echeance, '%d/%m/%Y') as date_echeance,
       DATE_FORMAT(t.date_fin, '%d/%m/%Y') as date_fin,
       p.nom_projet,
       u.nom_complet as assigne_a
FROM taches t
JOIN users u ON t.assigne_a = u.id
JOIN projets p ON t.projet_id = p.id
WHERE u.nom_complet LIKE '%adem%'
  AND t.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND u.deleted_at IS NULL
ORDER BY t.date_echeance ASC

-- ✅ Sous-tâches d'une tâche par son titre:
SELECT st.titre, st.termine, t.titre as tache, p.nom_projet
FROM sous_taches st
JOIN taches t ON st.tache_id = t.id
JOIN projets p ON t.projet_id = p.id
WHERE t.titre LIKE '%mot_cle%' AND t.deleted_at IS NULL

-- ✅ Sous-tâches d'un projet:
SELECT st.titre, st.termine, t.titre as tache_parente
FROM sous_taches st
JOIN taches t ON st.tache_id = t.id
JOIN projets p ON t.projet_id = p.id
WHERE p.nom_projet LIKE '%nom_projet%'
  AND t.deleted_at IS NULL
  AND p.deleted_at IS NULL

-- ✅ Toutes les sous-tâches:
SELECT st.titre as sous_tache, st.termine,
       t.titre as tache_parente, t.statut as statut_tache,
       p.nom_projet
FROM sous_taches st
JOIN taches t ON st.tache_id = t.id
JOIN projets p ON t.projet_id = p.id
WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL
ORDER BY p.nom_projet, t.titre

-- ✅ Projets d'un chef de projet:
SELECT p.nom_projet, p.statut, p.progression, p.priorite,
       DATE_FORMAT(p.date_fin_prevue, '%d/%m/%Y') as date_fin_prevue
FROM projets p
JOIN users u ON p.chef_projet_id = u.id
WHERE u.nom_complet LIKE '%nom%'
  AND p.deleted_at IS NULL
  AND u.deleted_at IS NULL

-- ✅ Tâches en retard:
SELECT t.titre, t.statut, t.priorite,
       DATE_FORMAT(t.date_echeance, '%d/%m/%Y') as date_echeance,
       u.nom_complet as assigne_a,
       p.nom_projet
FROM taches t
LEFT JOIN users u ON t.assigne_a = u.id
JOIN projets p ON t.projet_id = p.id
WHERE t.date_echeance < CURDATE()
  AND t.statut != 'termine'
  AND t.deleted_at IS NULL
  AND p.deleted_at IS NULL
ORDER BY t.date_echeance ASC
`;

// ─── Détection salutations ────────────────────────────────────

const GREETINGS_REGEX = /^(bonjour|bonsoir|salut|hello|hi|hey|salam|ahla|مرحبا|صباح|مساء|ça va|cv|wach|wach labas|labas|lbes|la bes|kifech|cava|ca va|good morning|good evening|good afternoon|slt|bjr|bsr)\b/i;

function isGreeting(question) {
  const q = question.trim().toLowerCase();
  const wordCount = q.split(/\s+/).length;
  return GREETINGS_REGEX.test(q) && wordCount <= 6;
}

// ─── ✅ FIX v4.0: Réponses statiques aux salutations (ZERO Groq) ─

function getGreetingResponse(question) {
  const q = question.trim().toLowerCase();
  if (/bonsoir|good evening|مساء/.test(q)) {
    return "Bonsoir ! Comment puis-je vous aider ? Je peux vous renseigner sur vos projets, tâches ou équipe. 😊";
  }
  if (/salam|ahla|مرحبا/.test(q)) {
    return "أهلاً وسهلاً! كيف أقدر نساعدك؟ نقدر نشوفو معاك المشاريع، المهام أو الفريق. 😊";
  }
  if (/ça va|cava|ca va|wach labas|labas|lbes|kifech/.test(q)) {
    return "Labas, merci ! Et vous ? Je suis là pour vous aider avec vos projets et tâches. 😊";
  }
  return "Bonjour ! Comment puis-je vous aider ? Je peux vous renseigner sur vos projets, tâches ou équipe. 😊";
}

// ─── Détection question DB ────────────────────────────────────
// ✅ FIX v3.1: évite que le document store intercepte les questions DB

function isDBQuestion(question) {
  return /projet|tache|tâche|equipe|équipe|employe|employé|avancement|retard|progression|statut|membre|liste|deadline|échéance|echeance|sous.tache|événement|event/i.test(question);
}

// ─── Pre-processing: résout les typos via matching DB réel ───

async function resolveEntities(question, runSQL) {
  const result = { taches: [], projets: [], users: [] };
  try {
    const [allTaches, allProjets, allUsers] = await Promise.all([
      runSQL(`SELECT titre FROM taches WHERE deleted_at IS NULL`),
      runSQL(`SELECT nom_projet FROM projets WHERE deleted_at IS NULL`),
      runSQL(`SELECT nom_complet FROM users WHERE deleted_at IS NULL`)
    ]);

    const qLower = question.toLowerCase();

    function isSimilar(name) {
      const n = name.toLowerCase();
      if (qLower.includes(n) || n.includes(qLower)) return true;
      const words = n.split(/\s+/).filter(w => w.length > 2);
      if (words.length === 0) return false;
      const hits = words.filter(w => qLower.includes(w));
      return hits.length / words.length >= 0.5;
    }

    for (const t of allTaches) if (t.titre && isSimilar(t.titre)) result.taches.push(t.titre);
    for (const p of allProjets) if (p.nom_projet && isSimilar(p.nom_projet)) result.projets.push(p.nom_projet);
    for (const u of allUsers) if (u.nom_complet && isSimilar(u.nom_complet)) result.users.push(u.nom_complet);
  } catch (e) {
    console.error("resolveEntities error:", e.message);
  }
  return result;
}

// ─── Étape 1: Groq génère le SQL ────────────────────────────

async function generateSQL(question, history = [], entities = {}) {
  let contextHint = "";
  if (entities.taches?.length)  contextHint += `\nTâches correspondantes dans la DB: ${entities.taches.join(", ")}`;
  if (entities.projets?.length) contextHint += `\nProjets correspondants dans la DB: ${entities.projets.join(", ")}`;
  if (entities.users?.length)   contextHint += `\nUtilisateurs correspondants dans la DB: ${entities.users.join(", ")}`;

  const messages = [
    {
      role: "system",
      content: `Tu es un expert SQL MySQL pour un système de gestion de projets.

${DB_SCHEMA}

MISSION: Analyser la question et retourner UNIQUEMENT un JSON valide, sans aucun texte avant ou après.

FORMAT OBLIGATOIRE:
{"sql":"SELECT ...","label":"description courte","type":"projets|taches|equipe|avancement|events|general"}

Si la question est une salutation ou ne concerne pas la DB:
{"sql":null,"label":null,"type":"conversation"}

RAPPEL CRITIQUE:
- Si on demande les tâches D'UNE PERSONNE → toujours JOIN taches + users, jamais SELECT users seul
- "a3tini tache X" = "donne-moi les tâches de X" → SQL avec JOIN

IMPORTANT: Retourne SEULEMENT le JSON brut, rien d'autre, pas de markdown.`
    },
    ...history.slice(-4).map(h => ({ role: h.role, content: h.content })),
    { role: "user", content: `Question: "${question}"${contextHint}` }
  ];

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 500,
    temperature: 0.1,
    messages
  });

  const raw = response.choices[0].message.content.trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { sql: null, label: null, type: "conversation" };

  try {
    return JSON.parse(match[0]);
  } catch (e) {
    console.error("generateSQL parse error:", e.message);
    return { sql: null, label: null, type: "conversation" };
  }
}

// ─── Formatters ──────────────────────────────────────────────

function formatDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString("fr-FR");
}

const STATUT_EMOJI   = { termine:"✅", en_cours:"🔄", en_attente:"⏳", a_faire:"📝", annule:"❌", en_pause:"⏸️" };
const PRIORITE_EMOJI = { haute:"🔴", critique:"🚨", moyenne:"🟡", faible:"🟢" };

function formatTacheCard(t, i) {
  const statut   = (STATUT_EMOJI[t.statut]     || "•") + " " + (t.statut    || "N/A");
  const priorite = (PRIORITE_EMOJI[t.priorite]  || "•") + " " + (t.priorite || "N/A");
  const prog     = t.progression !== undefined  ? `📊 ${t.progression}%` : "";
  const ech      = t.date_echeance ? `📅 ${formatDate(t.date_echeance)}` : "";
  const fin      = t.date_fin      ? `🏁 fin: ${formatDate(t.date_fin)}`  : "";
  const projet   = t.nom_projet    ? `📂 ${t.nom_projet}`                 : "";
  const assigne  = t.assigne_a     ? `👤 ${t.assigne_a}`                  : "";
  const details  = [statut, priorite, prog, ech, fin, projet, assigne].filter(Boolean).join("  |  ");
  return `**${i}. ${t.titre || "—"}**\n   ${details}`;
}

function formatProjetCard(p, i) {
  const statut   = (STATUT_EMOJI[p.statut]    || "•") + " " + (p.statut    || "N/A");
  const priorite = (PRIORITE_EMOJI[p.priorite] || "•") + " " + (p.priorite || "N/A");
  const prog     = p.progression !== undefined ? `📊 ${p.progression}%` : "";
  const chef     = p.chef             ? `👤 ${p.chef}` : "";
  const ech      = p.date_fin_prevue  ? `📅 ${formatDate(p.date_fin_prevue)}` : "";
  const taches   = p.nb_taches !== undefined
    ? `\n   📋 ${p.nb_taches} tâche(s)  ✅ ${p.taches_terminees||0}  🔄 ${p.taches_en_cours||0}  ⚠️ ${p.en_retard||0} en retard`
    : "";
  const details  = [statut, priorite, prog, ech, chef].filter(Boolean).join("  |  ");
  return `**${i}. ${p.nom_projet || "—"}**\n   ${details}${taches}`;
}

function formatSousTacheCard(st, i) {
  const done    = st.termine ? "✅ Terminée" : "🔲 Non terminée";
  const tache   = st.tache || st.tache_parente ? `📋 ${st.tache || st.tache_parente}` : "";
  const projet  = st.nom_projet ? `📂 ${st.nom_projet}` : "";
  const details = [done, tache, projet].filter(Boolean).join("  |  ");
  return `**${i}. ${st.titre || st.sous_tache || "—"}**\n   ${details}`;
}

function formatMemberCard(u, i) {
  const poste = u.poste       ? `💼 ${u.poste}`       : "";
  const dept  = u.departement ? `🏢 ${u.departement}` : "";
  const nb    = u.nb_taches  !== undefined ? `📋 ${u.nb_taches} tâche(s)`    : "";
  const term  = u.terminees  !== undefined ? `✅ ${u.terminees} terminée(s)` : "";
  const ret   = u.en_retard  !== undefined ? `⚠️ ${u.en_retard} en retard`  : "";
  return `**${i}. ${u.nom_complet || "—"}**\n   ${[poste, dept, nb, term, ret].filter(Boolean).join("  |  ")}`;
}

function directFormat(rows, label, type) {
  if (!rows || rows.length === 0) return null;
  const f = rows[0];

  if (type === "sous_taches" || f.tache_parente !== undefined || f.sous_tache !== undefined) {
    const term = rows.filter(r => r.termine).length;
    return `📎 **${label}** — ${rows.length} sous-tâche(s) | ✅ ${term} terminée(s)\n\n${rows.map((r,i)=>formatSousTacheCard(r,i+1)).join("\n\n")}`;
  }
  if (type === "taches" || (f.titre !== undefined && (f.date_echeance !== undefined || f.assigne_a !== undefined))) {
    const term  = rows.filter(r => r.statut === "termine").length;
    const cours = rows.filter(r => r.statut === "en_cours").length;
    return `📋 **${label}** — ${rows.length} tâche(s) | ✅ ${term} terminée(s) | 🔄 ${cours} en cours\n\n${rows.map((r,i)=>formatTacheCard(r,i+1)).join("\n\n")}`;
  }
  if (type === "projets" || f.nom_projet !== undefined) {
    return `📂 **${label}** — ${rows.length} projet(s)\n\n${rows.map((r,i)=>formatProjetCard(r,i+1)).join("\n\n")}`;
  }
  if (type === "equipe" || (f.nom_complet !== undefined && f.nb_taches !== undefined)) {
    return `👥 **${label}** — ${rows.length} membre(s)\n\n${rows.map((r,i)=>formatMemberCard(r,i+1)).join("\n\n")}`;
  }
  if (type === "avancement" || f.total_projets !== undefined) {
    return `📊 **Avancement global**\n\n🗂️ ${f.total_projets} projets  |  📈 ${f.progression_moyenne}% moyenne  |  ✅ ${f.termines} terminés  |  🔄 ${f.en_cours} en cours  |  ⏳ ${f.en_attente} en attente`;
  }
  return null;
}

// ─── Étape 2: Réponse finale ─────────────────────────────────

async function generateAnswer(question, dbData, dbLabel, history = [], sqlType = null) {
  const directResult = Array.isArray(dbData) && dbData.length > 0
    ? directFormat(dbData, dbLabel || "Résultats", sqlType)
    : null;

  if (directResult) {
    const introResp = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 120,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: `Tu es ProBot, assistant intelligent de gestion de projets.
Réponds dans la même langue que la question (darija/français/arabe/anglais).
Écris une introduction chaleureuse en 1-2 phrases MAX.
Mentionne le nombre de résultats et ce qu'ils représentent.
Pas de listes. INTERDIT: ne mentionne jamais d'Epics, User Stories ou specs fictives.`
        },
        ...history.slice(-3).map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: `Question: "${question}" — ${dbData.length} résultat(s). Intro courte:` }
      ]
    });
    const intro = introResp.choices[0].message.content.trim();
    return `${intro}\n\n${directResult}`;
  }

  const dataContext = Array.isArray(dbData) && dbData.length > 0
    ? `\n\nDonnées: ${JSON.stringify(dbData.slice(0, 15), null, 2)}`
    : dbData !== null ? `\n\nAucun résultat pour: ${dbLabel}` : "";

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1200,
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: `Tu es ProBot, assistant expert en gestion de projets.
LANGUE: Réponds TOUJOURS dans la même langue que la question (darija/français/arabe/anglais).
STYLE: Sois chaleureux, précis et structuré.
FORMAT: emojis pertinents, structure claire.
INTERDIT: Ne mentionne jamais d'Epics, User Stories, ou spécifications fictives.
INTERDIT: Ne dis jamais "je n'ai pas accès".`
      },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: `Question: "${question}"${dataContext}` }
    ]
  });
  return response.choices[0].message.content;
}

// ─── Snapshot complet de la DB (fallback) ───────────────────

async function loadDBSnapshot(runSQL) {
  try {
    const [projets, tachesStats, equipe] = await Promise.all([
      runSQL(`
        SELECT p.nom_projet, p.statut, p.progression, p.priorite,
               DATE_FORMAT(p.date_fin_prevue, '%d/%m/%Y') as date_fin_prevue,
               u.nom_complet as chef,
               COUNT(t.id) as nb_taches,
               SUM(CASE WHEN t.statut='termine' THEN 1 ELSE 0 END) as taches_terminees,
               SUM(CASE WHEN t.statut='en_cours' THEN 1 ELSE 0 END) as taches_en_cours,
               SUM(CASE WHEN t.date_echeance < CURDATE() AND t.statut!='termine' THEN 1 ELSE 0 END) as en_retard
        FROM projets p
        LEFT JOIN users u ON p.chef_projet_id = u.id
        LEFT JOIN taches t ON t.projet_id = p.id AND t.deleted_at IS NULL
        WHERE p.deleted_at IS NULL
        GROUP BY p.id ORDER BY p.updated_at DESC
      `),
      runSQL(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN statut='termine' THEN 1 ELSE 0 END) as terminees,
               SUM(CASE WHEN statut='en_cours' THEN 1 ELSE 0 END) as en_cours,
               SUM(CASE WHEN statut='a_faire' THEN 1 ELSE 0 END) as a_faire,
               SUM(CASE WHEN date_echeance < CURDATE() AND statut!='termine' THEN 1 ELSE 0 END) as en_retard
        FROM taches WHERE deleted_at IS NULL
      `),
      runSQL(`
        SELECT u.nom_complet, u.poste, u.departement,
               COUNT(t.id) as nb_taches,
               SUM(CASE WHEN t.statut='termine' THEN 1 ELSE 0 END) as terminees,
               SUM(CASE WHEN t.date_echeance < CURDATE() AND t.statut!='termine' THEN 1 ELSE 0 END) as en_retard
        FROM users u
        LEFT JOIN taches t ON t.assigne_a = u.id AND t.deleted_at IS NULL
        WHERE u.role = 'employe' AND u.deleted_at IS NULL
        GROUP BY u.id
      `)
    ]);
    return { projets, statistiques_taches: tachesStats[0], equipe };
  } catch (e) {
    console.error("loadDBSnapshot error:", e.message);
    return null;
  }
}

// ─── Gestion image (Groq Vision) ────────────────────────────

async function handleImage(base64Image, mimetype, question) {
  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mimetype};base64,${base64Image}` } },
        { type: "text", text: `Réponds dans la même langue que cette question: "${question}". Question: ${question}` }
      ]
    }]
  });
  return response.choices[0].message.content;
}

// ─── Handler principal ───────────────────────────────────────

async function handleQuestion(question, user, options = {}) {
  try {
    const { runSQL } = require('../services/dbService');

    // ── Gestion session ──────────────────────────────────────
    let sessionId = options.sessionId;

    if (!sessionId) {
      sessionId = await createSession(user?.id || 0, runSQL);
    }

    const history = await loadHistory(sessionId, runSQL);

    if (history.length === 0) {
      await autoTitleSession(sessionId, question, runSQL);
    }

    // ── Mode IMAGE ───────────────────────────────────────────
    if (options.imageBase64 && options.imageMimetype) {
      const answer = await handleImage(options.imageBase64, options.imageMimetype, question);
      await saveMessage(sessionId, user?.id || 0, 'user', question, runSQL);
      await saveMessage(sessionId, user?.id || 0, 'assistant', answer, runSQL);
      return { answer, sessionId };
    }

    // ── Mode DOCUMENT direct (uploadé maintenant) ────────────
    if (options.documentText) {
      const truncated = options.documentText.slice(0, 6000);
      const answer = await generateAnswer(
        question,
        [{ document: options.documentName, contenu: truncated }],
        `Document: ${options.documentName}`,
        history
      );
      await saveMessage(sessionId, user?.id || 0, 'user', question, runSQL);
      await saveMessage(sessionId, user?.id || 0, 'assistant', answer, runSQL);
      return { answer, sessionId };
    }

    // ── Document sauvegardé en DB ────────────────────────────
    // ✅ FIX v3.1: on ignore le document store si la question concerne la DB
    if (!isDBQuestion(question)) {
      try {
        const docs = await runSQL(
          `SELECT content, filename FROM document_store WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
          [user?.id || 0]
        );
        if (docs?.length > 0 && docs[0].content) {
          const answer = await generateAnswer(
            question,
            [{ document: docs[0].filename, contenu: docs[0].content.slice(0, 5000) }],
            `Document: ${docs[0].filename}`,
            history
          );
          await saveMessage(sessionId, user?.id || 0, 'user', question, runSQL);
          await saveMessage(sessionId, user?.id || 0, 'assistant', answer, runSQL);
          return { answer, sessionId };
        }
      } catch (e) { /* pas de doc */ }
    }

    // ── ✅ FIX v4.0: Salutation → réponse statique SANS Groq ─
    // DOIT être avant generateSQL pour éviter toute hallucination
    if (isGreeting(question)) {
      const answer = getGreetingResponse(question);
      await saveMessage(sessionId, user?.id || 0, 'user', question, runSQL);
      await saveMessage(sessionId, user?.id || 0, 'assistant', answer, runSQL);
      return { answer, sessionId };
    }

    // ── Pre-processing: résoudre les noms/typos ──────────────
    const entities = await resolveEntities(question, runSQL);

    // ── Étape 1: Groq génère le SQL ──────────────────────────
    const sqlPlan = await generateSQL(question, history, entities);

    // ── ✅ FIX v4.0: type "conversation" → réponse simple sans hallucination
    if (sqlPlan.type === "conversation" && !sqlPlan.sql) {
      const answer = "Je suis ProBot, votre assistant de gestion de projets. Posez-moi des questions sur vos projets, tâches ou équipe ! 😊";
      await saveMessage(sessionId, user?.id || 0, 'user', question, runSQL);
      await saveMessage(sessionId, user?.id || 0, 'assistant', answer, runSQL);
      return { answer, sessionId };
    }

    let dbRows = null;
    let dbLabel = sqlPlan.label;

    if (sqlPlan.sql) {
      try {
        dbRows = await runSQL(sqlPlan.sql);
        // Retry avec noms exacts si 0 résultats
        if ((!dbRows || dbRows.length === 0) && (entities.taches.length || entities.projets.length || entities.users.length)) {
          const hint = `[Noms exacts DB: taches="${entities.taches.join(',')}", projets="${entities.projets.join(',')}", users="${entities.users.join(',')}"]`;
          const retryPlan = await generateSQL(question + hint, history, entities);
          if (retryPlan.sql) {
            try { dbRows = await runSQL(retryPlan.sql); dbLabel = retryPlan.label; } catch (e2) {}
          }
        }
      } catch (sqlErr) {
        console.error("SQL execution error:", sqlErr.message);
        console.error("SQL was:", sqlPlan.sql);
        const snapshot = await loadDBSnapshot(runSQL);
        dbRows = snapshot ? [snapshot] : null;
        dbLabel = "Vue globale du système";
      }
    } else if (sqlPlan.type !== "conversation") {
      const projectRelated = /projet|tache|tâche|equipe|équipe|employe|employé|avancement|retard|progression|statut|task|project|sous.tache/i.test(question);
      if (projectRelated || entities.taches.length || entities.projets.length || entities.users.length) {
        const snapshot = await loadDBSnapshot(runSQL);
        if (snapshot) { dbRows = [snapshot]; dbLabel = "Vue globale du système"; }
      }
    }

    // ── Étape 2: formatter direct + intro Groq ───────────────
    const answer = await generateAnswer(question, dbRows, dbLabel, history, sqlPlan?.type);

    // ── Sauvegarder les 2 messages dans la DB ────────────────
    await saveMessage(sessionId, user?.id || 0, 'user', question, runSQL);
    await saveMessage(sessionId, user?.id || 0, 'assistant', answer, runSQL);

    return { answer, sessionId };

  } catch (err) {
    console.error("ERROR chatbot:", err.message);
    return {
      answer: "❌ Erreur serveur. Réessaie dans quelques instants.",
      sessionId: options.sessionId || null
    };
  }
}

// ─── Exports ─────────────────────────────────────────────────
module.exports = { handleQuestion };