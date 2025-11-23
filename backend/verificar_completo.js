const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("../database/memoria.db");

console.log("=== MEMORIA OSCAR - VERIFICACIÓN COMPLETA ===\n");

// Conteo básico
db.get("SELECT COUNT(*) as total FROM conversaciones", (err, totalRow) => {
    if (err) {
        console.error("Error en conteo total:", err);
        return;
    }
    console.log(`📚 Total conversaciones: ${totalRow.total}`);

    // Distribución por emisor
    db.all("SELECT emisor, COUNT(*) as count FROM conversaciones GROUP BY emisor", (err, emisorRows) => {
        if (err) {
            console.error("Error en distribución por emisor:", err);
            return;
        }
        console.log("\n👥 Distribución por emisor:");
        emisorRows.forEach(row => {
            console.log(`   - ${row.emisor}: ${row.count} mensajes`);
        });

        // Archivos de origen
        db.all(`
            SELECT 
                json_extract(metricas, '$.archivo_origen') as archivo,
                COUNT(*) as count 
            FROM conversaciones 
            WHERE metricas IS NOT NULL
            GROUP BY archivo
            ORDER BY count DESC
        `, (err, archivoRows) => {
            if (err) {
                console.error("Error en archivos de origen:", err);
                // Continuar sin archivos de origen
                archivoRows = [];
            }
            console.log("\n📁 Archivos de origen:");
            if (archivoRows.length > 0) {
                archivoRows.forEach(row => {
                    console.log(`   - ${row.archivo}: ${row.count} mensajes`);
                });
            } else {
                console.log("   (No se encontraron datos de archivos de origen)");
            }

            // Momentos identitarios (manera segura)
            console.log("\n🎯 Buscando momentos identitarios...");
            db.all("SELECT contenido, metricas FROM conversaciones WHERE metricas IS NOT NULL", (err, todas) => {
                if (err) {
                    console.error("Error en momentos identitarios:", err);
                    todas = [];
                }
                const momentos = {};
                
                todas.forEach(fila => {
                    try {
                        if (fila.metricas) {
                            const metrica = JSON.parse(fila.metricas);
                            if (metrica.momento_identitario) {
                                momentos[metrica.momento_identitario] = (momentos[metrica.momento_identitario] || 0) + 1;
                            }
                        }
                    } catch (e) {
                        // Ignorar JSON inválido
                    }
                });

                if (Object.keys(momentos).length > 0) {
                    console.log("Momentos identitarios detectados:");
                    Object.entries(momentos).forEach(([momento, count]) => {
                        console.log(`   - ${momento}: ${count}`);
                    });
                } else {
                    console.log("   (Aún no se detectaron momentos identitarios)");
                }

                // Últimas 5 conversaciones
                console.log("\n🕒 Últimas 5 conversaciones:");
                db.all("SELECT contenido, emisor, timestamp FROM conversaciones ORDER BY timestamp DESC LIMIT 5", (err, ultimas) => {
                    if (err) {
                        console.error("Error en últimas conversaciones:", err);
                        ultimas = [];
                    }
                    ultimas.forEach(conv => {
                        const preview = conv.contenido.length > 50 ? conv.contenido.substring(0, 50) + "..." : conv.contenido;
                        const fecha = new Date(conv.timestamp).toLocaleTimeString();
                        console.log(`   - ${fecha} ${conv.emisor}: ${preview}`);
                    });

                    console.log(`\n✅ Verificación completada. Ve a http://localhost:3000 para explorar.`);
                    db.close();
                });
            });
        });
    });
});
