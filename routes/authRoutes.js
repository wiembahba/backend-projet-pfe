const express = require('express');
const router = express.Router();

const {
  login,
  createUser,
  logout,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  restoreUser,
  changePassword,
  checkTokenStatus,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

const { verifyToken } = require('../middleware/authMiddleware');

// 🔐 Auth public
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// 👤 Users (protected)
router.post('/users', verifyToken, createUser);
router.get('/users', verifyToken, getUsers);
router.get('/users/:id', verifyToken, getUserById);
router.put('/users/:id', verifyToken, updateUser);
router.delete('/users/:id', verifyToken, deleteUser);
router.put('/users/:id/restore', verifyToken, restoreUser);

// 🔑 Password & Token
router.post('/change-password', verifyToken, changePassword);
router.post('/logout', verifyToken, logout);
router.get('/token-status', verifyToken, checkTokenStatus);


module.exports = router;