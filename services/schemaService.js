const db = require("../config/db");

async function getSchema() {
  const [tables] = await db.query("SHOW TABLES");

  let schema = "";

  for (let t of tables) {
    const tableName = Object.values(t)[0];

    const [columns] = await db.query(`DESCRIBE \`${tableName}\``);

    schema += `
Table: ${tableName}
Columns: ${columns.map(c => c.Field).join(", ")}
`;
  }

  return schema;
}

module.exports = { getSchema };