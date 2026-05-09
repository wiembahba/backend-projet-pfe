const db = require('../config/db');

// ── Helper: recalcule progression + statut tâche parent ──
const recalcProgression = async (tacheId) => {
  const [rows] = await db.execute(
    `SELECT COUNT(*) as total, SUM(termine) as done 
     FROM sous_taches WHERE tache_id = ?`,
    [tacheId]
  );
  const { total, done } = rows[0];
  if (total === 0) return null;

  const progression = Math.round((done / total) * 100);
  const statut = progression === 100 ? 'termine' 
               : progression > 0   ? 'en_cours' 
               : 'a_faire';

  await db.execute(
    `UPDATE taches SET progression = ?, statut = ? WHERE id = ?`,
    [progression, statut, tacheId]
  );
  return progression;
};

// ── GET /api/projets/taches/:tacheId/sous-taches ─────────
exports.getSousTaches = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT st.*, u.nom_complet as createur_nom
       FROM sous_taches st
       LEFT JOIN users u ON u.id = st.created_by
       WHERE st.tache_id = ?
       ORDER BY st.created_at ASC`,
      [req.params.tacheId]
    );
    res.json({ success: true, sous_taches: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/projets/taches/:tacheId/sous-taches ────────
// المظف بس يقدر يزيد (مع titre و description)
exports.createSousTache = async (req, res) => {
  const { titre, description } = req.body;  // ⭐ نضيف description
  const userId   = req.user.id;
  const userRole = req.user.role;

  if (userRole === 'chef_projet') {
    return res.status(403).json({ 
      success: false, 
      message: "Seul l'employé peut ajouter des sous-tâches" 
    });
  }

  if (!titre || !titre.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Titre obligatoire' 
    });
  }

  try {
    // ⭐ نضيف description في الإدراج
    const [result] = await db.execute(
      `INSERT INTO sous_taches (tache_id, titre, description, created_by) 
       VALUES (?, ?, ?, ?)`,
      [req.params.tacheId, titre.trim(), description?.trim() || null, userId]
    );

    await recalcProgression(req.params.tacheId);

    const [newRow] = await db.execute(
      `SELECT st.*, u.nom_complet as createur_nom
       FROM sous_taches st
       LEFT JOIN users u ON u.id = st.created_by
       WHERE st.id = ?`, 
      [result.insertId]
    );
    res.status(201).json({ success: true, sous_tache: newRow[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/projets/taches/:tacheId/sous-taches/:id ──
// تعديل sous-tâche (titre et description)
exports.updateSousTache = async (req, res) => {
  const { titre, description } = req.body;
  const userRole = req.user.role;

  if (userRole === 'chef_projet') {
    return res.status(403).json({ 
      success: false, 
      message: "Seul l'employé peut modifier les sous-tâches" 
    });
  }

  if (!titre || !titre.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Titre obligatoire' 
    });
  }

  try {
    await db.execute(
      `UPDATE sous_taches 
       SET titre = ?, description = ?
       WHERE id = ? AND tache_id = ?`,
      [titre.trim(), description?.trim() || null, req.params.id, req.params.tacheId]
    );

    const [updated] = await db.execute(
      `SELECT st.*, u.nom_complet as createur_nom
       FROM sous_taches st
       LEFT JOIN users u ON u.id = st.created_by
       WHERE st.id = ?`, 
      [req.params.id]
    );

    res.json({ 
      success: true, 
      sous_tache: updated[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/projets/taches/:tacheId/sous-taches/:id/toggle
// المظف بس يقدر يبدل (تغيير حالة termine)
exports.toggleSousTache = async (req, res) => {
  const userRole = req.user.role;

  if (userRole === 'chef_projet') {
    return res.status(403).json({ 
      success: false, 
      message: "Seul l'employé peut modifier les sous-tâches" 
    });
  }

  try {
    await db.execute(
      `UPDATE sous_taches SET termine = NOT termine 
       WHERE id = ? AND tache_id = ?`,
      [req.params.id, req.params.tacheId]
    );

    const progression = await recalcProgression(req.params.tacheId);

    const [updated] = await db.execute(
      `SELECT st.*, u.nom_complet as createur_nom
       FROM sous_taches st
       LEFT JOIN users u ON u.id = st.created_by
       WHERE st.id = ?`, 
      [req.params.id]
    );

    res.json({ 
      success: true, 
      sous_tache: updated[0],
      progression_tache: progression
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/projets/taches/:tacheId/sous-taches/:id ──
// المظف بس يقدر يحذف
exports.deleteSousTache = async (req, res) => {
  const userRole = req.user.role;

  if (userRole === 'chef_projet') {
    return res.status(403).json({ 
      success: false, 
      message: "Seul l'employé peut supprimer les sous-tâches" 
    });
  }

  try {
    await db.execute(
      `DELETE FROM sous_taches WHERE id = ? AND tache_id = ?`,
      [req.params.id, req.params.tacheId]
    );

    const progression = await recalcProgression(req.params.tacheId);

    res.json({ success: true, progression_tache: progression });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};