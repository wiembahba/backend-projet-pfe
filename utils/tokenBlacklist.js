const db = require("../config/db");

class TokenBlacklist {
  // Ajouter un token à la blacklist
  static async add(token, userId, expiresAt) {
    const [result] = await db.promise().query(
      "INSERT INTO token_blacklist (token, user_id, expires_at) VALUES (?, ?, ?)",
      [token, userId, expiresAt]
    );
    return result.insertId;
  }

  // Vérifier si un token est blacklisté
  static async isBlacklisted(token) {
    const [rows] = await db.promise().query(
      "SELECT id FROM token_blacklist WHERE token = ?",
      [token]
    );
    return rows.length > 0;
  }

  // Supprimer tous les tokens d'un utilisateur
  static async removeAllForUser(userId) {
    const [result] = await db.promise().query(
      "DELETE FROM token_blacklist WHERE user_id = ?",
      [userId]
    );
    return result.affectedRows;
  }

  // Nettoyer les tokens expirés
  static async cleanup() {
    const [result] = await db.promise().query(
      "DELETE FROM token_blacklist WHERE expires_at < NOW()"
    );
    return result.affectedRows;
  }
}

module.exports = TokenBlacklist;