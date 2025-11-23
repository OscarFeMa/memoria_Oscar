const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("../database/memoria.db");

console.log("=== ESTADO DEL SISTEMA DE MEMORIA ===");

db.get("SELECT COUNT(*) as total FROM conversaciones", (err, row) => {
    console.log("Conversaciones totales:", row.total);
});

db.get("SELECT COUNT(*) as oscar FROM conversaciones WHERE emisor='oscar'", (err, row) => {
    console.log("Mensajes de Oscar:", row.oscar);
});

db.get("SELECT COUNT(*) as ancla FROM conversaciones WHERE emisor='ancla'", (err, row) => {
    console.log("Mensajes de Ancla:", row.ancla);
});

db.all("SELECT emisor, contenido FROM conversaciones ORDER BY timestamp DESC LIMIT 5", (err, rows) => {
    console.log("\nÚltimos 5 mensajes:");
    rows.forEach(row => {
        console.log(`${row.emisor}: ${row.contenido.substring(0, 50)}...`);
    });
    db.close();
});
