const userService    = require('../services/userService');
const passwordService = require('../services/passwordService');

// ─── GET /api/users/me ───────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await userService.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    res.json({ user });
  } catch (err) {
    console.error('[getMe]', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─── PUT /api/users/me ───────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { name, email, department, phone, bio } = req.body;

    // Validation minimale
    if (name && name.trim().length < 2) {
      return res.status(400).json({ message: 'Le nom doit contenir au moins 2 caractères' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Email invalide' });
    }

    const updated = await userService.updateProfile(req.user.id, {
      name, email, department, phone, bio,
    });

    res.json({ message: 'Profil mis à jour avec succès', user: updated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }
    console.error('[updateProfile]', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─── PUT /api/users/me/password ──────────────────────────────────────────────
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validations
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Tous les champs sont requis' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Minimum 8 caractères requis' });
    }

    // Vérifier l'ancien mot de passe
    const currentHash = await userService.getPasswordHash(req.user.id);
    const isMatch = await passwordService.comparePassword(currentPassword, currentHash);

    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
    }

    // Hasher et sauvegarder
    const hashed = await passwordService.hashPassword(newPassword);
    await userService.updatePassword(req.user.id, hashed);

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (err) {
    console.error('[updatePassword]', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─── PUT /api/users/me/avatar ────────────────────────────────────────────────
// multer middleware runs BEFORE this handler (in the route)
const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    // Cloudinary renvoie l'URL dans req.file.path
    const avatarUrl = req.file.path;

    const updated = await userService.updateAvatar(req.user.id, avatarUrl);

    res.json({ message: 'Photo de profil mise à jour', avatarUrl: updated.avatar });
  } catch (err) {
    console.error('[updateAvatar]', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─── DELETE /api/users/me/avatar ──────────────────────────────────────────────
const deleteAvatar = async (req, res) => {
  try {
    // Récupérer l'utilisateur pour avoir l'ancienne URL Cloudinary
    const user = await userService.findById(req.user.id);
    
    // Si l'utilisateur avait un avatar sur Cloudinary, on peut le supprimer
    if (user?.avatar && process.env.CLOUDINARY_URL) {
      try {
        const cloudinary = require('cloudinary').v2;
        // Extraire l'ID public de l'URL Cloudinary
        // URL type: https://res.cloudinary.com/dfm8rnu9i/image/upload/v1234567890/filename.jpg
        const urlParts = user.avatar.split('/');
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.split('.')[0];
        
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
          console.log(`[deleteAvatar] Ancienne image Cloudinary supprimée: ${publicId}`);
        }
      } catch (cloudinaryErr) {
        console.warn('[deleteAvatar] Erreur suppression Cloudinary:', cloudinaryErr.message);
        // On continue même si Cloudinary échoue
      }
    }
    
    // Supprimer le champ avatar de la base de données
    const updated = await userService.deleteAvatar(req.user.id);
    
    res.json({ 
      message: 'Photo de profil supprimée avec succès',
      user: updated 
    });
  } catch (err) {
    console.error('[deleteAvatar]', err);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression' });
  }
};

module.exports = { 
  getMe, 
  updateProfile, 
  updatePassword, 
  updateAvatar,
  deleteAvatar  // ← N'OUBLIEZ PAS D'AJOUTER CETTE LIGNE
};