// dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/authMiddleware');

// Toutes les routes dashboard nécessitent authentification
router.use(auth.verifyToken);

// ==================== US1: PROJETS PAR STATUT ====================
router.get('/projets/statuts', dashboardController.getProjetsParStatut);

// ==================== US2: INDICATEURS PROJET ====================
// ✅ Changé de /kpis à /indicateurs et de getKPIs à getIndicateursProjet
router.get('/indicateurs/:projetId', dashboardController.getIndicateursProjet);

// ==================== US3: CHARGE ÉQUIPE ====================
router.get('/charge-equipe', auth.isChefProjet, dashboardController.getChargeEquipe);

// ==================== US4: TÂCHES RISQUÉES ====================
router.get('/taches-risquees', auth.isChefProjet, dashboardController.getTachesRisquees);

// ==================== US5: VUE GLOBALE ADMIN ====================
router.get('/admin/global', auth.isAdmin, dashboardController.getVueGlobaleAdmin);

module.exports = router;