const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("../database/memoria.db");
const backupFile = `../database/backup_${Date.now()}.db`;

console.log("💾 Creando backup de la memoria...");

db.run("VACUUM INTO ?", [backupFile], (err) => {
    if (err) {
        console.error("❌ Error en backup:", err);
    } else {
        const stats = fs.statSync(backupFile);
        console.log(`✅ Backup creado: ${backupFile}`);
        console.log(`📦 Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    }
    db.close();
});
