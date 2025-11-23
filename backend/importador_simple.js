const fs = require("fs");
const pdf = require("pdf-parse");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("../database/memoria.db");

async function importarSimple(rutaArchivo) {
    try {
        console.log(`📁 Procesando: ${rutaArchivo}`);
        
        let texto;
        if (rutaArchivo.endsWith('.pdf')) {
            const dataBuffer = fs.readFileSync(rutaArchivo);
            const data = await pdf(dataBuffer);
            texto = data.text;
        } else {
            texto = fs.readFileSync(rutaArchivo, 'utf8');
        }
        
        // Dividir en líneas y procesar
        const lineas = texto.split('\n').filter(l => l.trim().length > 10);
        
        console.log(`   📊 Encontradas ${lineas.length} líneas con contenido`);
        
        let insertados = 0;
        lineas.forEach((linea, index) => {
            // Detección simple de emisor
            let emisor = 'ancla';
            if (linea.match(/Oscar|IA|Assistant|DeepSeek|modelo entrenado/i) || linea.length > 100) {
                emisor = 'oscar';
            }
            
            const metricas = {
                archivo_origen: require("path").basename(rutaArchivo),
                importado_el: new Date().toISOString(),
                longitud: linea.length
            };
            
            db.run(
                "INSERT INTO conversaciones (timestamp, contenido, emisor, metricas) VALUES (?, ?, ?, ?)",
                [Date.now() - (lineas.length - index) * 30000, linea.trim(), emisor, JSON.stringify(metricas)],
                (err) => {
                    if (!err) insertados++;
                }
            );
        });
        
        // Esperar a que se completen las inserciones
        setTimeout(() => {
            console.log(`   ✅ ${insertados} conversaciones importadas de ${rutaArchivo}`);
        }, 2000);
        
    } catch (error) {
        console.error(`❌ Error importando ${rutaArchivo}:`, error.message);
    }
}

// Ejecutar
if (process.argv[2]) {
    importarSimple(process.argv[2]).then(() => {
        setTimeout(() => process.exit(0), 3000);
    });
} else {
    console.log("Uso: node importador_simple.js <archivo>");
}
