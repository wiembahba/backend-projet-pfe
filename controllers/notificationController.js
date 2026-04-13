const db = require("../config/db");
const nodemailer = require("nodemailer");

// Configuration email
const createTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
    return nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
};

// ===================== CRÉER UNE NOTIFICATION =====================
exports.createNotification = async (userId, type, titre, message, lien = null) => {
    try {
        // Vérifier si le type de notification est activé
        const [config] = await db.query(
            "SELECT valeur FROM notification_configs WHERE cle = ?",
            [`${type}_enabled`]
        );
        
        if (config.length > 0 && config[0].valeur !== 'true') {
            console.log(`⚠️ Notification ${type} désactivée`);
            return null;
        }
        
        // Vérifier les préférences utilisateur
        const [pref] = await db.query(
            "SELECT canal, est_actif FROM user_notification_preferences WHERE user_id = ? AND type = ?",
            [userId, type]
        );
        
        const canal = (pref.length > 0 && pref[0].est_actif) ? pref[0].canal : 'interne';
        
        // Insérer la notification
        const [result] = await db.query(
            `INSERT INTO notifications (user_id, type, titre, message, lien) 
             VALUES (?, ?, ?, ?, ?)`,
            [userId, type, titre, message, lien]
        );
        
        // Envoyer par email si configuré
        if (canal.includes('email')) {
            await exports.envoyerEmailNotification(userId, titre, message, lien);
        }
        
        console.log(`📧 Notification créée: ${type} pour user ${userId}`);
        return result.insertId;
        
    } catch (error) {
        console.error("❌ Erreur création notification:", error);
        return null;
    }
};

// ===================== ENVOYER EMAIL =====================
exports.envoyerEmailNotification = async (userId, titre, message, lien) => {
    try {
        const [user] = await db.query(
            "SELECT email, nom_complet FROM users WHERE id = ?",
            [userId]
        );
        
        if (user.length === 0) return;
        
        const transporter = createTransporter();
        if (!transporter) return;
        
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        
        await transporter.sendMail({
            from: `"Maison du Web" <${process.env.EMAIL_USER}>`,
            to: user[0].email,
            subject: titre,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                    <h2>${titre}</h2>
                    <p>Bonjour ${user[0].nom_complet},</p>
                    <p>${message}</p>
                    ${lien ? `<a href="${frontendUrl}${lien}" style="background: #1e3a8a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir les détails</a>` : ''}
                    <hr>
                    <p style="color: #666; font-size: 12px;">Cet email a été envoyé automatiquement.</p>
                </div>
            `
        });
        
        console.log(`📧 Email envoyé à ${user[0].email}`);
        
    } catch (error) {
        console.error("❌ Erreur envoi email:", error);
    }
};

// ===================== RÉCUPÉRER MES NOTIFICATIONS =====================
exports.getMesNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [notifications] = await db.query(`
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 50
        `, [userId]);
        
        const [nonLues] = await db.query(`
            SELECT COUNT(*) as count FROM notifications 
            WHERE user_id = ? AND est_lue = FALSE
        `, [userId]);
        
        res.json({
            success: true,
            notifications: notifications,
            non_lues: nonLues[0].count
        });
        
    } catch (error) {
        console.error("❌ Erreur getMesNotifications:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

// ===================== MARQUER NOTIFICATION COMME LUE =====================
exports.marquerCommeLue = async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user.id;
        
        const [result] = await db.query(
            "UPDATE notifications SET est_lue = TRUE WHERE id = ? AND user_id = ?",
            [notificationId, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Notification non trouvée" });
        }
        
        res.json({ success: true, message: "Notification marquée comme lue" });
        
    } catch (error) {
        console.error("❌ Erreur marquerCommeLue:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

// ===================== MARQUER TOUTES COMME LUES =====================
exports.marquerToutesCommeLues = async (req, res) => {
    try {
        const userId = req.user.id;
        await db.query(
            "UPDATE notifications SET est_lue = TRUE WHERE user_id = ? AND est_lue = FALSE",
            [userId]
        );
        res.json({ success: true, message: "Toutes les notifications marquées comme lues" });
        
    } catch (error) {
        console.error("❌ Erreur marquerToutesCommeLues:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};