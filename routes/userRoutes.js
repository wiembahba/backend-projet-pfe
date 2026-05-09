const express    = require('express');
const router     = express.Router();

const { verifyToken }= require('../middleware/authMiddleware');
const { getMe, updateProfile, updatePassword, updateAvatar, deleteAvatar } = require('../controllers/userController');
const { upload }= require('../services/uploadService');

// Toutes les routes nécessitent un token valide
router.use(verifyToken);

// GET  /api/users/me         → infos du profil connecté
router.get('/me', getMe);

// PUT  /api/users/me         → mettre à jour nom, email, département, téléphone, bio
router.put('/me', updateProfile);

// PUT  /api/users/me/password → changer le mot de passe
router.put('/me/password', updatePassword);

// PUT  /api/users/me/avatar  → uploader une photo de profil (max 2MB, image uniquement)
router.put('/me/avatar', upload.single('avatar'), updateAvatar);

// DELETE /api/users/me/avatar → supprimer la photo de profil
router.delete('/me/avatar', deleteAvatar);  // ← AJOUTEZ CETTE ROUTE

module.exports = router;