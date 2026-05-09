const db = require("../config/db");

// ===================== AJOUTER UN COMMENTAIRE =====================
exports.addCommentaire = async (req, res) => {
    try {
        const { tache_id, commentaire } = req.body;

        if (!tache_id || !commentaire) {
            return res.status(400).json({ message: "ID tâche et commentaire requis" });
        }

        if (commentaire.trim() === '') {
            return res.status(400).json({ message: "Le commentaire ne peut pas être vide" });
        }


        // Vérifier que la tâche existe
        const [tache] = await db.query(

            "SELECT * FROM taches WHERE id = ?",
            [tache_id]
        );


        if (tache.length === 0) {
            return res.status(404).json({ 
                message: "Tâche non trouvée" 
            });
        }

        // Vérifier les permissions (employé assigné ou chef de projet)
        const [projet] = await db.query(
            "SELECT chef_projet_id FROM projets WHERE id = ?",
            [tache[0].projet_id]
        );


        if (req.user.role === 'employe' && tache[0].assigne_a !== req.user.id) {
            return res.status(403).json({ message: "Vous ne pouvez commenter que vos propres tâches" });
        }


        const [result] = await db.query(
            `INSERT INTO commentaires_tache (tache_id, user_id, commentaire) 
             VALUES (?, ?, ?)`,
            [tache_id, req.user.id, commentaire]
        );

        // Récupérer le commentaire avec les infos de l'auteur
        const [newComment] = await db.query(`
            SELECT 
                c.*,
                u.nom_complet as auteur_nom

            FROM commentaires_tache c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: "✅ Commentaire ajouté",
            commentaire: newComment[0]
        });

    } catch (error) {
        console.error("❌ Erreur addCommentaire:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== RÉCUPÉRER LES COMMENTAIRES D'UNE TÂCHE =====================
exports.getCommentairesByTache = async (req, res) => {
    try {
        const tacheId = req.params.tacheId;


        const [commentaires] = await db.query(`
            SELECT 
                c.*,
                u.nom_complet as auteur_nom,
                u.photo_profil

            FROM commentaires_tache c
            JOIN users u ON c.user_id = u.id
            WHERE c.tache_id = ?
            ORDER BY c.created_at DESC
        `, [tacheId]);

        res.json({
            success: true,
            count: commentaires.length,
            commentaires
        });

    } catch (error) {
        console.error("❌ Erreur getCommentairesByTache:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== SUPPRIMER UN COMMENTAIRE =====================
exports.deleteCommentaire = async (req, res) => {
    try {
        const commentaireId = req.params.id;


        // Vérifier que le commentaire existe
        const [commentaire] = await db.query(`

            SELECT c.*, t.projet_id, p.chef_projet_id 
            FROM commentaires_tache c
            JOIN taches t ON c.tache_id = t.id
            JOIN projets p ON t.projet_id = p.id
            WHERE c.id = ?
        `, [commentaireId]);

        if (commentaire.length === 0) return res.status(404).json({ message: "Commentaire non trouvé" });

        const canDelete =
            req.user.role === 'admin' ||
            commentaire[0].user_id === req.user.id ||
            commentaire[0].chef_projet_id === req.user.id;

        if (!canDelete) {
            return res.status(403).json({ message: "Vous n'êtes pas autorisé à supprimer ce commentaire" });
        }


        await db.query(
            "DELETE FROM commentaires_tache WHERE id = ?",
            [commentaireId]
        );


        res.json({ success: true, message: "✅ Commentaire supprimé" });

    } catch (error) {
        console.error("❌ Erreur deleteCommentaire:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};