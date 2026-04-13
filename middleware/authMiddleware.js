const jwt = require("jsonwebtoken");
const db = require("../config/db");
console.log('=== CHARGEMENT MIDDLEWARE AUTH ===');
console.log('JWT_SECRET dans middleware:', process.env.JWT_SECRET ? 'OUI ✅' : 'NON ❌');
const JWT_SECRET = process.env.JWT_SECRET || 'gestion_projet_pfe_secret_2026';
console.log('🔑 JWT_SECRET utilisé:', JWT_SECRET.substring(0, 10) + '...');

// Vérifier le token et s'il n'est pas blacklisté
const verifyToken = async (req, res, next) => {
  console.log('\n=== VÉRIFICATION TOKEN ===');
  console.log('1. Headers reçus:', req.headers.authorization ? 'OUI' : 'NON');
  
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    console.log('❌ Pas de header Authorization');
    return res.status(403).json({ message: "Token manquant" });
  }

  console.log('2. Header brut:', authHeader.substring(0, 50) + '...');

 const parts = authHeader.split(' ');
  console.log('3. Parties du header:', parts.length);
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    console.log('❌ Format incorrect - attendu: Bearer [token]');
    return res.status(401).json({ message: "Format token invalide" });
  }

  const token = parts[1];
  console.log('4. Token extrait (premiers 30 chars):', token.substring(0, 30) + '...');
  
  // Vérifier que le token a 3 parties (header.payload.signature)
  const tokenParts = token.split('.');
  console.log('5. Parties du token JWT:', tokenParts.length);
  
  if (tokenParts.length !== 3) {
    console.log('❌ Token JWT invalide - pas 3 parties');
    return res.status(401).json({ message: "Token invalide" });
  }

  try {
    console.log('6. JWT_SECRET utilisé pour vérification:', JWT_SECRET.substring(0, 10) + '...');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('7. ✅ Token décodé avec succès!');
    console.log('8. Données décodées:', decoded);
    
    // Vérifier blacklist
    if (db) {
      const [blacklisted] = await db.query(
        "SELECT id FROM token_blacklist WHERE token = ?",
        [token]
      );
      
      if (blacklisted.length > 0) {
        console.log('9. ❌ Token blacklisté');
        return res.status(401).json({ message: "Token révoqué" });
      }
      console.log('9. ✅ Token non blacklisté');
    }
    
    req.user = decoded;
    console.log('10. ✅ Middleware verifyToken terminé avec succès');
    next();
    
  } catch (error) {
    console.log('❌ ERREUR JWT VERIFICATION:');
    console.log('   - Nom:', error.name);
    console.log('   - Message:', error.message);
    console.log('   - Stack:', error.stack);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expiré" });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Token invalide" });
    }
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Vérifier si l'utilisateur est admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: "Accès refusé. Réservé à l'administrateur" 
    });
  }
  next();
};

// Vérifier si l'utilisateur est chef de projet
const isChefProjet = (req, res, next) => {
  if (req.user.role !== 'chef_projet' && req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: "Accès refusé. Réservé au chef de projet" 
    });
  }
  next();
};

// Vérifier si l'utilisateur a accès à ses propres données ou est admin
const isOwnerOrAdmin = (req, res, next) => {
  const userId = parseInt(req.params.id);
  
  if (req.user.role === 'admin' || req.user.id === userId) {
    return next();
  }
  
  return res.status(403).json({ 
    message: "Accès refusé. Vous ne pouvez accéder qu'à vos propres données." 
  });
};

module.exports = {
  verifyToken,
  isAdmin,
  isChefProjet,
  isOwnerOrAdmin
};