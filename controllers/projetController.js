const db = require("../config/db");

// ===================== CRÉER UN PROJET =====================
exports.createProjet = async (req, res) => {
    try {
        const {
            nom_projet,
            description,
            chef_projet_id,
            date_debut,
            date_fin_prevue,
            statut,
            priorite
        } = req.body;

        // Vérification
        if (!nom_projet) {
            return res.status(400).json({ 
                message: "Le nom du projet est obligatoire" 
            });
        }

        if (!date_fin_prevue) {
            return res.status(400).json({ 
                message: "La date de fin prévue est obligatoire" 
            });
        }

        // Vérifier que la date de fin > date de début
        if (date_debut && date_fin_prevue && new Date(date_fin_prevue) < new Date(date_debut)) {
            return res.status(400).json({ 
                message: "La date de fin doit être postérieure à la date de début" 
            });
        }

        const sql = `
            INSERT INTO projets (
                nom_projet, description, chef_projet_id, 
                date_debut, date_fin_prevue, statut, priorite,
                created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(sql, [
            nom_projet,
            description || null,
            chef_projet_id || null,
            date_debut || null,
            date_fin_prevue,
            statut || 'en_attente',
            priorite || 'moyenne',
            req.user.id // created_by
        ]);

        res.status(201).json({
            success: true,
            message: "✅ Projet créé avec succès",
            projet: {
                id: result.insertId,
                nom_projet,
                chef_projet_id
            }
        });

    } catch (error) {
        console.error("❌ Erreur createProjet:", error);
        res.status(500).json({ 
            message: "Erreur serveur lors de la création du projet" 
        });
    }
};

// ===================== LISTER TOUS LES PROJETS =====================
exports.getAllProjets = async (req, res) => {
    try {
        let sql = `
            SELECT 
                p.*,
                u.nom_complet as chef_nom,
                (SELECT COUNT(*) FROM taches WHERE projet_id = p.id) as nb_taches,
                (SELECT COUNT(*) FROM taches WHERE projet_id = p.id AND statut = 'termine') as taches_terminees
            FROM projets p
            LEFT JOIN users u ON p.chef_projet_id = u.id
            WHERE p.deleted_at IS NULL
        `;

        // Filtrer selon le rôle
        if (req.user.role === 'employe') {
            sql += ` AND EXISTS (
                SELECT 1 FROM taches t 
                WHERE t.projet_id = p.id AND t.assigne_a = ${req.user.id}
            )`;
        } else if (req.user.role === 'chef_projet') {
            sql += ` AND (p.chef_projet_id = ${req.user.id} OR ${req.user.id} IN (
                SELECT DISTINCT created_by FROM projets WHERE id = p.id
            ))`;
        }

        sql += ` ORDER BY p.created_at DESC`;

        const [projets] = await db.query(sql);

        // Calculer la progression pour chaque projet
        projets.forEach(projet => {
            if (projet.nb_taches > 0) {
                projet.progression = Math.round((projet.taches_terminees / projet.nb_taches) * 100);
            }
        });

        res.json({
            success: true,
            count: projets.length,
            projets
        });

    } catch (error) {
        console.error("❌ Erreur getAllProjets:", error);
        res.status(500).json({ 
            message: "Erreur serveur lors du chargement des projets" 
        });
    }
};

// ===================== RÉCUPÉRER UN PROJET PAR ID =====================
exports.getProjetById = async (req, res) => {
    try {
        const projetId = req.params.id;

        const [projets] = await db.query(`
            SELECT 
                p.*,
                u.nom_complet as chef_nom,
                u.email as chef_email
            FROM projets p
            LEFT JOIN users u ON p.chef_projet_id = u.id
            WHERE p.id = ? AND p.deleted_at IS NULL
        `, [projetId]);

        if (projets.length === 0) {
            return res.status(404).json({ 
                message: "Projet non trouvé" 
            });
        }

        const projet = projets[0];
<<<<<<< HEAD
=======
        
        // ✅ Récupérer les statistiques des tâches
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total_taches,
                SUM(CASE WHEN statut = 'termine' THEN 1 ELSE 0 END) as taches_terminees,
                SUM(progression) as somme_progressions
            FROM taches 
            WHERE projet_id = ? AND deleted_at IS NULL
        `, [projetId]);

        const totalTaches = stats[0].total_taches || 0;
        const tachesTerminees = stats[0].taches_terminees || 0;
        const sommeProgressions = stats[0].somme_progressions || 0;
        
        // ✅ Calculer la progression (moyenne des progressions)
        const progression = totalTaches > 0 ? Math.round(sommeProgressions / totalTaches) : 0;
>>>>>>> 0f3c680 (correction)

        // Récupérer les tâches du projet
        const [taches] = await db.query(`
            SELECT 
                t.*,
                u.nom_complet as assigne_nom
            FROM taches t
            LEFT JOIN users u ON t.assigne_a = u.id
            WHERE t.projet_id = ?
            ORDER BY 
                CASE t.priorite 
                    WHEN 'haute' THEN 1 
                    WHEN 'moyenne' THEN 2 
                    WHEN 'faible' THEN 3 
                END,
                t.date_echeance ASC
        `, [projetId]);

        res.json({
            success: true,
            projet: {
                ...projet,
                taches
            }
        });

    } catch (error) {
        console.error("❌ Erreur getProjetById:", error);
        res.status(500).json({ 
            message: "Erreur serveur" 
        });
    }
};

// ===================== MODIFIER UN PROJET =====================
exports.updateProjet = async (req, res) => {
    try {
        const projetId = req.params.id;
        const {
            nom_projet,
            description,
            chef_projet_id,
            date_debut,
            date_fin_prevue,
            statut,
            priorite,
             progression 
        } = req.body;

        // Vérifier que le projet existe
        const [projet] = await db.query(
            "SELECT * FROM projets WHERE id = ? AND deleted_at IS NULL",
            [projetId]
        );

        if (projet.length === 0) {
            return res.status(404).json({ 
                message: "Projet non trouvé" 
            });
        }

        // Vérifier les permissions
        if (req.user.role !== 'admin' && projet[0].chef_projet_id !== req.user.id) {
            return res.status(403).json({ 
                message: "Vous n'êtes pas autorisé à modifier ce projet" 
            });
        }

        const sql = `
            UPDATE projets 
            SET nom_projet = ?, 
                description = ?, 
                chef_projet_id = ?, 
                date_debut = ?, 
                date_fin_prevue = ?, 
                statut = ?, 
                priorite = ?,
                 progression = ? 
            WHERE id = ?
        `;

        await db.query(sql, [
            nom_projet || projet[0].nom_projet,
            description !== undefined ? description : projet[0].description,
            chef_projet_id || projet[0].chef_projet_id,
            date_debut || projet[0].date_debut,
            date_fin_prevue || projet[0].date_fin_prevue,
            statut || projet[0].statut,
            priorite || projet[0].priorite,
             progression !== undefined ? progression : projet[0].progression,
            projetId
        ]);

        res.json({
            success: true,
            message: "✅ Projet modifié avec succès"
        });

    } catch (error) {
        console.error("❌ Erreur updateProjet:", error);
        res.status(500).json({ 
            message: "Erreur serveur lors de la modification" 
        });
    }
};

// ===================== SUPPRIMER UN PROJET (SOFT DELETE) =====================
// ===================== SUPPRIMER UN PROJET (HARD DELETE) =====================
exports.deleteProjet = async (req, res) => {
  try {
    const projetId = req.params.id;

    // Vérifier que le projet existe
    const [projet] = await db.query(
      "SELECT * FROM projets WHERE id = ?",
      [projetId]
    );

    if (projet.length === 0) {
      return res.status(404).json({ 
        message: "Projet non trouvé" 
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && projet[0].chef_projet_id !== req.user.id) {
      return res.status(403).json({ 
        message: "Vous n'êtes pas autorisé à supprimer ce projet" 
      });
    }

    // ✅ HARD DELETE - Supprimer définitivement de la base
    await db.query(
      "DELETE FROM projets WHERE id = ?",
      [projetId]
    );

    // Supprimer aussi les tâches liées au projet (optionnel)
    await db.query(
      "DELETE FROM taches WHERE projet_id = ?",
      [projetId]
    );

    res.json({
      success: true,
      message: "✅ Projet supprimé définitivement avec succès"
    });

  } catch (error) {
    console.error("❌ Erreur deleteProjet:", error);
    res.status(500).json({ 
      message: "Erreur serveur lors de la suppression" 
    });
  }
};
// ===================== CALCULER L'AVANCEMENT D'UN PROJET =====================
exports.calculerAvancementProjet = async (req, res) => {
    try {
        const projetId = req.params.id;

        console.log(`📊 Calcul avancement pour projet ${projetId}`);

        // Vérifier d'abord si le projet existe
        const [projet] = await db.query(
            "SELECT * FROM projets WHERE id = ? AND deleted_at IS NULL",
            [projetId]
        );

        if (projet.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Projet non trouvé" 
            });
        }

        // Récupérer les statistiques des tâches avec les bonnes valeurs ENUM
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total_taches,
                SUM(CASE WHEN statut = 'termine' THEN 1 ELSE 0 END) as taches_terminees,
                SUM(CASE WHEN statut = 'en_cours' THEN 1 ELSE 0 END) as taches_en_cours,
                SUM(CASE WHEN statut = 'a_faire' THEN 1 ELSE 0 END) as taches_a_faire,
                SUM(CASE 
                    WHEN statut != 'termine' AND date_echeance < CURDATE() 
                    THEN 1 ELSE 0 
                END) as taches_en_retard
            FROM taches 
            WHERE projet_id = ? AND deleted_at IS NULL
        `, [projetId]);

        console.log("📊 Statistiques calculées:", stats[0]);

        const total = stats[0].total_taches || 0;
        const terminees = stats[0].taches_terminees || 0;
        
        // Calculer la progression (pourcentage)
        const progression = total > 0 ? Math.round((terminees / total) * 100) : 0;

        // Déterminer le statut basé sur l'avancement et les retards
        let statutProjet = 'en_cours';
        if (progression === 100) {
            statutProjet = 'termine';
        } else if (stats[0].taches_en_retard > 0) {
            statutProjet = 'en_retard';
        }

        // Mettre à jour le projet
        await db.query(`
            UPDATE projets 
            SET progression = ?, 
                statut = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [progression, statutProjet, projetId]);

        // Si le projet est terminé, mettre la date de fin réelle
        if (statutProjet === 'termine') {
            await db.query(`
                UPDATE projets 
                SET date_fin_reelle = CURDATE() 
                WHERE id = ?
            `, [projetId]);
        }

        res.json({
            success: true,
            message: "✅ Avancement calculé avec succès",
            avancement: {
                progression: progression + '%',
                statut: statutProjet,
                total_taches: total,
                taches_terminees: terminees,
                taches_en_cours: stats[0].taches_en_cours || 0,
                taches_a_faire: stats[0].taches_a_faire || 0,
                taches_en_retard: stats[0].taches_en_retard || 0
            }
        });

    } catch (error) {
        console.error("❌ Erreur calculerAvancementProjet:", error);
        res.status(500).json({ 
            success: false,
            message: "Erreur serveur lors du calcul d'avancement",
            error: error.message
        });
    }
};

// ===================== VÉRIFIER LES DEADLINES =====================
exports.verifierDeadlines = async (req, res) => {
    try {
        // Récupérer tous les projets avec leur état par rapport à la deadline
        const [projets] = await db.query(`
            SELECT 
                id,
                nom_projet,
                date_fin_prevue,
                progression,
                statut,
                DATEDIFF(date_fin_prevue, CURDATE()) as jours_restants,
                CASE 
                    WHEN statut = 'termine' THEN 'Terminé'
                    WHEN date_fin_prevue < CURDATE() AND statut != 'termine' THEN 'En retard'
                    WHEN DATEDIFF(date_fin_prevue, CURDATE()) <= 7 AND DATEDIFF(date_fin_prevue, CURDATE()) > 0 THEN 'Deadline proche'
                    WHEN date_fin_prevue >= CURDATE() THEN 'Dans les délais'
                END as etat_deadline
            FROM projets 
            WHERE deleted_at IS NULL
            ORDER BY date_fin_prevue ASC
        `);

        // Identifier les projets à risque (progression faible avec deadline proche)
        const projetsRisques = projets.filter(p => {
            if (p.statut === 'termine') return false;
            
            const joursRestants = p.jours_restants;
            const progression = p.progression || 0;
            
            // Risque élevé: progression < 50% et moins de 7 jours restants
            return joursRestants <= 7 && progression < 50 && joursRestants > 0;
        });

        res.json({
            success: true,
            analyse: {
                total_projets: projets.length,
                en_retard: projets.filter(p => p.etat_deadline === 'En retard').length,
                deadline_proche: projets.filter(p => p.etat_deadline === 'Deadline proche').length,
                dans_les_delais: projets.filter(p => p.etat_deadline === 'Dans les délais').length,
                termines: projets.filter(p => p.etat_deadline === 'Terminé').length,
                projets_risques: projetsRisques.map(p => ({
                    id: p.id,
                    nom: p.nom_projet,
                    jours_restants: p.jours_restants,
                    progression: p.progression + '%',
                    recommandation: "Augmenter la cadence ou réaffecter des ressources"
                }))
            },
            details: projets
        });

    } catch (error) {
        console.error("❌ Erreur verifierDeadlines:", error);
        res.status(500).json({ 
            message: "Erreur serveur lors de la vérification des deadlines" 
        });
    }
};

// ===================== ANALYSER LA PRIORITÉ DES PROJETS =====================
exports.analyserPriorites = async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                priorite,
                COUNT(*) as nombre_projets,
                SUM(CASE WHEN statut = 'en_cours' THEN 1 ELSE 0 END) as en_cours,
                SUM(CASE WHEN statut = 'en_retard' THEN 1 ELSE 0 END) as en_retard,
                SUM(CASE WHEN statut = 'termine' THEN 1 ELSE 0 END) as termines,
                AVG(progression) as progression_moyenne
            FROM projets 
            WHERE deleted_at IS NULL
            GROUP BY priorite
            ORDER BY 
                CASE priorite 
                    WHEN 'critique' THEN 1 
                    WHEN 'haute' THEN 2 
                    WHEN 'moyenne' THEN 3 
                    WHEN 'faible' THEN 4 
                END
        `);

        // Recommandations basées sur la priorité
        const recommandations = [];
        
        stats.forEach(p => {
            if (p.priorite === 'critique' && p.en_retard > 0) {
                recommandations.push(`⚠️ Projets critiques en retard: ${p.en_retard} projet(s) nécessitent une attention immédiate`);
            }
            if (p.priorite === 'haute' && p.progression_moyenne < 50) {
                recommandations.push(`📊 Projets haute priorité avec progression faible (${Math.round(p.progression_moyenne)}%)`);
            }
        });

        res.json({
            success: true,
            analyse_priorite: stats,
            recommandations: recommandations
        });

    } catch (error) {
        console.error("❌ Erreur analyserPriorites:", error);
        res.status(500).json({ 
            message: "Erreur serveur lors de l'analyse des priorités" 
        });
    }
};

// ===================== METTRE À JOUR LA PRIORITÉ =====================
exports.updatePriorite = async (req, res) => {
    try {
        const projetId = req.params.id;
        const { priorite } = req.body;

        // Liste des priorités valides
        const prioritesValides = ['faible', 'moyenne', 'haute', 'critique'];

        if (!priorite || !prioritesValides.includes(priorite)) {
            return res.status(400).json({ 
                message: "Priorité invalide. Choisir: faible, moyenne, haute, critique" 
            });
        }

        // Vérifier que le projet existe
        const [projet] = await db.query(
            "SELECT * FROM projets WHERE id = ? AND deleted_at IS NULL",
            [projetId]
        );

        if (projet.length === 0) {
            return res.status(404).json({ 
                message: "Projet non trouvé" 
            });
        }

        // Mettre à jour la priorité
        await db.query(
            "UPDATE projets SET priorite = ?, updated_at = NOW() WHERE id = ?",
            [priorite, projetId]
        );

        res.json({
            success: true,
            message: `✅ Priorité du projet mise à jour: ${priorite}`,
            projet: {
                id: projetId,
                nom: projet[0].nom_projet,
                nouvelle_priorite: priorite
            }
        });

    } catch (error) {
        console.error("❌ Erreur updatePriorite:", error);
        res.status(500).json({ 
            message: "Erreur serveur lors de la mise à jour de la priorité" 
        });
    }
};

// ===================== PROLONGER LA DEADLINE =====================
exports.prolongerDeadline = async (req, res) => {
    try {
        const projetId = req.params.id;
        const { nouvelle_date_fin, raison } = req.body;

        if (!nouvelle_date_fin) {
            return res.status(400).json({ 
                message: "La nouvelle date de fin est obligatoire" 
            });
        }

        // Vérifier que le projet existe
        const [projet] = await db.query(
            "SELECT * FROM projets WHERE id = ? AND deleted_at IS NULL",
            [projetId]
        );

        if (projet.length === 0) {
            return res.status(404).json({ 
                message: "Projet non trouvé" 
            });
        }

        // Vérifier que la nouvelle date est postérieure à l'ancienne
        const oldDate = new Date(projet[0].date_fin_prevue);
        const newDate = new Date(nouvelle_date_fin);

        if (newDate <= oldDate) {
            return res.status(400).json({ 
                message: "La nouvelle deadline doit être postérieure à l'ancienne" 
            });
        }

        // Calculer le nombre de jours de prolongation
        const joursProlongation = Math.round((newDate - oldDate) / (1000 * 60 * 60 * 24));

        // Mettre à jour la deadline
        await db.query(
            `UPDATE projets 
             SET date_fin_prevue = ?, 
                 updated_at = NOW() 
             WHERE id = ?`,
            [nouvelle_date_fin, projetId]
        );

        // Enregistrer l'historique de prolongation (optionnel - créer table si besoin)
        // await db.query(
        //     "INSERT INTO prolongations (projet_id, ancienne_date, nouvelle_date, raison, prolonge_par) VALUES (?, ?, ?, ?, ?)",
        //     [projetId, projet[0].date_fin_prevue, nouvelle_date_fin, raison || 'Non spécifiée', req.user.id]
        // );

        res.json({
            success: true,
            message: `✅ Deadline prolongée de ${joursProlongation} jours`,
            projet: {
                id: projetId,
                nom: projet[0].nom_projet,
                ancienne_deadline: projet[0].date_fin_prevue,
                nouvelle_deadline: nouvelle_date_fin,
                jours_ajoutes: joursProlongation
            }
        });

    } catch (error) {
        console.error("❌ Erreur prolongerDeadline:", error);
        res.status(500).json({ 
            message: "Erreur serveur lors de la prolongation de la deadline" 
        });
    }
};