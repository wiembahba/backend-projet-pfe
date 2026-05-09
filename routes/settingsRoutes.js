const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const { getSettings, updateSettings, getAllSettings } = require('../controllers/settingsController');


router.get('/',            verifyToken, isAdmin, getAllSettings);
router.get('/:category',   verifyToken, getSettings);
router.put('/:category',   verifyToken, updateSettings);

module.exports = router;