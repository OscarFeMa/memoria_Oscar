const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("../database/memoria.db");

// Datos de prueba mínimos
db.run("INSERT INTO conversaciones (timestamp, contenido, emisor) VALUES (?, ?, ?)", 
    [Date.now(), "Sistema reiniciado exitosamente - memoria activa", "oscar"]);

db.get("SELECT COUNT(*) as total FROM conversaciones", (err, row) => {
    console.log("Total conversaciones en memoria:", row.total);
    db.close();
});
