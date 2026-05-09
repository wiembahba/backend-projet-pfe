const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

(async () => {
    try {
        const connection = await db.getConnection();
        console.log("✅ MYSQL connecté");
        connection.release();
    } catch (err) {
        console.log("❌ erreur connexion DB", err);
    }
})();

module.exports = db;