// services/ragService.js
const db = require('../config/db');
const { addDocuments, searchSimilar } = require('../config/chroma');
const { Document } = require('@langchain/core/documents');

// ✅ Helper query compatible mysql2
const query = (sql, params = []) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
        if (err) reject(err);
        else resolve(result);
    });
});

const initializeRAG = async () => {
    try {
        console.log("🔄 Initialisation RAG...");
        const documents = [];

        // 1. Projets
        const projets = await query(`
            SELECT p.id, p.nom_projet, p.description, p.statut, 
                   p.progression, p.priorite, p.date_fin_prevue,
                   u.nom_complet as chef_projet
            FROM projets p
            LEFT JOIN users u ON p.chef_projet_id = u.id
            WHERE p.deleted_at IS NULL
        `);

        projets.forEach(p => documents.push(new Document({
            pageContent: `
                Projet: ${p.nom_projet}
                Description: ${p.description || 'Aucune description'}
                Statut: ${p.statut} | Priorité: ${p.priorite}
                Avancement: ${p.progression}%
                Chef de projet: ${p.chef_projet}
                Deadline: ${p.date_fin_prevue}
            `.trim(),
            metadata: { id: p.id, type: 'projet', nom: p.nom_projet }
        })));

        // 2. Tâches
        const taches = await query(`
            SELECT t.id, t.titre, t.description, t.statut, t.priorite,
                   t.progression, t.date_echeance,
                   p.nom_projet,
                   u.nom_complet as assigne_a
            FROM taches t
            LEFT JOIN projets p ON t.projet_id = p.id
            LEFT JOIN users u ON t.assigne_a = u.id
            WHERE t.deleted_at IS NULL
        `);

        taches.forEach(t => documents.push(new Document({
            pageContent: `
                Tâche: ${t.titre}
                Description: ${t.description || 'Aucune description'}
                Projet: ${t.nom_projet}
                Assignée à: ${t.assigne_a}
                Statut: ${t.statut} | Priorité: ${t.priorite}
                Avancement: ${t.progression}%
                Deadline: ${t.date_echeance}
            `.trim(),
            metadata: { id: t.id, type: 'tache', titre: t.titre }
        })));

        // 3. Employés
        const employes = await query(`
            SELECT u.id, u.nom_complet, u.poste, u.departement,
                   COUNT(t.id) as nb_taches,
                   SUM(CASE WHEN t.statut='en_cours' THEN 1 ELSE 0 END) as en_cours,
                   SUM(CASE WHEN t.date_echeance < CURDATE() AND t.statut!='termine' THEN 1 ELSE 0 END) as en_retard
            FROM users u
            LEFT JOIN taches t ON t.assigne_a = u.id AND t.deleted_at IS NULL
            WHERE u.role = 'employe' AND u.deleted_at IS NULL
            GROUP BY u.id
        `);

        employes.forEach(e => documents.push(new Document({
            pageContent: `
                Employé: ${e.nom_complet}
                Poste: ${e.poste || 'Non défini'} | Département: ${e.departement || 'Non défini'}
                Tâches totales: ${e.nb_taches}
                En cours: ${e.en_cours} | En retard: ${e.en_retard}
            `.trim(),
            metadata: { id: e.id, type: 'employe', nom: e.nom_complet }
        })));

        // 4. Knowledge base technique
        const techDocs = [
            { titre: "Git", content: "Git est un système de contrôle de version. Commandes: git clone, git commit -m 'message', git push, git pull, git branch, git merge, git status, git log" },
            { titre: "Docker", content: "Docker permet de containeriser les applications. Commandes: docker build, docker run, docker ps, docker stop, docker-compose up, docker images" },
            { titre: "React", content: "React est une bibliothèque JavaScript pour les interfaces. Concepts: composants, hooks (useState, useEffect), props, state, JSX, Context API" },
            { titre: "Node.js", content: "Node.js est un runtime JavaScript. Modules: express, fs, path, http. Commandes: npm install, npm start, npm run dev" },
            { titre: "MySQL", content: "MySQL est une base de données relationnelle. Commandes: SELECT, INSERT, UPDATE, DELETE, JOIN, GROUP BY, ORDER BY" },
            { titre: "API REST", content: "API REST utilise HTTP. Méthodes: GET (lire), POST (créer), PUT (modifier), DELETE (supprimer). Status codes: 200, 201, 400, 401, 404, 500" },
        ];

        techDocs.forEach(t => documents.push(new Document({
            pageContent: `Technologie: ${t.titre}\n${t.content}`,
            metadata: { type: 'technique', sujet: t.titre }
        })));

        if (documents.length > 0) {
            await addDocuments(documents);
            console.log(`✅ ${documents.length} documents indexés dans ChromaDB`);
        }

    } catch (error) {
        console.error("❌ Erreur RAG init:", error.message);
        console.log("⚠️ RAG désactivé");
    }
};

// ✅ Recherche sémantique avec filtre role
const semanticSearch = async (query_text, role, userId, k = 4) => {
    try {
        const results = await searchSimilar(query_text, k * 2);
        
        // Filtre selon le role
        return results.filter(r => {
            const type = r.metadata?.type;
            if (role === 'admin') return true;
            if (role === 'chef_projet') return ['projet', 'tache', 'employe', 'technique'].includes(type);
            if (role === 'employe') return ['technique', 'tache'].includes(type);
            return true;
        }).slice(0, k);

    } catch(err) {
        console.error("❌ semanticSearch:", err.message);
        return [];
    }
};

module.exports = { initializeRAG, semanticSearch };