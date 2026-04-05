console.log('🚀 DÉMARRAGE SERVEUR...');
require('dotenv').config({ override: true });

// Vérification immédiate
console.log('✅ JWT_SECRET:', process.env.JWT_SECRET ? 'TROUVÉ' : 'NON TROUVÉ');
console.log('✅ PORT:', process.env.PORT || '5000 (défaut)');

const express = require("express");
const cors = require("cors");
const db = require("./config/db"); // ta connexion MySQL
const authRoutes = require("./routes/authRoutes");
const projetRoutes = require('./routes/projetRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const equipeRoutes = require('./routes/equipeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const rappelService = require('./services/rappelService');
const risqueService = require('./services/risqueService');


const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use('/api/projets', projetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/prediction', predictionRoutes);
app.use('/api/equipe', equipeRoutes);
app.use('/api/notifications', notificationRoutes);

// Route pour récupérer tous les utilisateurs
app.get("/api/users", (req, res) => {
  const sql = "SELECT id, nom_complet, email, role FROM users"; // champs que tu veux renvoyer
  db.query(sql, (err, result) => {
    if (err) {
      console.log("Erreur DB:", err);
      return res.status(500).json({ message: "Erreur serveur lors du chargement des utilisateurs" });
    }
    res.json({ users: result });
  });
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
 
app.listen(5000, () => {
  console.log("Server running on port 5000");
});