const db = require("../config/db");
const notificationController = require('./notificationController');

// ===================== GET ALL TÂCHES (ADMIN) =====================
exports.getAllTaches = async (req, res) => {
    try {
        let sql = `
            SELECT 
                t.*,
                p.nom_projet,
                p.chef_projet_id,
                u.nom_complet as assigne_nom,
                u2.nom_complet as chef_nom,
                DATEDIFF(t.date_echeance, CURDATE()) as jours_restants,
                CASE 
                    WHEN t.statut != 'termine' AND t.date_echeance < CURDATE() THEN 'en_retard'
                    WHEN t.statut != 'termine' AND DATEDIFF(t.date_echeance, CURDATE()) <= 2 THEN 'deadline_proche'
                    ELSE 'normal'
                END as alerte
            FROM taches t
            JOIN projets p ON t.projet_id = p.id
            LEFT JOIN users u ON t.assigne_a = u.id
            LEFT JOIN users u2 ON p.chef_projet_id = u2.id
            WHERE p.deleted_at IS NULL AND t.deleted_at IS NULL
        `;

        // Filtrer selon le rôle
        if (req.user.role === 'employe') {
            sql += ` AND t.assigne_a = ${req.user.id}`;
        } else if (req.user.role === 'chef_projet') {
            sql += ` AND p.chef_projet_id = ${req.user.id}`;
        }
        // admin → voit tout

        sql += ` ORDER BY
            CASE 
                WHEN t.statut != 'termine' AND t.date_echeance < CURDATE() THEN 1
                WHEN t.statut != 'termine' AND DATEDIFF(t.date_echeance, CURDATE()) <= 2 THEN 2
                ELSE 3
            END,
            CASE t.priorite WHEN 'haute' THEN 1 WHEN 'moyenne' THEN 2 WHEN 'faible' THEN 3 END,
            t.created_at DESC`;

        const [taches] = await db.query(sql);

        res.json({
            success: true,
            stats: {
                total: taches.length,
                a_faire: taches.filter(t => t.statut === 'a_faire').length,
                en_cours: taches.filter(t => t.statut === 'en_cours').length,
                terminees: taches.filter(t => t.statut === 'termine').length,
                en_retard: taches.filter(t => t.alerte === 'en_retard').length,
                deadline_proche: taches.filter(t => t.alerte === 'deadline_proche').length
            },
            taches
        });

    } catch (error) {
        console.error("❌ Erreur getAllTaches:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

// ===================== CRÉER UNE TÂCHE =====================
exports.createTache = async (req, res) => {
    try {
        const { projet_id, titre, description, assigne_a, priorite, date_debut, date_echeance } = req.body;

        if (!projet_id) return res.status(400).json({ message: "L'ID du projet est obligatoire" });
        if (!titre) return res.status(400).json({ message: "Le titre de la tâche est obligatoire" });
        if (!date_echeance) return res.status(400).json({ message: "La date d'échéance est obligatoire" });

        const [projet] = await db.query(
            "SELECT * FROM projets WHERE id = ? AND deleted_at IS NULL",
            [projet_id]
        );

        if (projet.length === 0) return res.status(404).json({ message: "Projet non trouvé" });

        if (req.user.role !== 'admin' && projet[0].chef_projet_id !== req.user.id) {
            return res.status(403).json({ message: "Vous n'êtes pas autorisé à créer des tâches dans ce projet" });
        }

        const [result] = await db.query(`
            INSERT INTO taches (projet_id, titre, description, assigne_a, priorite, date_debut, date_echeance, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [projet_id, titre, description || null, assigne_a || null, priorite || 'moyenne', date_debut || null, date_echeance, req.user.id]);

        const nouvelleTacheId = result.insertId;

        if (assigne_a && assigne_a !== req.user.id) {
            const [createur] = await db.query("SELECT nom_complet FROM users WHERE id = ?", [req.user.id]);
            const [projetInfo] = await db.query("SELECT nom_projet FROM projets WHERE id = ?", [projet_id]);
            await notificationController.createNotification(
                assigne_a, 'tache_assignee', '📋 Nouvelle tâche assignée',
                `${createur[0]?.nom_complet} vous a assigné : "${titre}" dans "${projetInfo[0]?.nom_projet}".`,
                `/tasks?highlight=${nouvelleTacheId}`
            );
        }

        if (projet[0]?.chef_projet_id && projet[0]?.chef_projet_id !== req.user.id) {
            await notificationController.createNotification(
                projet[0].chef_projet_id, 'projet_update', '➕ Nouvelle tâche créée',
                `Une nouvelle tâche "${titre}" a été ajoutée dans "${projet[0].nom_projet}".`,
                `/projects/${projet_id}`
            );
        }

        res.status(201).json({
            success: true,
            message: "✅ Tâche créée avec succès",
            tache: { id: nouvelleTacheId, titre, projet_id }
        });

    } catch (error) {
        console.error("❌ Erreur createTache:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== MODIFIER UNE TÂCHE =====================
exports.updateTache = async (req, res) => {
    try {
        const tacheId = req.params.id;
        const { titre, description, assigne_a, priorite, date_debut, date_echeance } = req.body;

        const [tache] = await db.query(
            "SELECT t.*, p.chef_projet_id, p.nom_projet FROM taches t JOIN projets p ON t.projet_id = p.id WHERE t.id = ?",
            [tacheId]
        );

        if (tache.length === 0) return res.status(404).json({ message: "Tâche non trouvée" });

        if (req.user.role !== 'admin' && tache[0].chef_projet_id !== req.user.id) {
            return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier cette tâche" });
        }

        const ancienAssigne = tache[0].assigne_a;

        // ✅ sql كان ناقص — هنا الحل
        await db.query(`
            UPDATE taches 
            SET titre = ?, description = ?, assigne_a = ?, priorite = ?, date_debut = ?, date_echeance = ?, updated_at = NOW()
            WHERE id = ?
        `, [
            titre || tache[0].titre,
            description !== undefined ? description : tache[0].description,
            assigne_a !== undefined ? assigne_a : tache[0].assigne_a,
            priorite || tache[0].priorite,
            date_debut || tache[0].date_debut,
            date_echeance || tache[0].date_echeance,
            tacheId
        ]);

        if (assigne_a && assigne_a !== ancienAssigne && assigne_a !== req.user.id) {
            const [createur] = await db.query("SELECT nom_complet FROM users WHERE id = ?", [req.user.id]);
            await notificationController.createNotification(
                assigne_a, 'tache_assignee', '🔄 Tâche réassignée',
                `${createur[0]?.nom_complet} vous a réassigné la tâche "${titre || tache[0].titre}" dans "${tache[0].nom_projet}".`,
                `/tasks?highlight=${tacheId}`
            );
        }

        res.json({ success: true, message: "✅ Tâche modifiée avec succès" });

    } catch (error) {
        console.error("❌ Erreur updateTache:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== METTRE À JOUR PROGRESSION =====================
exports.updateTacheProgression = async (req, res) => {
    try {
        const tacheId = req.params.id;
        const { progression } = req.body;

        if (progression === undefined || progression < 0 || progression > 100) {
            return res.status(400).json({ message: "La progression doit être entre 0 et 100" });
        }

        const [tache] = await db.query(`
            SELECT t.*, p.chef_projet_id, p.nom_projet, u.nom_complet as assigne_nom
            FROM taches t
            JOIN projets p ON t.projet_id = p.id
            LEFT JOIN users u ON t.assigne_a = u.id
            WHERE t.id = ?
        `, [tacheId]);

        if (tache.length === 0) return res.status(404).json({ message: "Tâche non trouvée" });

        const canUpdate =
            req.user.role === 'admin' ||
            tache[0].assigne_a === req.user.id ||
            tache[0].chef_projet_id === req.user.id;

        if (!canUpdate) return res.status(403).json({ message: "Non autorisé" });

        const ancienneProgression = tache[0].progression;
        let statut = progression === 100 ? 'termine' : progression > 0 ? 'en_cours' : 'a_faire';

        await db.query(`
            UPDATE taches 
            SET progression = ?, statut = ?,
                date_fin = CASE WHEN ? = 100 THEN NOW() ELSE date_fin END,
                updated_at = NOW()
            WHERE id = ?
        `, [progression, statut, progression, tacheId]);

        await exports.updateProjetProgression(tache[0].projet_id);

        const dateEcheance = new Date(tache[0].date_echeance);
        const aujourdhui = new Date();
        const joursRestants = Math.ceil((dateEcheance - aujourdhui) / (1000 * 60 * 60 * 24));

        if (progression === 100 && ancienneProgression !== 100) {
            if (tache[0].assigne_a) {
                await notificationController.createNotification(
                    tache[0].assigne_a, 'tache_assignee', '✅ Tâche terminée',
                    `Félicitations ! Vous avez terminé "${tache[0].titre}" dans "${tache[0].nom_projet}".`,
                    `/tasks?highlight=${tacheId}`
                );
            }
            await notificationController.createNotification(
                tache[0].chef_projet_id, 'projet_update', '✅ Tâche terminée',
                `${tache[0].assigne_nom || "L'employé"} a terminé "${tache[0].titre}".`,
                `/projects/${tache[0].projet_id}`
            );
        }

        if (progression < 100 && joursRestants <= 2 && joursRestants >= 0 && tache[0].assigne_a) {
            await notificationController.createNotification(
                tache[0].assigne_a, 'rappel_deadline', '⏰ Deadline imminente',
                `La tâche "${tache[0].titre}" expire dans ${joursRestants} jour(s) ! Avancement: ${progression}%.`,
                `/tasks?highlight=${tacheId}`
            );
        }

        res.json({
            success: true,
            message: `✅ Progression mise à jour: ${progression}%`,
            details: { tache: tache[0].titre, progression_actuelle: progression + '%', statut, jours_restants: joursRestants }
        });

    } catch (error) {
        console.error("❌ Erreur updateTacheProgression:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== METTRE À JOUR STATUT =====================
exports.updateTacheStatus = async (req, res) => {
    try {
        const tacheId = req.params.id;
        const { statut } = req.body;

        const statutsValides = ['a_faire', 'en_cours', 'termine'];
        if (!statut || !statutsValides.includes(statut)) {
            return res.status(400).json({ message: "Statut invalide" });
        }

        const [tache] = await db.query(`
            SELECT t.*, p.chef_projet_id, p.nom_projet, u.nom_complet as assigne_nom
            FROM taches t JOIN projets p ON t.projet_id = p.id
            LEFT JOIN users u ON t.assigne_a = u.id
            WHERE t.id = ?
        `, [tacheId]);

        if (tache.length === 0) return res.status(404).json({ message: "Tâche non trouvée" });

        const canUpdate =
            req.user.role === 'admin' ||
            tache[0].assigne_a === req.user.id ||
            tache[0].chef_projet_id === req.user.id;

        if (!canUpdate) return res.status(403).json({ message: "Non autorisé" });

        let progression = tache[0].progression;
        if (statut === 'termine') progression = 100;
        else if (statut === 'en_cours' && progression === 0) progression = 25;
        else if (statut === 'a_faire') progression = 0;

        await db.query(`
            UPDATE taches 
            SET statut = ?, progression = ?,
                date_fin = CASE WHEN ? = 'termine' THEN NOW() ELSE NULL END
            WHERE id = ?
        `, [statut, progression, statut, tacheId]);

        await exports.updateProjetProgression(tache[0].projet_id);

        if (statut === 'termine' && tache[0].statut !== 'termine') {
            await notificationController.createNotification(
                tache[0].chef_projet_id, 'projet_update', '✅ Tâche terminée',
                `${tache[0].assigne_nom || "L'employé"} a marqué comme terminée "${tache[0].titre}".`,
                `/projects/${tache[0].projet_id}`
            );
        }

        res.json({ success: true, message: `✅ Statut mis à jour: ${statut}` });

    } catch (error) {
        console.error("❌ Erreur updateTacheStatus:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== SUPPRIMER UNE TÂCHE =====================
exports.deleteTache = async (req, res) => {
    try {
        const tacheId = req.params.id;

        const [tache] = await db.query(
            "SELECT t.*, p.chef_projet_id FROM taches t JOIN projets p ON t.projet_id = p.id WHERE t.id = ?",
            [tacheId]
        );

        if (tache.length === 0) return res.status(404).json({ success: false, message: "Tâche non trouvée" });

        const projetId = tache[0].projet_id;

        if (req.user.role !== 'admin' && tache[0].chef_projet_id !== req.user.id) {
            return res.status(403).json({ success: false, message: "Non autorisé" });
        }

        if (tache[0].assigne_a) {
            await notificationController.createNotification(
                tache[0].assigne_a, 'projet_update', '🗑️ Tâche supprimée',
                `La tâche "${tache[0].titre}" a été supprimée.`,
                `/projects/${projetId}`
            );
        }

        try {
            await db.query("DELETE FROM commentaires_tache WHERE tache_id = ?", [tacheId]);
        } catch (err) {
            console.log("⚠️ Table commentaires_tache n'existe pas");
        }

        await db.query("DELETE FROM taches WHERE id = ?", [tacheId]);

        if (projetId) await exports.updateProjetProgression(projetId);

        res.json({ success: true, message: "✅ Tâche supprimée avec succès" });

    } catch (error) {
        console.error("❌ Erreur deleteTache:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

// ===================== METTRE À JOUR PROGRESSION PROJET =====================
exports.updateProjetProgression = async (projetId) => {
    try {
        if (!projetId) return;
        const [taches] = await db.query(
            "SELECT progression FROM taches WHERE projet_id = ? AND deleted_at IS NULL",
            [projetId]
        );
        const total = taches.length;
        const somme = taches.reduce((sum, t) => sum + (t.progression || 0), 0);
        const progression = total > 0 ? Math.round(somme / total) : 0;
        await db.query("UPDATE projets SET progression = ? WHERE id = ?", [progression, projetId]);
    } catch (error) {
        console.error("❌ Erreur updateProjetProgression:", error);
    }
};

// ===================== MES TÂCHES =====================
exports.getMesTaches = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let sql = `
            SELECT t.*, p.nom_projet, p.chef_projet_id,
                u.nom_complet as assigne_nom, u2.nom_complet as chef_nom,
                DATEDIFF(t.date_echeance, CURDATE()) as jours_restants,
                CASE 
                    WHEN t.statut != 'termine' AND t.date_echeance < CURDATE() THEN 'en_retard'
                    WHEN t.statut != 'termine' AND DATEDIFF(t.date_echeance, CURDATE()) <= 2 THEN 'deadline_proche'
                    ELSE 'normal'
                END as alerte
            FROM taches t
            JOIN projets p ON t.projet_id = p.id
            LEFT JOIN users u ON t.assigne_a = u.id
            LEFT JOIN users u2 ON p.chef_projet_id = u2.id
            WHERE p.deleted_at IS NULL AND t.deleted_at IS NULL
        `;

        if (userRole === 'chef_projet') sql += ` AND p.chef_projet_id = ${userId}`;
        else if (userRole === 'employe') sql += ` AND t.assigne_a = ${userId}`;

        sql += ` ORDER BY
            CASE WHEN t.statut != 'termine' AND t.date_echeance < CURDATE() THEN 1
                 WHEN t.statut != 'termine' AND DATEDIFF(t.date_echeance, CURDATE()) <= 2 THEN 2
                 ELSE 3 END,
            CASE t.priorite WHEN 'haute' THEN 1 WHEN 'moyenne' THEN 2 WHEN 'faible' THEN 3 END,
            t.created_at DESC`;

        const [taches] = await db.query(sql);

        res.json({
            success: true,
            stats: {
                total: taches.length,
                a_faire: taches.filter(t => t.statut === 'a_faire').length,
                en_cours: taches.filter(t => t.statut === 'en_cours').length,
                terminees: taches.filter(t => t.statut === 'termine').length,
                en_retard: taches.filter(t => t.alerte === 'en_retard').length,
                deadline_proche: taches.filter(t => t.alerte === 'deadline_proche').length
            },
            taches
        });

    } catch (error) {
        console.error("❌ Erreur getMesTaches:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

// ===================== GET TACHE BY ID =====================
exports.getTacheById = async (req, res) => {
    try {
        const tacheId = req.params.id;

        const [taches] = await db.query(`
            SELECT t.*, u.nom_complet as assigne_nom, p.nom_projet, p.chef_projet_id,
                DATEDIFF(t.date_echeance, CURDATE()) as jours_restants,
                CASE 
                    WHEN t.statut != 'termine' AND t.date_echeance < CURDATE() THEN 'en_retard'
                    WHEN t.statut != 'termine' AND DATEDIFF(t.date_echeance, CURDATE()) <= 2 THEN 'deadline_proche'
                    ELSE 'normal'
                END as alerte
            FROM taches t
            LEFT JOIN users u ON t.assigne_a = u.id
            JOIN projets p ON t.projet_id = p.id
            WHERE t.id = ?
        `, [tacheId]);

        if (taches.length === 0) return res.status(404).json({ message: "Tâche non trouvée" });

        const [commentaires] = await db.query(`
            SELECT c.*, u.nom_complet as auteur_nom
            FROM commentaires_tache c
            JOIN users u ON c.user_id = u.id
            WHERE c.tache_id = ?
            ORDER BY c.created_at DESC
        `, [tacheId]);

        res.json({ success: true, tache: { ...taches[0], commentaires } });

    } catch (error) {
        console.error("❌ Erreur getTacheById:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== TÂCHES PAR PROJET =====================
exports.getTachesByProjet = async (req, res) => {
    try {
        const projetId = req.params.projetId;

        const [taches] = await db.query(`
            SELECT t.*, u.nom_complet as assigne_nom
            FROM taches t
            LEFT JOIN users u ON t.assigne_a = u.id
            WHERE t.projet_id = ?
            ORDER BY 
                CASE t.priorite WHEN 'haute' THEN 1 WHEN 'moyenne' THEN 2 WHEN 'faible' THEN 3 END,
                t.date_echeance ASC
        `, [projetId]);

        res.json({ success: true, taches });

    } catch (error) {
        console.error("❌ Erreur getTachesByProjet:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== ANALYSER AVANCEMENT TÂCHE =====================
exports.analyserAvancementTache = async (req, res) => {
    try {
        const tacheId = req.params.id;

        // ✅ db.promise() كان غلط — الصح db.query() مباشرة
        const [taches] = await db.query(`
            SELECT t.*, p.nom_projet, u.nom_complet as assigne_nom,
                DATEDIFF(t.date_echeance, CURDATE()) as jours_restants,
                CASE 
                    WHEN t.statut = 'termine' THEN 'Terminé'
                    WHEN t.date_echeance < CURDATE() AND t.statut != 'termine' THEN 'En retard'
                    WHEN DATEDIFF(t.date_echeance, CURDATE()) <= 2 THEN 'Deadline proche'
                    ELSE 'Normal'
                END as etat
            FROM taches t
            JOIN projets p ON t.projet_id = p.id
            LEFT JOIN users u ON t.assigne_a = u.id
            WHERE t.id = ?
        `, [tacheId]);

        if (taches.length === 0) return res.status(404).json({ message: "Tâche non trouvée" });

        const tache = taches[0];

        res.json({
            success: true,
            analyse: {
                id: tache.id,
                titre: tache.titre,
                progression: (tache.progression || 0) + '%',
                statut: tache.statut,
                etat: tache.etat,
                jours_restants: tache.jours_restants,
                assigne_a: tache.assigne_nom,
                projet: tache.nom_projet,
                recommandation: tache.statut === 'termine'
                    ? "✅ Tâche complétée"
                    : tache.jours_restants <= 2
                    ? "⚠️ Deadline imminente"
                    : "📋 En cours de traitement"
            }
        });

    } catch (error) {
        console.error("❌ Erreur analyserAvancementTache:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};