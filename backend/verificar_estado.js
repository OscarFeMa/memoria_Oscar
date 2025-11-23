const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("../database/memoria.db");

console.log("=== MEMORIA OSCAR - ESTADO ACTUAL ===\n");

// Función para ejecutar consultas de manera segura
function runQuery(query, params, callback) {
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("   ❌ Error en consulta:", err.message);
            callback([]);
        } else {
            callback(rows);
        }
    });
}

// Conteo total
db.get("SELECT COUNT(*) as total FROM conversaciones", (err, row) => {
    if (err) {
        console.error("Error contando conversaciones:", err);
    } else {
        console.log(`📚 Conversaciones totales: ${row.total}\n`);
    }

    // Distribución por emisor
    runQuery("SELECT emisor, COUNT(*) as count FROM conversaciones GROUP BY emisor", [], (rows) => {
        console.log("👥 Distribución por emisor:");
        if (rows && rows.length > 0) {
            rows.forEach(row => {
                console.log(`   - ${row.emisor}: ${row.count} mensajes`);
            });
        } else {
            console.log("   (No hay datos)");
        }
        console.log();
    });

    // Momentos identitarios detectados - usando LIKE en lugar de json_extract
    runQuery(`
        SELECT 
            metricas as metricas_texto
        FROM conversaciones 
        WHERE metricas IS NOT NULL AND metricas != ''
    `, [], (rows) => {
        console.log("🎯 Momentos identitarios detectados:");
        const momentos = {};

        rows.forEach(row => {
            try {
                const metricas = JSON.parse(row.metricas_texto);
                if (metricas.momento_identitario) {
                    momentos[metricas.momento_identitario] = (momentos[metricas.momento_identitario] || 0) + 1;
                }
            } catch (e) {
                // Ignorar líneas que no son JSON válido
            }
        });

        if (Object.keys(momentos).length > 0) {
            Object.entries(momentos).forEach(([momento, count]) => {
                console.log(`   - ${momento}: ${count}`);
            });
        } else {
            console.log("   (Aún no se detectaron momentos identitarios)");
        }
        console.log();
    });

    // Últimas conversaciones importadas
    runQuery("SELECT contenido, emisor FROM conversaciones ORDER BY timestamp DESC LIMIT 3", [], (rows) => {
        console.log("🕒 Últimas conversaciones:");
        if (rows && rows.length > 0) {
            rows.forEach(row => {
                const preview = row.contenido.length > 60 ? row.contenido.substring(0, 60) + "..." : row.contenido;
                console.log(`   - ${row.emisor}: ${preview}`);
            });
        } else {
            console.log("   (No hay conversaciones)");
        }

        // Cerrar la base de datos después de todas las consultas
        db.close();
    });
});
