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

<<<<<<< HEAD:controllers/commentaireController
        const [tache] = await db.promise().query(
=======
        // Vérifier que la tâche existe
        const [tache] = await db.query(
>>>>>>> 0f3c680 (correction):controllers/commentaireController.js
            "SELECT * FROM taches WHERE id = ?",
            [tache_id]
        );

<<<<<<< HEAD:controllers/commentaireController
        if (tache.length === 0) return res.status(404).json({ message: "Tâche non trouvée" });
=======
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
>>>>>>> 0f3c680 (correction):controllers/commentaireController.js

        if (req.user.role === 'employe' && tache[0].assigne_a !== req.user.id) {
            return res.status(403).json({ message: "Vous ne pouvez commenter que vos propres tâches" });
        }

<<<<<<< HEAD:controllers/commentaireController
        const [result] = await db.promise().query(
            `INSERT INTO commentaires_tache (tache_id, user_id, commentaire) VALUES (?, ?, ?)`,
            [tache_id, req.user.id, commentaire]
        );

        const [newComment] = await db.promise().query(`
            SELECT c.*, u.nom_complet as auteur_nom
=======
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
>>>>>>> 0f3c680 (correction):controllers/commentaireController.js
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

<<<<<<< HEAD:controllers/commentaireController
        const [commentaires] = await db.promise().query(`
            SELECT c.*, u.nom_complet as auteur_nom, u.photo_profil
=======
        const [commentaires] = await db.query(`
            SELECT 
                c.*,
                u.nom_complet as auteur_nom,
                u.photo_profil
>>>>>>> 0f3c680 (correction):controllers/commentaireController.js
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

<<<<<<< HEAD:controllers/commentaireController
        const [commentaire] = await db.promise().query(`
=======
        // Vérifier que le commentaire existe
        const [commentaire] = await db.query(`
>>>>>>> 0f3c680 (correction):controllers/commentaireController.js
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

<<<<<<< HEAD:controllers/commentaireController
        await db.promise().query("DELETE FROM commentaires_tache WHERE id = ?", [commentaireId]);
=======
        await db.query(
            "DELETE FROM commentaires_tache WHERE id = ?",
            [commentaireId]
        );
>>>>>>> 0f3c680 (correction):controllers/commentaireController.js

        res.json({ success: true, message: "✅ Commentaire supprimé" });

    } catch (error) {
        console.error("❌ Erreur deleteCommentaire:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};