// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware'); 
// Routes publiques
router.post('/login', authController.login);
router.post('/logout-all', verifyToken, authController.logoutAllDevices);
router.get('/check-token', verifyToken, authController.checkTokenStatus);
router.post('/logout', verifyToken, authController.logout);


// Routes protégées (admin seulement)
router.post('/signUp', verifyToken, isAdmin, authController.createUser);
router.get('/users', verifyToken, isAdmin, authController.getUsers);
router.delete('/users/:id', verifyToken, isAdmin, authController.deleteUser);
router.get("/users/:id", verifyToken, authController.getUserById);
router.put("/users/:id", verifyToken, isAdmin, authController.updateUser);
router.post("/users/:id/restore", verifyToken, isAdmin, authController.restoreUser);
router.post("/change-password", verifyToken, authController.changePassword);


module.exports = router;