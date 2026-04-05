const mysql = require("mysql2");

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "gestion_projet",
    waitForConnections: true,
    connectionLimit: 10,
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Erreur connexion DB", err);
    } else {
        console.log("✅ MYSQL connecté");
        connection.release();
    }
});

module.exports = pool;