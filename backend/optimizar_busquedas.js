const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("../database/memoria.db");

console.log("📇 Creando índices para búsquedas rápidas...");

db.serialize(() => {
    db.run("CREATE INDEX IF NOT EXISTS idx_contenido ON conversaciones(contenido)");
    db.run("CREATE INDEX IF NOT EXISTS idx_timestamp ON conversaciones(timestamp DESC)");
    db.run("CREATE INDEX IF NOT EXISTS idx_emisor ON conversaciones(emisor)");
});

console.log("✅ Índices creados. Búsquedas optimizadas.");
db.close();
