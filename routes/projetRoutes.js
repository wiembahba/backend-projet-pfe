const express = require('express');
const router = express.Router();
const projetController = require('../controllers/projetController');
const tacheController = require('../controllers/tacheController');
const commentaireController = require('../controllers/commentaireController');
const auth = require('../middleware/authMiddleware');

// ⚡ TOUTES les routes en dessous nécessitent un token valide
router.use(auth.verifyToken);

// ==================== ROUTES PROJETS ====================
router.post('/', auth.isChefProjet, projetController.createProjet);
router.get('/', projetController.getAllProjets);
router.get('/:id', projetController.getProjetById);
router.put('/:id', auth.isChefProjet, projetController.updateProjet);
router.delete('/:id', auth.isChefProjet, projetController.deleteProjet);

// Gestion de l'avancement
router.get('/:id/avancement', projetController.calculerAvancementProjet);
router.post('/:id/recalculer', auth.isChefProjet, projetController.calculerAvancementProjet);

// Gestion des deadlines
router.get('/analyse/deadlines', auth.isChefProjet, projetController.verifierDeadlines);
router.post('/:id/prolonger', auth.isChefProjet, projetController.prolongerDeadline);

// Gestion des priorités
router.get('/analyse/priorites', auth.isChefProjet, projetController.analyserPriorites);
router.put('/:id/priorite', auth.isChefProjet, projetController.updatePriorite);

// ==================== ROUTES TÂCHES ====================
// ✅ BON ORDRE - Mettre les routes spécifiques AVANT les routes génériques
router.get('/taches/mes-taches', tacheController.getMesTaches);      // ← Spécifique d'abord
router.get('/taches/:id', tacheController.getTacheById);             // ← Générique après
router.get('/taches/:id/analyse', tacheController.analyserAvancementTache);
router.put('/taches/:id/status', tacheController.updateTacheStatus);
router.put('/taches/:id/progression', tacheController.updateTacheProgression);
router.delete('/taches/:id', auth.isChefProjet, tacheController.deleteTache);
router.put('/taches/:id', auth.isChefProjet, tacheController.updateTache);
router.post('/taches/:tacheId/commentaires', commentaireController.addCommentaire);
router.get('/taches/:tacheId/commentaires', commentaireController.getCommentairesByTache);
router.get('/:projetId/taches', tacheController.getTachesByProjet);
router.post('/:projetId/taches', auth.isChefProjet, tacheController.createTache);
router.delete('/commentaires/:id', commentaireController.deleteCommentaire);
// ==================== ROUTES COMMENTAIRES ====================
router.post('/taches/:tacheId/commentaires', commentaireController.addCommentaire);
router.get('/taches/:tacheId/commentaires', commentaireController.getCommentairesByTache);
router.delete('/commentaires/:id', commentaireController.deleteCommentaire);

module.exports = router;