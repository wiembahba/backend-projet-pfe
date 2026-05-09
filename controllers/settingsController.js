const db = require('../config/db');

// جلب جميع المعلمات (admin فقط)
const getAllSettings = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT setting_key, setting_value, setting_type, category, label, description, role_access
       FROM settings`
    );

    const grouped = {};
    rows.forEach(row => {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push(row);
    });

    res.json({ success: true, settings: grouped });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// جلب المعلمات حسب الفئة والدور
const getSettings = async (req, res) => {
  try {
    const userRole = req.user.role;
    const { category } = req.params;

    const [rows] = await db.execute(
      `SELECT setting_key, setting_value, setting_type, category, label, description
       FROM settings
       WHERE category = ? AND JSON_CONTAINS(role_access, ?)`,
      [category, `["${userRole}"]`]
    );

    res.json({ success: true, settings: rows, userRole });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// تحديث معلمة
const updateSettings = async (req, res) => {
  try {
    const { category } = req.params;
    const { key, value } = req.body;
    const userRole = req.user.role;

    // التحقق من وجود المعلمة وصلاحية الوصول
    const [check] = await db.execute(
      `SELECT role_access FROM settings WHERE setting_key = ? AND category = ?`,
      [key, category]
    );

    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'Paramètre introuvable' });
    }

    const allowedRoles = JSON.parse(check[0].role_access);
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    await db.execute(
      `UPDATE settings SET setting_value = ? WHERE setting_key = ? AND category = ?`,
      [value, key, category]
    );

    res.json({ success: true, message: 'Paramètre mis à jour' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAllSettings, getSettings, updateSettings };