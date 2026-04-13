<<<<<<< HEAD
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
=======
// config/db.js
const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "wiem bahba",
    database: "gestion_projet",
    waitForConnections: true,
  connectionLimit: 10
});


(async () => {
    try {
        const connection = await db.getConnection();
        console.log("✅ MYSQL connecté ");
        connection.release();
    } catch (err) {
        console.log("❌ erreur connexion DB", err);
>>>>>>> 0f3c680 (correction)
    }
})();

module.exports = pool;