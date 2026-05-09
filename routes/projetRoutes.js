const express = require('express');
const router = express.Router();
const projetController = require('../controllers/projetController');
const tacheController = require('../controllers/tacheController');
const commentaireController = require('../controllers/commentaireController');
const sousTacheController = require('../controllers/sousTacheController');
const { verifyToken, isChefProjet } = require('../middleware/authMiddleware');

router.use(verifyToken);

// ==================== PROJETS ====================
// ✅ Static routes AVANT /:id
router.get('/analyse/deadlines',  isChefProjet, projetController.verifierDeadlines);
router.get('/analyse/priorites',  isChefProjet, projetController.analyserPriorites);

router.post('/',    isChefProjet, projetController.createProjet);
router.get('/',                   projetController.getAllProjets);
router.get('/:id',                projetController.getProjetById);
router.put('/:id',  isChefProjet, projetController.updateProjet);
router.delete('/:id', isChefProjet, projetController.deleteProjet);

router.get('/:id/avancement',              projetController.calculerAvancementProjet);
router.post('/:id/recalculer', isChefProjet, projetController.calculerAvancementProjet);
router.post('/:id/prolonger',  isChefProjet, projetController.prolongerDeadline);
router.put('/:id/priorite',    isChefProjet, projetController.updatePriorite);

// ==================== TÂCHES ====================
// ✅ Static routes AVANT /:id
router.get('/taches/toutes',    tacheController.getAllTaches);   // ← أضفنا هذا ✅
router.get('/taches/mes-taches', tacheController.getMesTaches);

router.get('/taches/:id',                    tacheController.getTacheById);
router.get('/taches/:id/analyse',            tacheController.analyserAvancementTache);
router.put('/taches/:id/status',             tacheController.updateTacheStatus);
router.put('/taches/:id/progression',        tacheController.updateTacheProgression);
router.put('/taches/:id',       isChefProjet, tacheController.updateTache);
router.delete('/taches/:id',    isChefProjet, tacheController.deleteTache);

router.get('/:projetId/taches',              tacheController.getTachesByProjet);
router.post('/:projetId/taches', isChefProjet, tacheController.createTache);

// ==================== COMMENTAIRES ====================
router.post('/taches/:tacheId/commentaires',   commentaireController.addCommentaire);
router.get('/taches/:tacheId/commentaires',    commentaireController.getCommentairesByTache);
router.delete('/commentaires/:id',             commentaireController.deleteCommentaire);

// ==================== SOUS-TÂCHES ====================
router.get('/taches/:tacheId/sous-taches',              sousTacheController.getSousTaches);
router.post('/taches/:tacheId/sous-taches',             sousTacheController.createSousTache);
router.put('/taches/:tacheId/sous-taches/:id/toggle',   sousTacheController.toggleSousTache);
router.put('/taches/:tacheId/sous-taches/:id',          sousTacheController.updateSousTache);
router.delete('/taches/:tacheId/sous-taches/:id',       sousTacheController.deleteSousTache);

module.exports = router;