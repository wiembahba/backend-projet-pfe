const db = require("../config/db");

// ===================== US1: ANALYSE TAUX D'AVANCEMENT =====================
exports.analyserTauxAvancement = async (req, res) => {
    try {
        const projetId = req.params.projetId;
        
        console.log(`🔮 Analyse taux d'avancement - Projet ${projetId} pour chef ${req.user.id}`);

        // ✅ Vérifier que le projet appartient au chef connecté
        const [projet] = await db.query(`
            SELECT 
                p.id,
                p.nom_projet,
                p.date_fin_prevue,
                p.chef_projet_id,
                (
                    SELECT COUNT(*) 
                    FROM taches 
                    WHERE projet_id = p.id AND deleted_at IS NULL
                ) as total_taches,
                (
                    SELECT COUNT(*) 
                    FROM taches 
                    WHERE projet_id = p.id AND statut = 'termine' AND deleted_at IS NULL
                ) as taches_terminees
            FROM projets p
            WHERE p.id = ? AND p.deleted_at IS NULL
        `, [projetId]);

        if (projet.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Projet non trouvé" 
            });
        }

        const p = projet[0];

        // ✅ Vérifier les droits (chef ou admin)
        if (req.user.role !== 'admin' && p.chef_projet_id !== req.user.id) {
            return res.status(403).json({ 
                success: false,
                message: "Vous n'êtes pas autorisé à voir ce projet" 
            });
        }
        
        // FORMULES
        const avancement = p.total_taches > 0 
            ? Math.round((p.taches_terminees / p.total_taches) * 100) 
            : 0;
        
        const aujourdhui = new Date();
        const deadline = new Date(p.date_fin_prevue);
        const joursRestants = Math.ceil((deadline - aujourdhui) / (1000 * 60 * 60 * 24));
        
        const charge = p.total_taches - p.taches_terminees;
        
        let scoreRisque = 0;
        if (joursRestants > 0 && avancement < 100) {
            scoreRisque = Math.round(((1 - (avancement/100)) * 100) / joursRestants);
        } else if (joursRestants <= 0 && avancement < 100) {
            scoreRisque = 100;
        }

        let niveauRisque = "faible";
        let recommandation = "";
        
        if (scoreRisque >= 50) {
            niveauRisque = "critique";
            recommandation = "🔴 RISQUE CRITIQUE: Action immédiate requise!";
        } else if (scoreRisque >= 30) {
            niveauRisque = "élevé";
            recommandation = "🟠 RISQUE ÉLEVÉ: Réunion d'urgence nécessaire";
        } else if (scoreRisque >= 15) {
            niveauRisque = "moyen";
            recommandation = "🟡 Risque moyen: Surveiller de près";
        } else if (scoreRisque > 0) {
            niveauRisque = "faible";
            recommandation = "🟢 Risque faible: Continuer normalement";
        } else {
            recommandation = "✅ Aucun risque détecté";
        }

        if (joursRestants < 0 && avancement < 100) {
            recommandation = "⚠️ URGENT: Deadline dépassée! " + recommandation;
        }

        res.json({
            success: true,
            projet: {
                id: p.id,
                nom: p.nom_projet,
                avancement: avancement + '%',
                jours_restants: joursRestants,
                charge: charge + ' tâches en cours',
                score_risque: scoreRisque,
                niveau_risque: niveauRisque,
                recommandation: recommandation,
                taches: {
                    total: p.total_taches,
                    terminees: p.taches_terminees,
                    non_terminees: charge
                }
            }
        });

    } catch (error) {
        console.error("❌ Erreur analyserTauxAvancement:", error);
        res.status(500).json({ 
            success: false,
            message: "Erreur serveur" 
        });
    }
};

// ===================== US2: ANALYSE TEMPS RESTANT =====================
exports.analyserTempsRestant = async (req, res) => {
    try {
        const projetId = req.params.projetId;
        
        console.log(`⏰ Analyse temps restant - Projet ${projetId} pour chef ${req.user.id}`);

        // ✅ Vérifier que le projet appartient au chef
        const [projetCheck] = await db.query(`
            SELECT chef_projet_id FROM projets WHERE id = ? AND deleted_at IS NULL
        `, [projetId]);

        if (projetCheck.length === 0) {
            return res.status(404).json({ success: false, message: "Projet non trouvé" });
        }

        if (req.user.role !== 'admin' && projetCheck[0].chef_projet_id !== req.user.id) {
            return res.status(403).json({ success: false, message: "Accès non autorisé" });
        }

        const [taches] = await db.query(`
            SELECT 
                t.id,
                t.titre,
                t.progression,
                t.date_echeance,
                t.priorite,
                t.statut,
                u.nom_complet as assigne_nom,
                DATEDIFF(t.date_echeance, CURDATE()) as jours_restants,
                CASE 
                    WHEN t.statut = 'termine' THEN 0
                    ELSE ROUND(((100 - t.progression) / GREATEST(DATEDIFF(t.date_echeance, CURDATE()), 1)), 2)
                END as score_risque_individuel
            FROM taches t
            LEFT JOIN users u ON t.assigne_a = u.id
            WHERE t.projet_id = ? AND t.deleted_at IS NULL
            ORDER BY jours_restants ASC
        `, [projetId]);

        const stats = {
            total_taches: taches.length,
            depassees: taches.filter(t => t.jours_restants < 0 && t.statut !== 'termine').length,
            urgentes: taches.filter(t => t.jours_restants <= 2 && t.jours_restants >= 0 && t.statut !== 'termine').length,
            terminees: taches.filter(t => t.statut === 'termine').length
        };

        const scores = taches.map(t => t.score_risque_individuel || 0);
        const scoreGlobal = scores.length > 0 
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
            : 0;

        res.json({
            success: true,
            projet_id: projetId,
            analyse_temporelle: {
                stats: stats,
                score_risque_global: scoreGlobal,
                alerte: stats.depassees > 0 ? `⚠️ ${stats.depassees} tâches ont dépassé leur deadline!` : "✅ Dans les temps"
            },
            taches: taches
        });

    } catch (error) {
        console.error("❌ Erreur analyserTempsRestant:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== US3: ANALYSE CHARGE DE TRAVAIL =====================
exports.analyserChargeTravail = async (req, res) => {
    try {
        const projetId = req.params.projetId;
        
        console.log(`👥 Analyse charge de travail - Projet ${projetId} pour chef ${req.user.id}`);

        // ✅ Vérifier que le projet appartient au chef
        const [projetCheck] = await db.query(`
            SELECT chef_projet_id FROM projets WHERE id = ? AND deleted_at IS NULL
        `, [projetId]);

        if (projetCheck.length === 0) {
            return res.status(404).json({ success: false, message: "Projet non trouvé" });
        }

        if (req.user.role !== 'admin' && projetCheck[0].chef_projet_id !== req.user.id) {
            return res.status(403).json({ success: false, message: "Accès non autorisé" });
        }

        const [chargeEmployes] = await db.query(`
            SELECT 
                u.id,
                u.nom_complet,
                u.email,
                COUNT(DISTINCT t.id) as total_taches_assignees,
                SUM(CASE WHEN t.statut != 'termine' THEN 1 ELSE 0 END) as charge_calculee,
                SUM(CASE WHEN t.statut = 'termine' THEN 1 ELSE 0 END) as taches_terminees
            FROM users u
            LEFT JOIN taches t ON u.id = t.assigne_a AND t.projet_id = ? AND t.deleted_at IS NULL
            WHERE u.role = 'employe' AND u.deleted_at IS NULL
            GROUP BY u.id, u.nom_complet, u.email
            ORDER BY charge_calculee DESC
        `, [projetId]);

        const statsGlobales = {
            total_employes: chargeEmployes.length,
            charge_totale_projet: chargeEmployes.reduce((acc, e) => acc + e.charge_calculee, 0),
            en_surcharge: chargeEmployes.filter(e => e.charge_calculee >= 5).length,
            charge_moderee: chargeEmployes.filter(e => e.charge_calculee >= 3 && e.charge_calculee < 5).length,
            disponibles: chargeEmployes.filter(e => e.charge_calculee < 3).length
        };

        res.json({
            success: true,
            projet_id: projetId,
            stats_globales: statsGlobales,
            analyse_charge: chargeEmployes.map(e => ({
                id: e.id,
                nom: e.nom_complet,
                charge: e.charge_calculee,
                taches_actives: e.charge_calculee,
                taches_terminees: e.taches_terminees,
                statut: e.charge_calculee >= 5 ? "Surchargé" : 
                        e.charge_calculee >= 3 ? "Charge modérée" : "Disponible"
            })),
            recommandation: chargeEmployes.filter(e => e.charge_calculee >= 5).length > 0 
                ? "⚠️ Rééquilibrer la charge de travail"
                : "✅ Charge équilibrée"
        });

    } catch (error) {
        console.error("❌ Erreur analyserChargeTravail:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ===================== US4: CLASSIFICATION DES TÂCHES PAR RISQUE =====================
exports.classifierTachesParRisque = async (req, res) => {
    try {
        const projetId = req.params.projetId;
        
        console.log(`📊 Classification des tâches par risque - Projet ${projetId} pour chef ${req.user.id}`);

        // ✅ Vérifier que le projet appartient au chef
        const [projetCheck] = await db.query(`
            SELECT chef_projet_id FROM projets WHERE id = ? AND deleted_at IS NULL
        `, [projetId]);

        if (projetCheck.length === 0) {
            return res.status(404).json({ success: false, message: "Projet non trouvé" });
        }

        if (req.user.role !== 'admin' && projetCheck[0].chef_projet_id !== req.user.id) {
            return res.status(403).json({ success: false, message: "Accès non autorisé" });
        }

        const [taches] = await db.query(`
            SELECT 
                t.id,
                t.titre,
                t.description,
                t.progression,
                t.priorite,
                t.date_echeance,
                t.statut,
                u.nom_complet as assigne_nom,
                DATEDIFF(t.date_echeance, CURDATE()) as jours_restants,
                p.nom_projet as projet_nom,
                CASE 
                    WHEN t.statut = 'termine' THEN 0
                    WHEN DATEDIFF(t.date_echeance, CURDATE()) <= 0 AND t.progression < 100 THEN 100
                    ELSE ROUND(((100 - t.progression) / GREATEST(DATEDIFF(t.date_echeance, CURDATE()), 1)), 2)
                END as score_risque,
                CASE 
                    WHEN t.statut = 'termine' THEN 'termine'
                    WHEN ((100 - t.progression) / GREATEST(DATEDIFF(t.date_echeance, CURDATE()), 1)) >= 70 THEN 'critique'
                    WHEN ((100 - t.progression) / GREATEST(DATEDIFF(t.date_echeance, CURDATE()), 1)) >= 50 THEN 'élevé'
                    WHEN ((100 - t.progression) / GREATEST(DATEDIFF(t.date_echeance, CURDATE()), 1)) >= 30 THEN 'moyen'
                    WHEN ((100 - t.progression) / GREATEST(DATEDIFF(t.date_echeance, CURDATE()), 1)) > 0 THEN 'faible'
                    ELSE 'normal'
                END as niveau_risque,
                CASE 
                    WHEN t.date_echeance < CURDATE() AND t.progression < 100 THEN '⏰ DÉPASSEMENT DE DEADLINE'
                    WHEN t.progression < 20 AND DATEDIFF(t.date_echeance, CURDATE()) > 0 THEN '📉 PROGRESSION TRÈS FAIBLE'
                    WHEN DATEDIFF(t.date_echeance, CURDATE()) <= 2 AND t.progression < 50 THEN '⚡ DEADLINE IMMINENTE'
                    ELSE '📊 Dans les délais'
                END as cause_risque
            FROM taches t
            LEFT JOIN users u ON t.assigne_a = u.id
            LEFT JOIN projets p ON t.projet_id = p.id
            WHERE t.projet_id = ? AND t.deleted_at IS NULL
            ORDER BY score_risque DESC
        `, [projetId]);

        console.log(`📊 ${taches.length} tâches trouvées pour le projet ${projetId}`);

        const stats = {
            total_taches: taches.length,
            critique: taches.filter(t => t.niveau_risque === 'critique').length,
            eleve: taches.filter(t => t.niveau_risque === 'élevé').length,
            moyen: taches.filter(t => t.niveau_risque === 'moyen').length,
            faible: taches.filter(t => t.niveau_risque === 'faible').length,
            normal: taches.filter(t => t.niveau_risque === 'normal').length,
            termine: taches.filter(t => t.niveau_risque === 'termine').length
        };

        res.json({
            success: true,
            projet_id: projetId,
            resume_risques: stats,
            taches_classees: taches,
            priorite_action: taches
                .filter(t => t.niveau_risque === 'critique' || t.niveau_risque === 'élevé')
                .map(t => ({
                    id: t.id,
                    titre: t.titre,
                    assigne: t.assigne_nom,
                    risque: t.niveau_risque,
                    score: t.score_risque,
                    cause: t.cause_risque
                }))
        });

    } catch (error) {
        console.error("❌ Erreur classifierTachesParRisque:", error);
        res.status(500).json({ 
            success: false,
            message: "Erreur serveur lors de la classification" 
        });
    }
};

// ===================== ANALYSE GLOBALE =====================
exports.analyseGlobaleRisques = async (req, res) => {
    try {
        const projetId = req.params.projetId;
        
        console.log(`📈 Analyse globale des risques - Projet ${projetId} pour chef ${req.user.id}`);

        // ✅ Vérifier que le projet appartient au chef
        const [projet] = await db.query(`
            SELECT 
                p.id,
                p.nom_projet,
                p.date_fin_prevue,
                p.chef_projet_id,
                (
                    SELECT COUNT(*) 
                    FROM taches 
                    WHERE projet_id = p.id AND deleted_at IS NULL
                ) as total_taches,
                (
                    SELECT COUNT(*) 
                    FROM taches 
                    WHERE projet_id = p.id AND statut = 'termine' AND deleted_at IS NULL
                ) as taches_terminees
            FROM projets p
            WHERE p.id = ? AND p.deleted_at IS NULL
        `, [projetId]);

        if (projet.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Projet non trouvé" 
            });
        }

        const p = projet[0];

        if (req.user.role !== 'admin' && p.chef_projet_id !== req.user.id) {
            return res.status(403).json({ 
                success: false,
                message: "Accès non autorisé" 
            });
        }
        
        const avancement = p.total_taches > 0 
            ? Math.round((p.taches_terminees / p.total_taches) * 100) 
            : 0;
        
        const joursRestants = Math.ceil((new Date(p.date_fin_prevue) - new Date()) / (1000 * 60 * 60 * 24));
        const charge = p.total_taches - p.taches_terminees;
        
        let scoreRisque = 0;
        if (joursRestants > 0 && avancement < 100) {
            scoreRisque = Math.round(((1 - (avancement/100)) * 100) / joursRestants);
        } else if (joursRestants <= 0 && avancement < 100) {
            scoreRisque = 100;
        }

        let niveauGlobal = "faible";
        if (scoreRisque >= 70) niveauGlobal = "critique";
        else if (scoreRisque >= 50) niveauGlobal = "élevé";
        else if (scoreRisque >= 30) niveauGlobal = "moyen";

        res.json({
            success: true,
            projet: p.nom_projet,
            resultats: {
                avancement: avancement + '%',
                jours_restants: joursRestants,
                charge: charge,
                score_risque: scoreRisque,
                niveau_risque: niveauGlobal
            },
            recommandation: niveauGlobal === "critique" 
                ? "🔴 ACTION IMMÉDIATE REQUISE!"
                : niveauGlobal === "élevé"
                ? "🟠 Surveiller de près"
                : niveauGlobal === "moyen"
                ? "🟡 Restez vigilant"
                : "🟢 Projet sous contrôle"
        });

    } catch (error) {
        console.error("❌ Erreur analyseGlobaleRisques:", error);
        res.status(500).json({ 
            success: false,
            message: "Erreur serveur" 
        });
    }
};