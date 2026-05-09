const db = require("../config/db");

async function runSQL(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows;
}

module.exports = { runSQL };