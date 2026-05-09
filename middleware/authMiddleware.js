const jwt = require("jsonwebtoken");
const db  = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "gestion_projet_pfe_secret_2026";

// ─── Vérifier le token JWT + blacklist ───────────────────────────────────────
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).json({ message: "Token manquant" });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ message: "Format token invalide" });
  }

  const token = parts[1];

  if (token.split(".").length !== 3) {
    return res.status(401).json({ message: "Token invalide" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Vérifier blacklist
    if (db) {
      const [blacklisted] = await db.query(
        "SELECT id FROM token_blacklist WHERE token = ?",
        [token]
      );

      if (blacklisted.length > 0) {
        return res.status(401).json({ message: "Token révoqué" });
      }
    }

    req.user = decoded;
    next();

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expiré" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token invalide" });
    }
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── Admin uniquement ────────────────────────────────────────────────────────
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Accès refusé. Réservé à l'administrateur",
    });
  }
  next();
};

// ─── Chef de projet ou admin ─────────────────────────────────────────────────
const isChefProjet = (req, res, next) => {
  if (req.user.role !== "chef_projet" && req.user.role !== "admin") {
    return res.status(403).json({
      message: "Accès refusé. Réservé au chef de projet",
    });
  }
  next();
};

// ─── Propriétaire de la ressource ou admin ───────────────────────────────────
const isOwnerOrAdmin = (req, res, next) => {
  const userId = parseInt(req.params.id);

  if (req.user.role === "admin" || req.user.id === userId) {
    return next();
  }

  return res.status(403).json({
    message: "Accès refusé. Vous ne pouvez accéder qu'à vos propres données.",
  });
};

module.exports = {
  verifyToken,
  isAdmin,
  isChefProjet,
  isOwnerOrAdmin,
};