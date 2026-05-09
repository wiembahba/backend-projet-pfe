const User = require('../models/User');
const db = require('../config/db');
/**
 * Récupérer un utilisateur par son ID (sans mot de passe)
 */
const findById = async (userId) => {
  return User.findById(userId).select('-password');
};

/**
 * Mettre à jour les infos personnelles
 */
const updateProfile = async (userId, data) => {
  const allowed = ['name', 'email', 'department', 'phone', 'bio'];
  const updates = {};

  allowed.forEach((field) => {
    if (data[field] !== undefined) updates[field] = data[field];
  });

  return User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-password');
};

/**
 * Mettre à jour le mot de passe hashé
 */
const updatePassword = async (userId, hashedPassword) => {
  return User.findByIdAndUpdate(
    userId,
    { $set: { password: hashedPassword } },
    { new: true }
  ).select('-password');
};

/**
 * Mettre à jour l'URL de l'avatar
 */
const updateAvatar = async (userId, avatarUrl) => {
  return User.findByIdAndUpdate(
    userId,
    { $set: { avatar: avatarUrl } },
    { new: true }
  ).select('-password');
};

/**
 * Supprimer l'avatar
 */
const deleteAvatar = async (userId) => {
  return User.findByIdAndUpdate(
    userId,
    { $unset: { avatar: "" } },  // Supprime complètement le champ avatar
    { new: true }
  ).select('-password');
};

/**
 * Récupérer le mot de passe hashé pour vérification
 */
const getPasswordHash = async (userId) => {
  const user = await User.findById(userId).select('password');
  return user?.password;
};

module.exports = {
  findById,
  updateProfile,
  updatePassword,
  updateAvatar,
  deleteAvatar,  // ← AJOUTEZ CETTE LIGNE
  getPasswordHash,
};