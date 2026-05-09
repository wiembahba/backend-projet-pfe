const db = require("../config/db");


// ===================== US1: VOIR LE NOMBRE DE PROJET PAR STATUT =====================
exports.getProjetsParStatut = async (req, res) => {
    try {
        console.log("📊 US1: Projets par statut pour user:", req.user.id, req.user.role);

        let whereClause = "";
        const params = [];

        // Seul le chef de projet voit ses projets
        if (req.user.role === 'chef_projet') {
            whereClause = "WHERE p.chef_projet_id = ? AND p.deleted_at IS NULL";
            params.push(req.user.id);
        } else {
            whereClause = "WHERE p.deleted_at IS NULL";
        }

        // ✅ Récupérer les détails des projets
        const [projets] = await db.query(`
            SELECT 
                p.id,
                p.nom_projet,
                p.statut,
                p.progression,
                p.date_fin_prevue,
                (
                    SELECT COUNT(*) 
                    FROM taches 
                    WHERE projet_id = p.id AND deleted_at IS NULL
                ) as nb_taches,
                (
                    SELECT COUNT(*) 
                    FROM taches 
                    WHERE projet_id = p.id AND statut = 'termine' AND deleted_at IS NULL
                ) as taches_terminees
            FROM projets p
            ${whereClause}
            ORDER BY p.created_at DESC
        `, params);

        console.log(`📊 ${projets.length} projets trouvés`);

        // Récupérer la répartition des projets par statut
        const stats = {};
        projets.forEach(p => {
            stats[p.statut] = (stats[p.statut] || 0) + 1;
        });

        const repartition = Object.keys(stats).map(statut => ({
            statut: statut,
            nombre: stats[statut],
            pourcentage: projets.length > 0 ? Math.round((stats[statut] / projets.length) * 100) : 0
        }));

        // Trier la répartition
        const order = { 'en_retard': 1, 'en_cours': 2, 'termine': 3 };
        repartition.sort((a, b) => (order[a.statut] || 4) - (order[b.statut] || 4));

        res.json({
            success: true,
            total_projets: projets.length,
            repartition: repartition,
            projets: projets  // ✅ AJOUTER les projets dans la réponse
        });

    } catch (error) {
        console.error("❌ Erreur US1:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur",
            error: error.message 
        });
    }
};

// ===================== US2: VISUALISATION DES INDICATEURS (KPI) =====================
exports.getIndicateursProjet = async (req, res) => {
    try {
        const projetId = req.params.projetId;
        
        console.log(`📊 US2: Indicateurs pour projet ${projetId}`);

        // Récupérer les données du projet
        const [projet] = await db.query(`
            SELECT 
                p.id,
                p.nom_projet,
                p.date_fin_prevue,
                (
                    SELECT COUNT(*) 
                    FROM taches 
                    WHERE projet_id = p.id AND deleted_at IS NULL
                ) as total_taches,
                (
                    SELECT COUNT(*) 
                    FROM taches 
                    WHERE projet_id = p.id AND statut = 'termine' AND deleted_at IS NULL
                ) as taches_terminees,
                (
                    SELECT COUNT(*) 
                    FROM taches 
                    WHERE projet_id = p.id AND statut != 'termine' AND deleted_at IS NULL
                ) as taches_non_terminees,
                (
                    SELECT COUNT(*) 
                    FROM taches 
                    WHERE projet_id = p.id AND statut != 'termine' AND date_echeance < CURDATE() AND deleted_at IS NULL
                ) as taches_en_retard
            FROM projets p
            WHERE p.id = ? AND p.deleted_at IS NULL
        `, [projetId]);

        if (projet.length === 0) {
            return res.status(404).json({ message: "Projet non trouvé" });
        }

        const p = projet[0];

        // ✅ FORMULE 1: Nombre de tâches terminées
        const nbTachesTerminees = p.taches_terminees || 0;
        
        // ✅ FORMULE 2: Nombre de tâches en retard
        const nbTachesEnRetard = p.taches_en_retard || 0;
        
        // ✅ FORMULE 3: L'avancement = (Nb tâches terminées / Nb tâches total) * 100
        const avancement = p.total_taches > 0 
            ? Math.round((p.taches_terminees / p.total_taches) * 100) 
            : 0;
        
        // ✅ FORMULE 4: Le respect de deadline
        const aujourdhui = new Date();
        const deadline = new Date(p.date_fin_prevue);
        const joursRestants = Math.ceil((deadline - aujourdhui) / (1000 * 60 * 60 * 24));
        
        let respectDeadline = "";
        if (avancement === 100) {
            respectDeadline = "✅ Projet terminé";
        } else if (joursRestants < 0) {
            respectDeadline = `⚠️ En retard de ${Math.abs(joursRestants)} jours`;
        } else if (joursRestants <= 7) {
            respectDeadline = `⏰ Deadline proche: ${joursRestants} jours restants`;
        } else {
            respectDeadline = `✅ Dans les délais: ${joursRestants} jours restants`;
        }

        // Cas limité: projet sans tâches
        if (p.total_taches === 0) {
            return res.json({
                success: true,
                message: "📋 Projet sans tâches",
                projet: p.nom_projet,
                indicateurs: {
                    nb_taches_terminees: 0,
                    nb_taches_en_retard: 0,
                    avancement: "0%",
                    respect_deadline: "Aucune tâche créée"
                }
            });
        }

        res.json({
            success: true,
            projet: p.nom_projet,
            indicateurs: {
                // ✅ TES indicateurs
                nb_taches_terminees: nbTachesTerminees,
                nb_taches_en_retard: nbTachesEnRetard,
                avancement: avancement + '%',
                respect_deadline: respectDeadline,
                // Détails supplémentaires
                total_taches: p.total_taches,
                taches_non_terminees: p.taches_non_terminees,
                jours_restants: joursRestants
            }
        });

    } catch (error) {
        console.error("❌ Erreur US2:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== US3: CHARGE DE TRAVAIL DE L'ÉQUIPE =====================
// ✅ Formule: Charge de l'employé = nombre de tâches assignées
exports.getChargeEquipe = async (req, res) => {
    try {
        console.log("📊 US3: Charge de travail équipe");

        // Récupérer tous les employés avec leur charge
        const [employes] = await db.query(`
            SELECT 
                u.id,
                u.nom_complet,
                u.email,
                COUNT(t.id) as charge_calculee,  -- ✅ TA formule: nombre de tâches assignées
                COUNT(CASE WHEN t.statut != 'termine' THEN 1 END) as taches_actives,
                COUNT(CASE WHEN t.statut = 'termine' THEN 1 END) as taches_terminees
            FROM users u
            LEFT JOIN taches t ON u.id = t.assigne_a AND t.deleted_at IS NULL
            WHERE u.role = 'employe' AND u.deleted_at IS NULL
            GROUP BY u.id, u.nom_complet, u.email
            ORDER BY charge_calculee DESC
        `);

        // Statistiques globales
        const stats = {
            total_employes: employes.length,
            employes_avec_charge: employes.filter(e => e.charge_calculee > 0).length,
            employes_sans_tache: employes.filter(e => e.charge_calculee === 0).length,
            charge_totale: employes.reduce((acc, e) => acc + e.charge_calculee, 0)
        };

        // Si aucun employé
        if (employes.length === 0) {
            return res.json({
                success: true,
                message: "👥 Aucun employé dans l'équipe",
                stats_globales: {
                    total_employes: 0,
                    employes_avec_charge: 0,
                    employes_sans_tache: 0
                },
                equipe: []
            });
        }

        res.json({
            success: true,
            message: "📊 Charge de travail par employé",
            stats_globales: stats,
            equipe: employes.map(e => ({
                id: e.id,
                nom: e.nom_complet,
                email: e.email,
                // ✅ TA formule: charge = nombre de tâches assignées
                charge: e.charge_calculee,
                details: {
                    taches_actives: e.taches_actives || 0,
                    taches_terminees: e.taches_terminees || 0
                },
                // Statut basé sur la charge
                statut: e.charge_calculee === 0 ? "🟢 Disponible" :
                        e.charge_calculee <= 3 ? "🟡 Charge légère" :
                        e.charge_calculee <= 5 ? "🟠 Charge modérée" :
                        "🔴 Surchargé"
            }))
        });

    } catch (error) {
        console.error("❌ Erreur US3:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== US4: TÂCHES RISQUÉES =====================
// ✅ Formule: Score de risque = ((1 - %avancement) * 100) / jour restant
exports.getTachesRisquees = async (req, res) => {
    try {
        console.log("📊 US4: Tâches risquées pour chef ID:", req.user.id);
        const userId = req.user.id;
        const userRole = req.user.role;

        let whereClause = `
            WHERE t.deleted_at IS NULL 
            AND t.statut != 'termine'
        `;

        let params = [];

        // ✅ Si chef projet → voir uniquement les tâches de SES projets
        if (userRole === 'chef_projet') {
            whereClause += ` AND p.chef_projet_id = ?`;
            params.push(userId);
            console.log(`🔍 Filtrage pour chef ID: ${userId}`);
        }

        // ✅ CORRECTION: Utiliser whereClause dans la requête !
        const [taches] = await db.query(`
            SELECT 
                t.id,
                t.titre,
                t.description,
                t.progression,
                t.priorite,
                t.date_echeance,
                p.nom_projet,
                u.nom_complet as assigne_nom,
                DATEDIFF(t.date_echeance, CURDATE()) as jours_restants
            FROM taches t
            JOIN projets p ON t.projet_id = p.id
            LEFT JOIN users u ON t.assigne_a = u.id
            ${whereClause}  -- ← ICI: ajouter le whereClause
            ORDER BY 
                CASE 
                    WHEN t.date_echeance < CURDATE() THEN 1
                    ELSE 2
                END,
                t.date_echeance ASC
        `, params);

        console.log(`📊 ${taches.length} tâches trouvées pour le chef ${userId}`);

        // Si aucune tâche
        if (taches.length === 0) {
            return res.json({
                success: true,
                message: "✅ Aucune tâche à risque",
                total_risquees: 0,
                taches_risquees: []
            });
        }

        // ✅ Calculer le score de risque pour chaque tâche
        const tachesAvecRisque = taches.map(t => {
            let scoreRisque = 0;
            let niveauRisque = "faible";
            
            if (t.jours_restants > 0) {
                scoreRisque = Math.round(((100 - t.progression) / t.jours_restants) * 10) / 10;
            } else if (t.jours_restants <= 0) {
                scoreRisque = 100;
            }

            // Déterminer le niveau de risque
            if (t.jours_restants < 0) {
                niveauRisque = "critique";
            } else if (scoreRisque >= 30) {
                niveauRisque = "élevé";
            } else if (scoreRisque >= 15) {
                niveauRisque = "moyen";
            } else if (scoreRisque > 0) {
                niveauRisque = "faible";
            }

            // Déterminer la cause du risque
            let cause = "";
            if (t.jours_restants < 0) {
                cause = "⏰ Deadline dépassée";
            } else if (t.progression < 20) {
                cause = "📉 Progression très faible";
            } else if (t.jours_restants <= 3) {
                cause = "⚡ Deadline imminente";
            } else if (t.progression < 50 && t.jours_restants <= 7) {
                cause = "📊 Risque de retard";
            } else {
                cause = "✅ Sous contrôle";
            }

            return {
                id: t.id,
                titre: t.titre,
                projet: t.nom_projet,
                assigne: t.assigne_nom || "Non assigné",
                progression: t.progression + '%',
                jours_restants: t.jours_restants,
                score_risque: scoreRisque,
                niveau_risque: niveauRisque,
                cause: cause,
                priorite: t.priorite
            };
        });

        // Filtrer pour garder seulement les tâches risquées (score > 0)
        const tachesRisquees = tachesAvecRisque.filter(t => t.score_risque > 0);
        
        // Trier par niveau de risque
        tachesRisquees.sort((a, b) => {
            const ordre = { 'critique': 1, 'élevé': 2, 'moyen': 3, 'faible': 4 };
            return (ordre[a.niveau_risque] || 5) - (ordre[b.niveau_risque] || 5);
        });

        // Statistiques
        const stats = {
            total_risquees: tachesRisquees.length,
            critique: tachesRisquees.filter(t => t.niveau_risque === 'critique').length,
            eleve: tachesRisquees.filter(t => t.niveau_risque === 'élevé').length,
            moyen: tachesRisquees.filter(t => t.niveau_risque === 'moyen').length,
            faible: tachesRisquees.filter(t => t.niveau_risque === 'faible').length
        };

        console.log(`✅ ${stats.total_risquees} tâches risquées trouvées pour le chef ${userId}`);

        res.json({
            success: true,
            message: stats.total_risquees > 0 
                ? `⚠️ ${stats.total_risquees} tâche(s) à risque détectée(s)` 
                : "✅ Aucune tâche à risque",
            formule_utilisee: "Score = ((1 - %avancement) × 100) / jours restants",
            stats_risques: stats,
            taches_risquees: tachesRisquees
        });

    } catch (error) {
        console.error("❌ Erreur US4:", error);
        res.status(500).json({ 
            success: false,
            message: "Erreur serveur",
            error: error.message 
        });
    }
};

// ===================== US5: VUE GLOBALE ADMIN =====================
exports.getVueGlobaleAdmin = async (req, res) => {
    try {
        console.log("📊 US5: Vue globale admin");

        // Vérifier que c'est bien un admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Accès réservé à l'administrateur" });
        }

        // 1. Statistiques utilisateurs
        const [users] = await db.query(`
            SELECT 
                COUNT(*) as total_utilisateurs,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
                SUM(CASE WHEN role = 'chef_projet' THEN 1 ELSE 0 END) as chefs_projet,
                SUM(CASE WHEN role = 'employe' THEN 1 ELSE 0 END) as employes,
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as actifs
            FROM users
            WHERE deleted_at IS NULL
        `);

        // 2. Statistiques projets
        const [projets] = await db.query(`
            SELECT 
                COUNT(*) as total_projets,
                SUM(CASE WHEN statut = 'en_cours' THEN 1 ELSE 0 END) as en_cours,
                SUM(CASE WHEN statut = 'termine' THEN 1 ELSE 0 END) as termines,
                SUM(CASE WHEN statut = 'en_retard' THEN 1 ELSE 0 END) as en_retard
            FROM projets
            WHERE deleted_at IS NULL
        `);

        // 3. Statistiques tâches
        const [taches] = await db.query(`
            SELECT 
                COUNT(*) as total_taches,
                SUM(CASE WHEN statut = 'termine' THEN 1 ELSE 0 END) as terminees,
                SUM(CASE WHEN statut != 'termine' AND date_echeance < CURDATE() THEN 1 ELSE 0 END) as en_retard,
                ROUND(AVG(progression), 2) as progression_moyenne
            FROM taches
            WHERE deleted_at IS NULL
        `);

        // 4. Activité récente (30 derniers jours)
        const [activite] = await db.query(`
            SELECT 
                DATE(last_login) as date,
                COUNT(*) as connexions
            FROM users
            WHERE last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND last_login IS NOT NULL
            GROUP BY DATE(last_login)
            ORDER BY date DESC
        `);

        res.json({
            success: true,
            message: "📈 Vue globale du système",
            statistiques: {
                utilisateurs: {
                    total: Number(users[0].total_utilisateurs),
    admins: Number(users[0].admins),
    chefs_projet: Number(users[0].chefs_projet),
    employes: Number(users[0].employes),
    actifs: Number(users[0].actifs)
                },
                projets: {
                    total: projets[0].total_projets,
                    en_cours: projets[0].en_cours,
                    termines: projets[0].termines,
                    en_retard: projets[0].en_retard
                },
                taches: {
                    total: taches[0].total_taches,
                    terminees: taches[0].terminees,
                    en_retard: taches[0].en_retard,
                    progression_moyenne: taches[0].progression_moyenne + '%'
                }
            },
            activite_recente: activite,
            date_generation: new Date()
        });

    } catch (error) {
        console.error("❌ Erreur US5:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};