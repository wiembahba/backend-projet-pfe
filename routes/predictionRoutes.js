const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');
const auth = require('../middleware/authMiddleware');

// Toutes les routes de prédiction nécessitent authentification
router.use(auth.verifyToken);

// ==================== US1: ANALYSE TAUX D'AVANCEMENT ====================
router.get('/projet/:projetId/avancement', auth.isChefProjet, predictionController.analyserTauxAvancement);

// ==================== US2: ANALYSE TEMPS RESTANT ====================
router.get('/projet/:projetId/temps-restant', auth.isChefProjet, predictionController.analyserTempsRestant);

// ==================== US3: ANALYSE CHARGE DE TRAVAIL ====================
router.get('/projet/:projetId/charge', auth.isChefProjet, predictionController.analyserChargeTravail);

// ==================== US4: CLASSIFICATION DES TÂCHES PAR RISQUE ====================
router.get('/projet/:projetId/taches-risquees', auth.isChefProjet, predictionController.classifierTachesParRisque);

// ==================== ANALYSE GLOBALE ====================
router.get('/projet/:projetId/analyse-globale', auth.isChefProjet, predictionController.analyseGlobaleRisques);

module.exports = router;