console.log('🚀 DÉMARRAGE SERVEUR...');
require('dotenv').config({ override: true });

// Vérification immédiate
console.log('✅ JWT_SECRET:', process.env.JWT_SECRET ? 'TROUVÉ' : 'NON TROUVÉ');
console.log('✅ PORT:', process.env.PORT || '5000 (défaut)');

const express = require("express");
const cors = require("cors");
const http = require("http");              // ✅ ajouté
const { Server } = require("socket.io");
const db = require("./config/db"); // ta connexion MySQL
const authRoutes = require("./routes/authRoutes");
const projetRoutes = require('./routes/projetRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const equipeRoutes = require('./routes/equipeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const rappelService = require('./services/rappelService');
const risqueService = require('./services/risqueService');
const chatbotRoutes = require('./routes/chatbotRoutes');
const { initializeRAG } = require('./services/ragService'); 



const app = express();
const server = http.createServer(app);     // ✅ ajouté
const io = new Server(server, {           // ✅ ajouté
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use('/api/projets', projetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/prediction', predictionRoutes);
app.use('/api/equipe', equipeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Route pour récupérer tous les utilisateurs
app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, nom_complet, email, role FROM users"
    );

    res.json({ users: rows });

  } catch (err) {
    console.log("Erreur DB:", err);
    res.status(500).json({
      message: "Erreur serveur lors du chargement des utilisateurs"
    });
  }
});
app.delete("/api/users/:id", (req, res) => {
  const userId = req.params.id;
  
  // Supprimer l'utilisateur de la base de données
  db.query("DELETE FROM users WHERE id = ?", [userId], (err, result) => {
    if (err) {
      console.log("Erreur suppression:", err);
      return res.status(500).json({ message: "Erreur lors de la suppression" });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    // Succès !
    res.json({ 
      success: true,
      message: "Utilisateur supprimé avec succès" 
    });
  });
});
setInterval(() => {
    rappelService.verifierDeadlines();
    risqueService.verifierRisques();
}, 60 * 60 * 1000);

 io.on('connection', (socket) => {
    console.log('🔌 Client connecté');
    socket.on('disconnect', () => console.log('🔌 Client déconnecté'));
});
initializeRAG();
server.listen(5000, () => {
  console.log("Server running on port 5000");
});