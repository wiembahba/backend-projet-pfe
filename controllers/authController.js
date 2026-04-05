const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("❌ Variables d'environnement EMAIL non définies");
    return null;
  }
  
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// ===================== CREATE USER =====================
exports.createUser = async (req, res) => {
  try {
    const {
      nom_complet, prenom, email, password, role,
      matricule, telephone, ville, adresse, code_postal,
      wilaya, poste, departement, date_embauche, date_naissance,
      lieu_naissance, genre, situation_familiale, nombre_enfants
    } = req.body;

    const missingFields = [];
    if (!email) missingFields.push("email");
    if (!password) missingFields.push("password");
    if (!nom_complet && !prenom) missingFields.push("nom_complet ou prenom");

    if (missingFields.length > 0) {
      return res.status(400).json({ message: "Champs obligatoires manquants", missingFields });
    }

    const finalNomComplet = nom_complet || `${prenom || ''}`.trim();

    const [existingUsers] = await db.promise().query(
      "SELECT id FROM users WHERE email = ?", [email]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "Email déjà utilisé" });
    }

    if (matricule) {
      const [existingMatricule] = await db.promise().query(
        "SELECT id FROM users WHERE matricule = ?", [matricule]
      );
      if (existingMatricule.length > 0) {
        return res.status(409).json({ message: "Matricule déjà utilisé" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users 
      (nom_complet, prenom, email, password, role, 
       matricule, telephone, ville, adresse, code_postal, wilaya,
       poste, departement, date_embauche, date_naissance, lieu_naissance,
       genre, situation_familiale, nombre_enfants, created_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)
    `;

    const [result] = await db.promise().query(sql, [
      finalNomComplet, prenom || null, email, hashedPassword,
      role || "employe", matricule || null, telephone || null,
      ville || null, adresse || null, code_postal || null, wilaya || null,
      poste || null, departement || null, date_embauche || null,
      date_naissance || null, lieu_naissance || null, genre || null,
      situation_familiale || null, nombre_enfants || 0
    ]);

    const newUser = {
      id: result.insertId,
      nom_complet: finalNomComplet,
      email,
      role: role || "employe",
      matricule, telephone, departement, poste
    };

    exports.sendWelcomeEmail(email, finalNomComplet, password, role)
      .then(sent => {
        if (sent) console.log(`✅ Email envoyé à ${email}`);
        else console.log(`⚠️ Échec envoi email à ${email}`);
      })
      .catch(err => console.error("Erreur envoi email:", err));

    res.status(201).json({
      success: true,
      message: "Utilisateur créé avec succès",
      user: newUser
    });

  } catch (error) {
    console.error("❌ Erreur createUser:", error);
    res.status(500).json({ 
      message: "Erreur serveur lors de la création",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ===================== SEND WELCOME EMAIL =====================
exports.sendWelcomeEmail = async (toEmail, nom, password, role) => {
  try {
    const transporter = createTransporter();
    if (!transporter) return false;

    const mailOptions = {
      from: `"Maison du Web" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "🎉 Bienvenue sur la plateforme Maison du Web",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
            .header { background: #5b6cff; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
            .content { padding: 20px; }
            .credentials { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Bienvenue chez Maison du Web</h1></div>
            <div class="content">
              <h2>Bonjour ${nom},</h2>
              <p>Nous sommes ravis de vous accueillir dans notre équipe !</p>
              <div class="credentials">
                <h3>🔐 Vos identifiants de connexion</h3>
                <p><strong>Email :</strong> ${toEmail}</p>
                <p><strong>Mot de passe temporaire :</strong> ${password}</p>
                <p><strong>Rôle :</strong> ${role === 'chef_projet' ? 'Chef de projet' : 'Employé'}</p>
                <p><em>⚠️ Nous vous recommandons de changer votre mot de passe après la première connexion.</em></p>
              </div>
              <p><strong>Prochaines étapes :</strong></p>
              <ul>
                <li>Connectez-vous avec vos identifiants</li>
                <li>Complétez votre profil</li>
                <li>Découvrez les fonctionnalités de la plateforme</li>
              </ul>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Maison du Web. Tous droits réservés.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Bonjour ${nom},\n\nEmail : ${toEmail}\nMot de passe : ${password}\nRôle : ${role}`
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Erreur détaillée envoi email:", error);
    return false;
  }
};

// ===================== LOGIN =====================
exports.login = async (req, res) => {
  try {
    console.log('=== LOGIN ===');
    console.log('JWT_SECRET dans login:', process.env.JWT_SECRET ? 'OUI ✅' : 'NON ❌');
    
    const { email, password } = req.body;

    console.log('📧 Email reçu:', email);
    console.log('🔑 Password reçu:', password);
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe obligatoires" });
    }

    const [users] = await db.promise().query(
      "SELECT * FROM users WHERE email = ? AND status = 1", [email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: "Email ou mot de passe incorrect" });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    await db.promise().query(
      "UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, nom_complet: user.nom_complet }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        nom_complet: user.nom_complet,
        email: user.email,
        role: user.role,
        matricule: user.matricule,
        departement: user.departement,
        poste: user.poste
      }
    });

  } catch (error) {
    console.error("❌ Erreur login:", error);
    res.status(500).json({ message: "Erreur serveur lors de la connexion" });
  }
};

// ===================== LOGOUT =====================
exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ success: false, message: "Token manquant ou format invalide" });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.exp) {
      return res.status(400).json({ success: false, message: "Token invalide" });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Utilisateur non authentifié" });
    }

    const [existing] = await db.promise().query(
      "SELECT id FROM token_blacklist WHERE token = ?", [token]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Token déjà révoqué" });
    }

    const expiresAt = new Date(decoded.exp * 1000);
    
    await db.promise().query(
      "INSERT INTO token_blacklist (token, user_id, expires_at) VALUES (?, ?, ?)",
      [token, req.user.id, expiresAt]
    );

    cleanupExpiredTokens();
    res.json({ success: true, message: "Déconnexion réussie" });

  } catch (error) {
    console.error("❌ Erreur logout:", error);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la déconnexion" });
  }
};

// ===================== LOGOUT FROM ALL DEVICES =====================
exports.logoutAllDevices = async (req, res) => {
  try {
    const userId = req.user.id;
    const [result] = await db.promise().query(
      "DELETE FROM token_blacklist WHERE user_id = ? AND expires_at > NOW()", [userId]
    );
    res.json({ 
      success: true,
      message: `Déconnecté de ${result.affectedRows} appareil(s)`,
      devicesDisconnected: result.affectedRows
    });
  } catch (error) {
    console.error("❌ Erreur logoutAllDevices:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// ===================== CHECK TOKEN STATUS =====================
exports.checkTokenStatus = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const [blacklisted] = await db.promise().query(
      "SELECT id FROM token_blacklist WHERE token = ?", [token]
    );
    if (blacklisted.length > 0) {
      return res.status(401).json({ success: false, message: "Token révoqué", valid: false });
    }
    res.json({ success: true, message: "Token valide", valid: true, user: req.user });
  } catch (error) {
    console.error("❌ Erreur checkTokenStatus:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// ===================== CLEANUP =====================
async function cleanupExpiredTokens() {
  try {
    const [result] = await db.promise().query(
      "DELETE FROM token_blacklist WHERE expires_at < NOW()"
    );
    if (result.affectedRows > 0) {
      console.log(`🧹 Nettoyage: ${result.affectedRows} tokens expirés supprimés`);
    }
  } catch (error) {
    console.error("Erreur nettoyage tokens:", error);
  }
}

setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

// ===================== GET ALL USERS =====================
exports.getUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Accès non autorisé" });
    }
    const [users] = await db.promise().query(`
      SELECT 
        id, nom_complet, email, role, status,
        matricule, telephone, departement, poste, ville, wilaya,
        DATE_FORMAT(date_embauche, '%Y-%m-%d') as date_embauche,
        DATE_FORMAT(last_login, '%Y-%m-%d %H:%i') as derniere_connexion,
        DATE_FORMAT(created_at, '%Y-%m-%d') as date_creation
      FROM users 
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    console.error("❌ Erreur getUsers:", error);
    res.status(500).json({ message: "Erreur serveur lors du chargement des utilisateurs" });
  }
};

// ===================== GET USER BY ID =====================
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const [users] = await db.promise().query(`
      SELECT 
        id, nom_complet, prenom, email, role,
        matricule, telephone, adresse, code_postal, ville, wilaya,
        poste, departement,
        DATE_FORMAT(date_embauche, '%Y-%m-%d') as date_embauche,
        DATE_FORMAT(date_naissance, '%Y-%m-%d') as date_naissance,
        lieu_naissance, genre, situation_familiale, nombre_enfants,
        DATE_FORMAT(created_at, '%Y-%m-%d') as date_creation,
        DATE_FORMAT(last_login, '%Y-%m-%d %H:%i') as derniere_connexion
      FROM users 
      WHERE id = ? AND deleted_at IS NULL
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.json({ success: true, user: users[0] });
  } catch (error) {
    console.error("❌ Erreur getUserById:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ===================== UPDATE USER =====================
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;
    
    delete updates.id;
    delete updates.created_at;

    // ✅ Hasher le mot de passe s'il est fourni
    if (updates.password && updates.password.trim() !== '') {
      updates.password = await bcrypt.hash(updates.password, 10);
    } else {
      delete updates.password;
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Aucune donnée à mettre à jour" });
    }

    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), userId];

    const [result] = await db.promise().query(
      `UPDATE users SET ${fields}, updated_at = NOW() WHERE id = ?`, values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.json({ success: true, message: "Utilisateur mis à jour avec succès" });

  } catch (error) {
    console.error("❌ Erreur updateUser:", error);
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour" });
  }
};

// ===================== DELETE USER =====================
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const [user] = await db.promise().query(
      "SELECT id, role FROM users WHERE id = ?", [userId]
    );
    if (user.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    if (req.user.id === parseInt(userId)) {
      return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte" });
    }
    const [result] = await db.promise().query(
      "UPDATE users SET deleted_at = NOW(), status = 0 WHERE id = ?", [userId]
    );
    if (result.affectedRows === 0) {
      return res.status(500).json({ message: "Échec de la suppression" });
    }
    res.json({ success: true, message: "Utilisateur supprimé avec succès" });
  } catch (error) {
    console.error("❌ Erreur deleteUser:", error);
    res.status(500).json({ message: "Erreur serveur lors de la suppression" });
  }
};

// ===================== RESTORE USER =====================
exports.restoreUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const [result] = await db.promise().query(
      "UPDATE users SET deleted_at = NULL, status = 1 WHERE id = ?", [userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.json({ success: true, message: "Utilisateur restauré avec succès" });
  } catch (error) {
    console.error("❌ Erreur restoreUser:", error);
    res.status(500).json({ message: "Erreur serveur lors de la restauration" });
  }
};

// ===================== CHANGE PASSWORD =====================
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Ancien et nouveau mot de passe requis" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Le nouveau mot de passe doit contenir au moins 6 caractères" });
    }

    const [users] = await db.promise().query(
      "SELECT password FROM users WHERE id = ?", [userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const validPassword = await bcrypt.compare(oldPassword, users[0].password);
    if (!validPassword) {
      return res.status(401).json({ message: "Ancien mot de passe incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.promise().query(
      "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?",
      [hashedNewPassword, userId]
    );

    res.json({ success: true, message: "Mot de passe modifié avec succès" });

  } catch (error) {
    console.error("❌ Erreur changePassword:", error);
    res.status(500).json({ message: "Erreur serveur lors du changement de mot de passe" });
  }
};