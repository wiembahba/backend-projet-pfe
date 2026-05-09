const db = require("../config/db");
const notificationController = require("../controllers/notificationController");

const calculerRisque = (progression, joursRestants) => {
    if (progression >= 100) return 0;
    if (joursRestants <= 0) return 100;
    let risque = ((100 - progression) * 100) / Math.max(joursRestants, 1);
    return Math.min(100, Math.max(0, Math.round(risque)));
};

exports.verifierRisques = async () => {
    try {
        console.log("⚠️ Vérification des risques...");
        
        const [config] = await db.promise().query(
            "SELECT valeur FROM notification_configs WHERE cle = 'seuil_risque'"
        );
        
        const seuilRisque = config.length > 0 ? parseInt(config[0].valeur) : 50;
        
        const [taches] = await db.promise().query(`
            SELECT 
                t.*,
                p.nom_projet,
                p.chef_projet_id,
                DATEDIFF(t.date_echeance, CURDATE()) as jours_restants
            FROM taches t
            JOIN projets p ON t.projet_id = p.id
            WHERE t.statut != 'termine'
              AND t.deleted_at IS NULL
        `);
        
        for (const tache of taches) {
            const risque = calculerRisque(tache.progression, tache.jours_restants);
            
            if (risque >= seuilRisque) {
                await notificationController.createNotification(
                    tache.chef_projet_id,
                    'alerte_risque',
                    '⚠️ Alerte de risque élevé',
                    `La tâche "${tache.titre}" a un risque de retard de ${risque}% ! Progression actuelle: ${tache.progression}%, Jours restants: ${tache.jours_restants}.`,
                    `/tasks/${tache.id}`
                );
                console.log(`⚠️ Alerte risque envoyée pour tâche ${tache.id} (risque: ${risque}%)`);
            }
        }
        
    } catch (error) {
        console.error("❌ Erreur verifierRisques:", error);
    }
};