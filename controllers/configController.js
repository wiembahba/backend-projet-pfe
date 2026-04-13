const db = require("../config/db");

// ===================== RÉCUPÉRER LES CONFIGURATIONS =====================
exports.getConfigurations = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: "Accès refusé. Droits administrateur requis." 
            });
        }
        
        const [configs] = await db.query(`
            SELECT cle, valeur, description FROM notification_configs
        `);
        
        const configObject = {};
        configs.forEach(c => { configObject[c.cle] = c.valeur; });
        
        res.json({ success: true, configurations: configObject });
        
    } catch (error) {
        console.error("❌ Erreur getConfigurations:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

// ===================== METTRE À JOUR LES CONFIGURATIONS =====================
exports.updateConfigurations = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: "Accès refusé. Droits administrateur requis." 
            });
        }
        
        const { assignation_enabled, rappel_deadline_enabled, alerte_risque_enabled, 
                delai_rappel_jours, seuil_risque, canal_notification } = req.body;
        
        // Validation
        if (delai_rappel_jours !== undefined && parseInt(delai_rappel_jours) < 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Le délai de rappel ne peut pas être négatif" 
            });
        }
        
        if (seuil_risque !== undefined && (parseInt(seuil_risque) < 0 || parseInt(seuil_risque) > 100)) {
            return res.status(400).json({ 
                success: false, 
                message: "Le seuil de risque doit être entre 0 et 100" 
            });
        }
        
        // Mettre à jour
        const updates = [
            { cle: 'assignation_enabled', valeur: assignation_enabled },
            { cle: 'rappel_deadline_enabled', valeur: rappel_deadline_enabled },
            { cle: 'alerte_risque_enabled', valeur: alerte_risque_enabled },
            { cle: 'delai_rappel_jours', valeur: delai_rappel_jours },
            { cle: 'seuil_risque', valeur: seuil_risque },
            { cle: 'canal_notification', valeur: canal_notification }
        ];
        
        for (const update of updates) {
            if (update.valeur !== undefined) {
                await db.query(
                    `UPDATE notification_configs 
                     SET valeur = ?, updated_at = NOW(), updated_by = ? 
                     WHERE cle = ?`,
                    [String(update.valeur), req.user.id, update.cle]
                );
            }
        }
        
        res.json({ 
            success: true, 
            message: "✅ Configurations mises à jour avec succès" 
        });
        
    } catch (error) {
        console.error("❌ Erreur updateConfigurations:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

// ===================== RÉCUPÉRER MES PRÉFÉRENCES =====================
exports.getMesPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [preferences] = await db.query(`
            SELECT type, canal, est_actif FROM user_notification_preferences 
            WHERE user_id = ?
        `, [userId]);
        
        res.json({ success: true, preferences });
        
    } catch (error) {
        console.error("❌ Erreur getMesPreferences:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

// ===================== METTRE À JOUR MES PRÉFÉRENCES =====================
exports.updateMesPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, canal, est_actif } = req.body;
        
        await db.query(
            `INSERT INTO user_notification_preferences (user_id, type, canal, est_actif) 
             VALUES (?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE canal = ?, est_actif = ?`,
            [userId, type, canal, est_actif, canal, est_actif]
        );
        
        res.json({ success: true, message: "✅ Préférences mises à jour" });
        
    } catch (error) {
        console.error("❌ Erreur updateMesPreferences:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};