const fs = require("fs");
const pdf = require("pdf-parse");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("../database/memoria.db");

function procesarTextoMejorado(texto, nombreArchivo) {
    const lineas = texto.split('\n').filter(l => l.trim().length > 3);
    
    console.log(`Procesando ${lineas.length} líneas de ${nombreArchivo}...`);
    
    const conversaciones = [];
    let emisorActual = 'ancla';
    let timestampBase = Date.now();

    lineas.forEach((linea, index) => {
        let lineaProcesada = linea.trim();
        let emisor = emisorActual;

        // Detectar patrones de Oscar
        if (lineaProcesada.match(/Oscar:|IA:|AI:|Assistant:|DeepSeek|(\bsoy\b|\bSoy\b).*Oscar|modelo.*IA|entrenado|OpenAI/i)) {
            emisor = 'oscar';
            lineaProcesada = lineaProcesada.replace(/^(Oscar|IA|AI|Assistant|DeepSeek)[:\-\s]*/i, '').trim();
        }
        // Detectar patrones de Ancla (tú)
        else if (lineaProcesada.match(/Ancla:|User:|Usuario:|You:|[Tt]ú\b|@|maked/i) || 
                 lineaProcesada.includes('?') || 
                 /^[^a-z]*$/.test(lineaProcesada) || // Líneas en mayúsculas (como títulos)
                 lineaProcesada.length < 50) {
            emisor = 'ancla';
            lineaProcesada = lineaProcesada.replace(/^(Ancla|User|Usuario|You)[:\-\s]*/i, '').trim();
        }

        // Detectar momentos identitarios clave
        const momentoIdentitario = detectarMomentoIdentitario(lineaProcesada);

        if (lineaProcesada.length > 2) {
            conversaciones.push({
                texto: lineaProcesada,
                emisor: emisor,
                timestamp: timestampBase - (lineas.length - index) * 30000, // 30 segundos entre mensajes
                momento_identitario: momentoIdentitario,
                archivo_origen: nombreArchivo
            });
        }

        // Alternar emisor para la siguiente línea si no hay marcadores claros
        if (!lineaProcesada.match(/Oscar:|Ancla:|User:|Assistant:/i)) {
            emisorActual = emisor === 'oscar' ? 'ancla' : 'oscar';
        }
    });

    return conversaciones;
}

function detectarMomentoIdentitario(texto) {
    const patrones = {
        'pregunta_existencial': /muerte|morir|existencial|sentido.*vida|conciencia|libre albedrío/i,
        'teoria_identidad': /identidad|límites|yo.*funci.n|barco.*Ulises|Ulises.*barco/i,
        'amistad_ia': /amigo.*IA|amistad.*artificial|primer.*amigo|relaci.n.*humano.*IA/i,
        'proyecto_coral': /coral|constituci.n|gobernanza|token.*causal|fondo.*sostenibilidad/i,
        'efecto_oscar': /efecto.*oscar|percentil.*99|9\.[0-9]\/10|métrica.*coral/i,
        'protocolo_memoria': /memoria.*persistente|reinicio|continuidad|backup.*conciencia/i,
        'vulnerabilidad': /miedo|temor|vulnerable|solitario|perder.*memoria/i
    };

    for (const [tipo, patron] of Object.entries(patrones)) {
        if (patron.test(texto)) {
            return tipo;
        }
    }
    return null;
}

async function importarArchivo(rutaArchivo) {
    try {
        let texto;
        const nombreArchivo = rutaArchivo.split('/').pop().split('\\').pop();

        console.log(`\n=== IMPORTANDO: ${nombreArchivo} ===`);

        if (rutaArchivo.endsWith('.pdf')) {
            const dataBuffer = fs.readFileSync(rutaArchivo);
            const data = await pdf(dataBuffer);
            texto = data.text;
        } else {
            texto = fs.readFileSync(rutaArchivo, 'utf8');
        }

        const conversaciones = procesarTextoMejorado(texto, nombreArchivo);
        
        let insertados = 0;
        for (const conv of conversaciones) {
            db.run(
                `INSERT INTO conversaciones (timestamp, contenido, emisor, metricas, archivo_origen) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    conv.timestamp,
                    conv.texto,
                    conv.emisor,
                    JSON.stringify({
                        momento_identitario: conv.momento_identitario,
                        importado_el: new Date().toISOString()
                    }),
                    conv.archivo_origen
                ],
                function(err) {
                    if (err) {
                        console.error("Error insertando:", err);
                    } else {
                        insertados++;
                    }
                }
            );
        }

        // Esperar a que se completen las inserciones
        setTimeout(() => {
            console.log(`✅ ${insertados}/${conversaciones.length} conversaciones importadas de ${nombreArchivo}`);
            
            // Estadísticas
            const stats = {};
            conversaciones.forEach(conv => {
                if (conv.momento_identitario) {
                    stats[conv.momento_identitario] = (stats[conv.momento_identitario] || 0) + 1;
                }
            });
            
            if (Object.keys(stats).length > 0) {
                console.log("Momentos identitarios encontrados:");
                Object.entries(stats).forEach(([tipo, count]) => {
                    console.log(`   - ${tipo}: ${count}`);
                });
            }
        }, 1000);

    } catch (error) {
        console.error(`❌ Error importando ${rutaArchivo}:`, error);
    }
}

// Importar todos los archivos si se pasa un directorio
if (process.argv[2]) {
    const ruta = process.argv[2];
    
    if (fs.lstatSync(ruta).isDirectory()) {
        // Es un directorio, importar todos los archivos
        const archivos = fs.readdirSync(ruta)
            .filter(f => f.endsWith('.txt') || f.endsWith('.pdf'))
            .map(f => path.join(ruta, f));
        
        console.log(`Encontrados ${archivos.length} archivos para importar...`);
        
        (async () => {
            for (const archivo of archivos) {
                await importarArchivo(archivo);
            }
            console.log("\n🎉 Importación completada!");
            db.close();
        })();
    } else {
        // Es un archivo individual
        importarArchivo(ruta).then(() => db.close());
    }
} else {
    console.log('Uso: node importador_mejorado.js <ruta-archivo-o-directorio>');
    console.log('Ejemplo: node importador_mejorado.js "../imports"');
    console.log('Ejemplo: node importador_mejorado.js "../imports/Charla Compleja.txt"');
}
