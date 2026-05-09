const express = require('express');
const router = express.Router();
const equipeController = require('../controllers/equipeController');
const auth = require('../middleware/authMiddleware');

// Toutes les routes nécessitent authentification
router.use(auth.verifyToken);

// ==================== US1: GESTION DES MEMBRES (ADMIN) ====================
router.get('/membres', auth.isAdmin, equipeController.getMembres);
router.put('/membres/:id', auth.isAdmin, equipeController.updateMembre);
router.delete('/membres/:id/desactiver', auth.isAdmin, equipeController.desactiverMembre);
router.post('/membres/:id/reactiver', auth.isAdmin, equipeController.reactiverMembre);

// ==================== US2: DISPONIBILITÉ (CHEF PROJET) ====================
router.get('/disponibilite', auth.isChefProjet, equipeController.getDisponibiliteEmployes);

// ==================== US3: PERFORMANCE (CHEF PROJET) ====================
router.get('/performance', auth.isChefProjet, equipeController.getPerformanceEquipe);

// ==================== US4: CALCUL AUTOMATIQUE CHARGE (CHEF PROJET) ====================
router.get('/charge-auto', auth.isChefProjet, equipeController.calculerChargeAutomatique);
router.get('/charge-auto/:seuil', auth.isChefProjet, equipeController.calculerChargeAutomatique);

// ==================== TABLEAU DE BORD ÉQUIPE ====================
router.get('/tableau-bord', auth.isChefProjet, equipeController.getTableauBordEquipe);

module.exports = router;