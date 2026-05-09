require('dotenv').config();

const express            = require("express");
const cors               = require("cors");
const http               = require("http");
const { Server }         = require("socket.io");

const db                 = require("./config/db");
const authRoutes         = require("./routes/authRoutes");
const projetRoutes       = require('./routes/projetRoutes');
const dashboardRoutes    = require('./routes/dashboardRoutes');
const predictionRoutes   = require('./routes/predictionRoutes');
const equipeRoutes       = require('./routes/equipeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatbotRoutes      = require('./routes/chatbotRoutes');
const calendarRoutes     = require('./routes/calendarRoutes');
const documentRoutes     = require('./routes/documentRoutes');
const settingsRoutes     = require('./routes/settingsRoutes');

const rappelService           = require('./services/rappelService');
const risqueService           = require('./services/risqueService');
const { initializeRAG }       = require('./services/ragService');
const { startReminderService }= require('./services/reminderService');
const { verifyToken, isAdmin }= require('./middleware/authMiddleware');

// ─── App & Server ─────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "*" }
});

// ─── Middlewares globaux ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use('/api/projets',       projetRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/prediction',    predictionRoutes);
app.use('/api/equipe',        equipeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chatbot',       chatbotRoutes);
app.use("/api/calendar",      calendarRoutes);
app.use('/api/documents',     documentRoutes);
app.use('/api/settings',      settingsRoutes);

// ─── Users (web app - ancien) ─────────────────────────────────────────────────
app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, nom_complet, email, role FROM users"
    );
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur lors du chargement des utilisateurs" });
  }
});

app.delete("/api/users/:id", (req, res) => {
  const userId = req.params.id;
  db.query("DELETE FROM users WHERE id = ?", [userId], (err, result) => {
    if (err) return res.status(500).json({ message: "Erreur lors de la suppression" });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Utilisateur non trouve" });
    res.json({ success: true, message: "Utilisateur supprime avec succes" });
  });
});

// ─── Mobile aliases ───────────────────────────────────────────────────────────

// GET /api/utilisateurs — liste tous les utilisateurs
app.get('/api/utilisateurs', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, nom AS nom, prenom, email, role FROM users'
    );
    res.json({ success: true, utilisateurs: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/utilisateurs/:id — supprimer un utilisateur (admin)
app.delete('/api/utilisateurs/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: 'Utilisateur non trouve' });
    res.json({ success: true, message: 'Utilisateur supprime' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/projets/stats/globales — stats pour dashboard
app.get('/api/projets/stats/globales', verifyToken, async (req, res) => {
  try {
    const [[{ total_projets }]]     = await db.execute('SELECT COUNT(*) AS total_projets FROM projets');
    const [[{ projets_en_cours }]]  = await db.execute("SELECT COUNT(*) AS projets_en_cours FROM projets WHERE statut = 'en_cours'");
    const [[{ projets_termines }]]  = await db.execute("SELECT COUNT(*) AS projets_termines FROM projets WHERE statut = 'termine'");
    const [[{ projets_en_retard }]] = await db.execute("SELECT COUNT(*) AS projets_en_retard FROM projets WHERE statut = 'en_retard'");
    const [[{ total_taches }]]      = await db.execute('SELECT COUNT(*) AS total_taches FROM taches');
    const [[{ taux_completion }]]   = await db.execute(
      "SELECT ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM taches), 0), 0) AS taux_completion FROM taches WHERE statut = 'termine'"
    );
    res.json({
      success: true,
      stats: {
        total_projets,
        projets_en_cours,
        projets_termines,
        projets_en_retard,
        total_taches,
        taux_completion: taux_completion || 0,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/projets/taches/risquees — taches risquees pour chef dashboard
app.get('/api/projets/taches/risquees', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT t.id, t.titre, t.priorite, t.date_echeance, t.statut,
             CONCAT(u.prenom, ' ', u.nom) AS assigne_nom
      FROM taches t
      LEFT JOIN users u ON t.assigne_a = u.id
      WHERE t.priorite = 'haute' AND t.statut != 'termine'
      ORDER BY t.date_echeance ASC
      LIMIT 10
    `);
    res.json({ success: true, taches: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/projets/taches/mes-taches — taches de l'employe connecte
app.get('/api/projets/taches/mes-taches', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT t.id, t.titre, t.statut, t.priorite, t.date_echeance, t.progression,
             p.nom_projet AS projet_nom
      FROM taches t
      LEFT JOIN projets p ON t.projet_id = p.id
      WHERE t.assigne_a = ?
      ORDER BY t.date_echeance ASC
    `, [req.user.id]);
    res.json({ success: true, taches: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/projets/risques/analyse — analyse des risques
app.get('/api/projets/risques/analyse', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT t.id, t.titre, t.priorite AS niveau_risque, t.date_echeance,
             p.nom_projet AS projet_nom,
             CONCAT(u.prenom, ' ', u.nom) AS assigne_nom,
             CASE t.priorite
               WHEN 'critique' THEN 4
               WHEN 'haute'    THEN 3
               WHEN 'moyenne'  THEN 2
               ELSE 1
             END AS score_risque
      FROM taches t
      LEFT JOIN projets p ON t.projet_id = p.id
      LEFT JOIN users u ON t.assigne_a = u.id
      WHERE t.statut != 'termine'
      ORDER BY score_risque DESC
      LIMIT 20
    `);
    res.json({ success: true, risques: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/projets/risques/stats — stats risques
app.get('/api/projets/risques/stats', verifyToken, async (req, res) => {
  try {
    const [[{ critiques }]] = await db.execute("SELECT COUNT(*) AS critiques FROM taches WHERE priorite = 'critique' AND statut != 'termine'");
    const [[{ eleves }]]    = await db.execute("SELECT COUNT(*) AS eleves FROM taches WHERE priorite = 'haute' AND statut != 'termine'");
    const [[{ moderes }]]   = await db.execute("SELECT COUNT(*) AS moderes FROM taches WHERE priorite = 'moyenne' AND statut != 'termine'");
    const [[{ faibles }]]   = await db.execute("SELECT COUNT(*) AS faibles FROM taches WHERE priorite = 'basse' AND statut != 'termine'");
    res.json({ success: true, stats: { critiques, eleves, moderes, faibles } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/projets/calendrier/evenements — evenements calendrier
app.get('/api/projets/calendrier/evenements', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT t.id, t.titre AS title, t.date_echeance AS date,
             t.statut, t.priorite, p.nom_projet AS projet_nom
      FROM taches t
      LEFT JOIN projets p ON t.projet_id = p.id
      WHERE t.date_echeance IS NOT NULL
        AND (t.assigne_a = ? OR ? = (SELECT id FROM users WHERE role = 'admin' LIMIT 1))
      ORDER BY t.date_echeance ASC
    `, [req.user.id, req.user.id]);
    res.json({ success: true, evenements: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

// ─── Services periodiques ─────────────────────────────────────────────────────
startReminderService();

setInterval(() => {
  rappelService.verifierDeadlines();
  risqueService.verifierRisques();
}, 60 * 60 * 1000);

// ─── RAG ──────────────────────────────────────────────────────────────────────
initializeRAG();

// ─── Demarrage ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server lance sur le port ${PORT}`);
});