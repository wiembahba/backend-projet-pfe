const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const configController = require('../controllers/configController');
const auth = require('../middleware/authMiddleware');

// Toutes les routes nécessitent un token
router.use(auth.verifyToken);

// Notifications
router.get('/mes-notifications', notificationController.getMesNotifications);
router.put('/:id/lire', notificationController.marquerCommeLue);
router.put('/lire-toutes', notificationController.marquerToutesCommeLues);

// Configurations (admin seulement)
router.get('/configurations', configController.getConfigurations);
router.put('/configurations', configController.updateConfigurations);

// Préférences utilisateur
router.get('/mes-preferences', configController.getMesPreferences);
router.put('/mes-preferences', configController.updateMesPreferences);

module.exports = router;