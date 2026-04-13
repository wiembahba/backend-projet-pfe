// services/tools/index.js
const pool = require('../../config/db');

// Tool 1: Récupérer tous les projets
const getAllProjectsTool = {
    name: "getAllProjectsTool",
    description: "Récupère la liste complète de tous les projets avec leurs détails (avancement, statut, chef)",
    func: async () => {
        const [projets] = await pool.query(`
            SELECT p.id, p.nom_projet, p.progression, p.statut, p.priorite, p.date_fin_prevue,
                   u.nom_complet as chef_nom, u.id as chef_id
            FROM projets p
            LEFT JOIN users u ON p.chef_projet_id = u.id
            WHERE p.deleted_at IS NULL
            ORDER BY p.created_at DESC
        `);
        return projets;
    }
};

// Tool 2: Charge des employés
const getAllEmployeeLoadTool = {
    name: "getAllEmployeeLoadTool",
    description: "Récupère la charge de travail de chaque employé (nombre de tâches actives, terminées, en retard)",
    func: async () => {
        const [employes] = await pool.query(`
            SELECT u.id, u.nom_complet,
                   COUNT(CASE WHEN t.statut IN ('a_faire', 'en_cours') THEN 1 END) as taches_actives,
                   COUNT(CASE WHEN t.statut = 'termine' THEN 1 END) as taches_terminees,
                   COUNT(CASE WHEN t.date_echeance < CURDATE() AND t.statut != 'termine' THEN 1 END) as taches_retard
            FROM users u
            LEFT JOIN taches t ON u.id = t.assigne_a AND t.deleted_at IS NULL
            WHERE u.role = 'employe' AND u.deleted_at IS NULL
            GROUP BY u.id
        `);
        return employes;
    }
};

// Tool 3: Tâches en retard
const getLateTasksTool = {
    name: "getLateTasksTool",
    description: "Liste toutes les tâches qui ont dépassé leur deadline",
    func: async () => {
        const [taches] = await pool.query(`
            SELECT t.id, t.titre, t.progression, t.date_echeance,
                   DATEDIFF(CURDATE(), t.date_echeance) as jours_retard,
                   p.nom_projet, u.nom_complet as assigne_nom
            FROM taches t
            JOIN projets p ON t.projet_id = p.id
            LEFT JOIN users u ON t.assigne_a = u.id
            WHERE t.date_echeance < CURDATE() AND t.statut != 'termine'
            ORDER BY jours_retard DESC
        `);
        return taches;
    }
};

// Tool 4: Analyse des risques
const getRiskAnalysisTool = {
    name: "getRiskAnalysisTool",
    description: "Analyse les risques de retard pour tous les projets avec un score",
    func: async () => {
        const [projets] = await pool.query(`
            SELECT p.id, p.nom_projet, p.progression,
                   DATEDIFF(p.date_fin_prevue, CURDATE()) as jours_restants,
                   ROUND(((100 - p.progression) / GREATEST(DATEDIFF(p.date_fin_prevue, CURDATE()), 1)) * 10, 2) as score_risque
            FROM projets p
            WHERE p.statut != 'termine' AND p.deleted_at IS NULL
        `);
        return projets;
    }
};

// Tool 5: Détails d'un projet
const getProjectDetailsTool = {
    name: "getProjectDetailsTool",
    description: "Récupère les détails complets d'un projet spécifique (nom du projet en paramètre)",
    schema: {
        type: "object",
        properties: {
            project_name: { type: "string", description: "Nom du projet" }
        },
        required: ["project_name"]
    },
    func: async ({ project_name }) => {
        const [projets] = await pool.query(`
            SELECT p.*, u.nom_complet as chef_nom,
                   COUNT(t.id) as total_taches,
                   SUM(CASE WHEN t.statut = 'termine' THEN 1 END) as taches_terminees
            FROM projets p
            LEFT JOIN taches t ON p.id = t.projet_id
            LEFT JOIN users u ON p.chef_projet_id = u.id
            WHERE p.nom_projet LIKE ? AND p.deleted_at IS NULL
            GROUP BY p.id
        `, [`%${project_name}%`]);
        return projets[0] || null;
    }
};

// Tool 6: Tâches d'un employé
const getEmployeeTasksTool = {
    name: "getEmployeeTasksTool",
    description: "Récupère toutes les tâches assignées à un employé spécifique (nom de l'employé en paramètre)",
    schema: {
        type: "object",
        properties: {
            employee_name: { type: "string", description: "Nom de l'employé" }
        },
        required: ["employee_name"]
    },
    func: async ({ employee_name }) => {
        const [employes] = await pool.query(`
            SELECT id FROM users WHERE nom_complet LIKE ? AND role = 'employe'
        `, [`%${employee_name}%`]);
        
        if (employes.length === 0) return [];
        
        const [taches] = await pool.query(`
            SELECT t.*, p.nom_projet
            FROM taches t
            JOIN projets p ON t.projet_id = p.id
            WHERE t.assigne_a = ?
        `, [employes[0].id]);
        
        return taches;
    }
};
// ✅ Admin — بحث employé بالاسم
const getEmployeeByNameTool = {
    name: "get_employee_by_name",
    func: async ({ name }) => query(
        `SELECT u.id, u.nom_complet, u.poste, u.departement,
                COUNT(t.id) as total_taches,
                SUM(CASE WHEN t.statut='termine' THEN 1 ELSE 0 END) as terminees,
                SUM(CASE WHEN t.statut='en_cours' THEN 1 ELSE 0 END) as en_cours,
                SUM(CASE WHEN t.statut='a_faire' THEN 1 ELSE 0 END) as a_faire,
                SUM(CASE WHEN t.date_echeance < CURDATE() AND t.statut!='termine' THEN 1 ELSE 0 END) as en_retard
         FROM users u
         LEFT JOIN taches t ON t.assigne_a = u.id AND t.deleted_at IS NULL
         WHERE u.deleted_at IS NULL 
           AND u.nom_complet LIKE ?
         GROUP BY u.id`,
        [`%${name}%`]
    )
};

const getTasksByNameTool = {
    name: "get_tasks_by_name", 
    func: async ({ name }) => query(
        `SELECT t.titre, t.statut, t.priorite, t.progression,
                t.date_echeance, p.nom_projet,
                DATEDIFF(CURDATE(), t.date_echeance) as jours_retard
         FROM taches t
         LEFT JOIN projets p ON t.projet_id = p.id
         LEFT JOIN users u ON t.assigne_a = u.id
         WHERE u.nom_complet LIKE ? AND t.deleted_at IS NULL
         ORDER BY t.date_echeance ASC`,
        [`%${name}%`]
    )
};

module.exports = {
    getAllProjectsTool,
    getAllEmployeeLoadTool,
    getLateTasksTool,
    getRiskAnalysisTool,
    getProjectDetailsTool,
    getTasksByNameTool,
    getEmployeeByNameTool,
    getEmployeeTasksTool
};