const db = require("../config/db");
const notificationController = require("../controllers/notificationController");

exports.verifierDeadlines = async () => {
    try {
        console.log("⏰ Vérification des deadlines...");
        
        // Récupérer le délai configuré
        const [config] = await db.promise().query(
            "SELECT valeur FROM notification_configs WHERE cle = 'delai_rappel_jours'"
        );
        
        const delaiJours = config.length > 0 ? parseInt(config[0].valeur) : 2;
        
        // Récupérer les tâches avec deadline proche
        const [taches] = await db.promise().query(`
            SELECT 
                t.*,
                p.nom_projet,
                u.nom_complet as assigne_nom,
                DATEDIFF(t.date_echeance, CURDATE()) as jours_restants
            FROM taches t
            JOIN projets p ON t.projet_id = p.id
            JOIN users u ON t.assigne_a = u.id
            WHERE t.statut != 'termine'
              AND t.deleted_at IS NULL
              AND DATEDIFF(t.date_echeance, CURDATE()) = ?
        `, [delaiJours]);
        
        for (const tache of taches) {
            await notificationController.createNotification(
                tache.assigne_a,
                'rappel_deadline',
                '⏰ Deadline proche',
                `La tâche "${tache.titre}" dans le projet "${tache.nom_projet}" est due dans ${tache.jours_restants} jours.`,
                `/tasks/${tache.id}`
            );
            console.log(`⏰ Rappel envoyé pour tâche ${tache.id}`);
        }
        
    } catch (error) {
        console.error("❌ Erreur verifierDeadlines:", error);
    }
};