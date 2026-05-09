const db = require("../config/db");

// ===================== US1: GÉRER LES MEMBRES DE L'ÉQUIPE =====================
// Admin seulement

// 1.1 Lister tous les membres
exports.getMembres = async (req, res) => {
    try {
        console.log("👥 US1: Liste des membres");

        const [membres] = await db.query(`
            SELECT 
                id,
                nom_complet,
                email,
                role,
                status,
                telephone,
                poste,
                departement,
                DATE_FORMAT(date_embauche, '%Y-%m-%d') as date_embauche,
                DATE_FORMAT(created_at, '%Y-%m-%d') as date_creation
            FROM users 
            WHERE deleted_at IS NULL
            ORDER BY 
                CASE role 
                    WHEN 'admin' THEN 1
                    WHEN 'chef_projet' THEN 2
                    WHEN 'employe' THEN 3
                END,
                nom_complet ASC
        `);

        res.json({
            success: true,
            count: membres.length,
            membres: membres
        });

    } catch (error) {
        console.error("❌ Erreur getMembres:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// 1.2 Ajouter un membre (via création utilisateur)
// Déjà dans authController.createUser

// 1.3 Modifier un membre
exports.updateMembre = async (req, res) => {
    try {
        const membreId = req.params.id;
        const {
            nom_complet,
            email,
            role,
            telephone,
            poste,
            departement,
            status
        } = req.body;

        console.log(`📝 Modification membre ${membreId}`);

        // Vérifier que le membre existe
        const [membre] = await db.query(
            "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL",
            [membreId]
        );

        if (membre.length === 0) {
            return res.status(404).json({ 
                message: "Membre non trouvé" 
            });
        }

        // Vérifier email unique si changé
        if (email && email !== membre[0].email) {
            const [existing] = await db.query(
                "SELECT id FROM users WHERE email = ? AND id != ?",
                [email, membreId]
            );
            if (existing.length > 0) {
                return res.status(400).json({ 
                    message: "Email déjà utilisé par un autre membre" 
                });
            }
        }

        // Construire la requête dynamique
        const updates = [];
        const values = [];

        if (nom_complet) {
            updates.push("nom_complet = ?");
            values.push(nom_complet);
        }
        if (email) {
            updates.push("email = ?");
            values.push(email);
        }
        if (role) {
            updates.push("role = ?");
            values.push(role);
        }
        if (telephone !== undefined) {
            updates.push("telephone = ?");
            values.push(telephone);
        }
        if (poste !== undefined) {
            updates.push("poste = ?");
            values.push(poste);
        }
        if (departement !== undefined) {
            updates.push("departement = ?");
            values.push(departement);
        }
        if (status !== undefined) {
            updates.push("status = ?");
            values.push(status);
        }

        updates.push("updated_at = NOW()");
        values.push(membreId);

        if (updates.length === 0) {
            return res.status(400).json({ 
                message: "Aucune donnée à modifier" 
            });
        }

        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        await db.query(sql, values);

        res.json({
            success: true,
            message: "✅ Membre modifié avec succès"
        });

    } catch (error) {
        console.error("❌ Erreur updateMembre:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// 1.4 Désactiver un membre (soft delete)
exports.desactiverMembre = async (req, res) => {
    try {
        const membreId = req.params.id;

        console.log(`🔴 Désactivation membre ${membreId}`);

        // Vérifier que le membre existe
        const [membre] = await db.query(
            "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL",
            [membreId]
        );

        if (membre.length === 0) {
            return res.status(404).json({ 
                message: "Membre non trouvé" 
            });
        }

        // Empêcher la désactivation de soi-même
        if (req.user.id === parseInt(membreId)) {
            return res.status(400).json({ 
                message: "Vous ne pouvez pas désactiver votre propre compte" 
            });
        }

        // Vérifier si le membre a des tâches actives (cas limité)
        const [tachesActives] = await db.query(`
            SELECT COUNT(*) as count 
            FROM taches 
            WHERE assigne_a = ? AND statut != 'termine' AND deleted_at IS NULL
        `, [membreId]);

        if (tachesActives[0].count > 0) {
            return res.status(400).json({ 
                message: `Impossible de désactiver: ${tachesActives[0].count} tâche(s) active(s)`,
                taches_actives: tachesActives[0].count
            });
        }

        // Désactiver (soft delete)
        await db.query(
            "UPDATE users SET deleted_at = NOW(), status = 0 WHERE id = ?",
            [membreId]
        );

        res.json({
            success: true,
            message: "✅ Membre désactivé avec succès"
        });

    } catch (error) {
        console.error("❌ Erreur desactiverMembre:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// 1.5 Réactiver un membre
exports.reactiverMembre = async (req, res) => {
    try {
        const membreId = req.params.id;

        console.log(`🟢 Réactivation membre ${membreId}`);

        const [result] = await db.query(
            "UPDATE users SET deleted_at = NULL, status = 1 WHERE id = ?",
            [membreId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                message: "Membre non trouvé" 
            });
        }

        res.json({
            success: true,
            message: "✅ Membre réactivé avec succès"
        });

    } catch (error) {
        console.error("❌ Erreur reactiverMembre:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== US2: DISPONIBILITÉ DES EMPLOYÉS =====================
// Chef de projet peut voir
exports.getDisponibiliteEmployes = async (req, res) => {
    try {
        console.log("📊 US2: Disponibilité des employés");

        // Récupérer tous les employés avec leur charge de travail
        const [employes] = await db.query(`
            SELECT 
                u.id,
                u.nom_complet,
                u.email,
                u.poste,
                COUNT(t.id) as total_taches_assignees,
                SUM(CASE WHEN t.statut != 'termine' THEN 1 ELSE 0 END) as taches_actives,
                SUM(CASE WHEN t.statut = 'termine' THEN 1 ELSE 0 END) as taches_terminees,
                SUM(CASE WHEN t.statut != 'termine' AND t.date_echeance < CURDATE() THEN 1 ELSE 0 END) as taches_en_retard,
                MAX(t.date_echeance) as prochaine_deadline
            FROM users u
            LEFT JOIN taches t ON u.id = t.assigne_a AND t.deleted_at IS NULL
            WHERE u.role = 'employe' AND u.deleted_at IS NULL AND u.status = 1
            GROUP BY u.id, u.nom_complet, u.email, u.poste
            ORDER BY taches_actives DESC
        `);

        // Si aucun employé
        if (employes.length === 0) {
            return res.json({
                success: true,
                message: "👥 Aucun employé disponible",
                employes: []
            });
        }

        // Déterminer la disponibilité basée sur la charge active
        const employesAvecDispo = employes.map(e => {
            let disponibilite = "";
            let couleur = "";
            let statutIcone = "";

            if (e.taches_actives === 0 || e.taches_actives === 1) {
                disponibilite = "Disponible";
                couleur = "🟢";
                statutIcone = "🟢";
            } else if (e.taches_actives === 2) {
                disponibilite = "Occupé";
                couleur = "🟡";
                statutIcone = "🟡";
            } else {
                disponibilite = "Surchargé";
                couleur = "🔴";
                statutIcone = "🔴";
            }

            // Ajouter alerte si tâches en retard
            let alerte = "";
            if (e.taches_en_retard > 0) {
                alerte = `⚠️ ${e.taches_en_retard} tâche(s) en retard`;
            }

            return {
                id: e.id,
                nom: e.nom_complet,
                email: e.email,
                poste: e.poste || "Non défini",
                // Indicateurs
                total_taches: e.total_taches_assignees,
                taches_actives: e.taches_actives,
                taches_terminees: e.taches_terminees,
                taches_en_retard: e.taches_en_retard,
                prochaine_deadline: e.prochaine_deadline,
                // ✅ Disponibilité calculée
                disponibilite: disponibilite,
                couleur: couleur,
                // Pourcentage d'occupation
                taux_occupation: e.taches_actives > 0 
                    ? Math.min(100, Math.round((e.taches_actives / 5) * 100))
                    : 0
            };
        });

        res.json({
            success: true,
            total_employes: employesAvecDispo.length,
            employes_disponibles: employesAvecDispo.filter(e => e.taches_actives === 0).length,
            employes_surcharges: employesAvecDispo.filter(e => e.taches_actives >= 5).length,
            employes: employesAvecDispo
        });

    } catch (error) {
        console.error("❌ Erreur getDisponibiliteEmployes:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== US3: PERFORMANCE DE L'ÉQUIPE =====================
// ✅ Formule: performance = (tâches terminées * temps / total tâches) * 100
exports.getPerformanceEquipe = async (req, res) => {
    try {
        console.log("📈 US3: Performance équipe");

        // Statistiques globales
        const [global] = await db.query(`
            SELECT 
                COUNT(*) as total_taches,
                SUM(CASE WHEN statut = 'termine' THEN 1 ELSE 0 END) as taches_terminees,
                AVG(CASE 
                    WHEN statut = 'termine' AND date_fin IS NOT NULL AND date_debut IS NOT NULL
                    THEN DATEDIFF(date_fin, date_debut)
                    ELSE NULL
                END) as duree_moyenne
            FROM taches
            WHERE deleted_at IS NULL
        `);

        // Performance par employé
        const [perfEmployes] = await db.query(`
            SELECT 
                u.id,
                u.nom_complet,
                COUNT(t.id) as total_taches,
                SUM(CASE WHEN t.statut = 'termine' THEN 1 ELSE 0 END) as taches_terminees,
                AVG(CASE 
                    WHEN t.statut = 'termine' AND t.date_fin IS NOT NULL AND t.date_debut IS NOT NULL
                    THEN DATEDIFF(t.date_fin, t.date_debut)
                    ELSE NULL
                END) as duree_moyenne,
                SUM(CASE WHEN t.statut = 'termine' AND t.date_fin <= t.date_echeance THEN 1 ELSE 0 END) as respecte_deadline
            FROM users u
            LEFT JOIN taches t ON u.id = t.assigne_a AND t.deleted_at IS NULL
            WHERE u.role = 'employe' AND u.deleted_at IS NULL
            GROUP BY u.id, u.nom_complet
            HAVING total_taches > 0
        `);

        // ✅ Calcul de la performance avec TA formule
        const performanceGlobale = global[0].total_taches > 0
            ? Math.round((global[0].taches_terminees / global[0].total_taches) * 100)
            : 0;

        // Calcul par employé
        const performances = perfEmployes.map(e => {
            // ✅ TA formule: (tâches terminées * temps / total tâches) * 100
            // Simplifié car on n'a pas le "temps" dans la formule
            const tauxCompletion = e.total_taches > 0
                ? Math.round((e.taches_terminees / e.total_taches) * 100)
                : 0;
            
            const tauxRespectDeadline = e.taches_terminees > 0
                ? Math.round((e.respecte_deadline / e.taches_terminees) * 100)
                : 0;

            return {
                employe: e.nom_complet,
                total_taches: e.total_taches,
                taches_terminees: e.taches_terminees,
                taux_completion: tauxCompletion + '%',
                duree_moyenne: e.duree_moyenne ? Math.round(e.duree_moyenne) + ' jours' : 'N/A',
                respect_deadline: tauxRespectDeadline + '%',
                // Score de performance combiné
                score_performance: Math.round((tauxCompletion + tauxRespectDeadline) / 2)
            };
        });

        res.json({
            success: true,
            formule_utilisee: "performance = (tâches terminées / total tâches) × 100",
            performance_globale: {
                total_taches: global[0].total_taches,
                taches_terminees: global[0].taches_terminees,
                taux_reussite: performanceGlobale + '%',
                duree_moyenne: global[0].duree_moyenne 
                    ? Math.round(global[0].duree_moyenne) + ' jours' 
                    : 'N/A'
            },
            performances_individuelles: performances
        });

    } catch (error) {
        console.error("❌ Erreur getPerformanceEquipe:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== US4: CALCUL AUTOMATIQUE DE CHARGE =====================
// ✅ Formule: charge = nb tâches avec statut (à faire, en cours)
exports.calculerChargeAutomatique = async (req, res) => {
    try {
        console.log("⚡ US4: Calcul automatique de charge");

        // Seuil configurable (par défaut 5)
        const seuilSurcharge = req.query.seuil || 5;

        // Calculer la charge pour chaque employé
        const [charge] = await db.query(`
            SELECT 
                u.id,
                u.nom_complet,
                u.email,
                u.poste,
                -- ✅ FORMULE: charge = nb tâches avec statut (à faire, en cours)
                SUM(CASE 
                    WHEN t.statut IN ('a_faire', 'en_cours') AND t.deleted_at IS NULL 
                    THEN 1 ELSE 0 
                END) as charge_calculee,
                -- Détails
                SUM(CASE WHEN t.statut = 'a_faire' AND t.deleted_at IS NULL THEN 1 ELSE 0 END) as a_faire,
                SUM(CASE WHEN t.statut = 'en_cours' AND t.deleted_at IS NULL THEN 1 ELSE 0 END) as en_cours,
                SUM(CASE WHEN t.statut = 'termine' AND t.deleted_at IS NULL THEN 1 ELSE 0 END) as terminees,
                -- Alertes
                SUM(CASE 
                    WHEN t.statut IN ('a_faire', 'en_cours') 
                        AND t.date_echeance < CURDATE() 
                        AND t.deleted_at IS NULL 
                    THEN 1 ELSE 0 
                END) as en_retard
            FROM users u
            LEFT JOIN taches t ON u.id = t.assigne_a
            WHERE u.role = 'employe' AND u.deleted_at IS NULL AND u.status = 1
            GROUP BY u.id, u.nom_complet, u.email, u.poste
            ORDER BY charge_calculee DESC
        `);

        // Vérifier qui est en surcharge
        const resultats = charge.map(e => {
            const surcharge = e.charge_calculee >= seuilSurcharge;
            const risqueRetard = e.en_retard > 0;

            return {
                employe: {
                    id: e.id,
                    nom: e.nom_complet,
                    email: e.email,
                    poste: e.poste || "Non défini"
                },
                // ✅ Charge calculée
                charge: e.charge_calculee,
                details: {
                    a_faire: e.a_faire || 0,
                    en_cours: e.en_cours || 0,
                    terminees: e.terminees || 0,
                    en_retard: e.en_retard || 0
                },
                // Alertes automatiques
                est_en_surcharge: surcharge,
                a_des_retards: risqueRetard,
                message: surcharge 
                    ? `🔴 SURCHARGE: ${e.charge_calculee} tâches actives (seuil: ${seuilSurcharge})`
                    : risqueRetard
                    ? `🟡 ATTENTION: ${e.en_retard} tâche(s) en retard`
                    : `🟢 Charge normale: ${e.charge_calculee} tâches`,
                recommandation: surcharge
                    ? "Réaffecter des tâches à d'autres membres"
                    : risqueRetard
                    ? "Prioriser les tâches en retard"
                    : "OK"
            };
        });

        // Statistiques globales
        const stats = {
            total_employes: charge.length,
            en_surcharge: resultats.filter(r => r.est_en_surcharge).length,
            avec_retards: resultats.filter(r => r.a_des_retards).length,
            charge_moyenne: Math.round(
                resultats.reduce((acc, r) => acc + r.charge, 0) / (resultats.length || 1)
            ),
            seuil_utilise: seuilSurcharge
        };

        res.json({
            success: true,
            message: "✅ Calcul automatique de charge effectué",
            formule_utilisee: "charge = nombre de tâches avec statut (à faire, en cours)",
            date_calcul: new Date(),
            stats_globales: stats,
            analyse_charge: resultats
        });

    } catch (error) {
        console.error("❌ Erreur calculerChargeAutomatique:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== TABLEAU DE BORD ÉQUIPE =====================
exports.getTableauBordEquipe = async (req, res) => {
    try {
        console.log("📊 Tableau de bord équipe");

        // Récupérer toutes les données en une seule requête
        const [stats] = await db.query(`
            SELECT 
                -- Stats employés
                (SELECT COUNT(*) FROM users WHERE role = 'employe' AND deleted_at IS NULL AND status = 1) as total_employes,
                (SELECT COUNT(*) FROM users WHERE role = 'chef_projet' AND deleted_at IS NULL AND status = 1) as total_chefs,
                
                -- Stats tâches
                (SELECT COUNT(*) FROM taches WHERE deleted_at IS NULL) as total_taches,
                (SELECT COUNT(*) FROM taches WHERE statut = 'termine' AND deleted_at IS NULL) as taches_terminees,
                (SELECT COUNT(*) FROM taches WHERE statut IN ('a_faire', 'en_cours') AND deleted_at IS NULL) as taches_actives,
                
                -- Stats retard
                (SELECT COUNT(*) FROM taches WHERE statut != 'termine' AND date_echeance < CURDATE() AND deleted_at IS NULL) as taches_en_retard
        `);

        // Récupérer le top 5 des employés les plus productifs
        const [topEmployes] = await db.query(`
            SELECT 
                u.nom_complet,
                COUNT(t.id) as total_taches,
                SUM(CASE WHEN t.statut = 'termine' THEN 1 ELSE 0 END) as terminees
            FROM users u
            LEFT JOIN taches t ON u.id = t.assigne_a AND t.deleted_at IS NULL
            WHERE u.role = 'employe' AND u.deleted_at IS NULL
            GROUP BY u.id, u.nom_complet
            HAVING total_taches > 0
            ORDER BY terminees DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            resume: {
                employes_actifs: stats[0].total_employes,
                chefs_projet: stats[0].total_chefs,
                total_taches: stats[0].total_taches,
                taches_terminees: stats[0].taches_terminees,
                taches_en_cours: stats[0].taches_actives,
                taches_en_retard: stats[0].taches_en_retard,
                taux_completion: stats[0].total_taches > 0
                    ? Math.round((stats[0].taches_terminees / stats[0].total_taches) * 100) + '%'
                    : '0%'
            },
            top_performers: topEmployes
        });

    } catch (error) {
        console.error("❌ Erreur getTableauBordEquipe:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};