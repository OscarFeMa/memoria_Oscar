const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("../database/memoria.db");

// Agregar columna metricas si no existe
db.run("ALTER TABLE conversaciones ADD COLUMN metricas TEXT", function(err) {
    if (err) {
        console.log("La columna 'metricas' ya existe o no se pudo agregar:", err.message);
    } else {
        console.log("✅ Columna 'metricas' agregada a la tabla conversaciones");
    }
});

// Verificar la estructura de la tabla
db.all("PRAGMA table_info(conversaciones)", (err, rows) => {
    if (err) {
        console.error("Error al obtener información de la tabla:", err);
    } else {
        console.log("\nEstructura de la tabla 'conversaciones':");
        rows.forEach(row => {
            console.log(`   - ${row.name} (${row.type})`);
        });
    }
    db.close();
});
