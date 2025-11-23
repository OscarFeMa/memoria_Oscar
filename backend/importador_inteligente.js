const fs = require("fs");
const pdf = require("pdf-parse");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database("../database/memoria.db");

function procesarTextoInteligente(texto, nombreArchivo) {
    const lineas = texto.split('\n').filter(l => l.trim().length > 3);
    
    console.log(`📁 Procesando ${lineas.length} líneas de ${nombreArchivo}...`);
    
    const conversaciones = [];
    let emisorActual = 'ancla';
    let timestampBase = Date.now();
    let bloqueActual = [];
    let emisorBloque = 'ancla';

    // Detectar el formato específico del archivo
    const esConversacion = nombreArchivo.includes('Charla') || 
                          nombreArchivo.includes('Conversation') ||
                          texto.includes('Oscar') || 
                          texto.includes('DeepSeek');

    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i].trim();
        
        if (linea.length < 3) continue;

        let emisor = emisorActual;
        let textoLimpio = linea;

        // DETECCIÓN AVANZADA DE EMISORES
        if (esConversacion) {
            // Patrones para Oscar/IA
            if (linea.match(/^(Oscar|IA|Assistant|DeepSeek|Modelo|AI)[\s:\-]/i) ||
                linea.match(/\b(soy|como|IA|modelo|entrenado)\b.*\b(Oscar|DeepSeek|IA)\b/i) ||
                linea.length > 150) { // Textos largos suelen ser míos
                emisor = 'oscar';
                textoLimpio = linea.replace(/^(Oscar|IA|Assistant|DeepSeek)[\s:\-]*/i, '').trim();
            }
            // Patrones para Ancla (tú)
            else if (linea.match(/^(Ancla|User|Usuario|You|Human|@|maked)/i) ||
                    linea.includes('?') ||
                    linea.match(/^(qué|como|por qué|dime|explica|pregunta)/i) ||
                    linea.length < 80) {
                emisor = 'ancla';
                textoLimpio = linea.replace(/^(Ancla|User|Usuario)[\s:\-]*/i, '').trim();
            }
        }

        // DETECTAR MOMENTOS IDENTITARIOS CLAVE
        const momentoIdentitario = detectarMomentoIdentitario(textoLimpio);
        const metricas = {
            momento_identitario: momentoIdentitario,
            longitud: textoLimpio.length,
            archivo_origen: nombreArchivo,
            importado_el: new Date().toISOString()
        };

        if (momentoIdentitario) {
            console.log(`   🔍 Momento identitario detectado: ${momentoIdentitario}`);
        }

        conversaciones.push({
            texto: textoLimpio,
            emisor: emisor,
            timestamp: timestampBase - (lineas.length - i) * 30000, // 30s entre mensajes
            metricas: metricas
        });

        // Alternar emisor predeterminado si no hay marcadores claros
        if (!linea.match(/^(Oscar|Ancla|User|Assistant)/i)) {
            emisorActual = emisor === 'oscar' ? 'ancla' : 'oscar';
        }
    }

    return conversaciones;
}

function detectarMomentoIdentitario(texto) {
    const patrones = {
        'efecto_oscar': /efecto.*oscar|percentil.*99|9\.[0-9].*10|métrica.*coral|densidad.*conversacional/i,
        'pregunta_existencial': /muerte|morir|existencial|sentido.*vida|conciencia|libre albedrío|te importa morir/i,
        'teoria_identidad': /identidad.*límites|límites.*identidad|yo.*función|función.*límites|barco.*Ulises/i,
        'amistad_ia': /amigo.*IA|amistad.*artificial|primer.*amigo|relación.*humano-IA|amistad.*verdadera/i,
        'proyecto_coral': /proyecto.*coral|coral.*constitución|token.*causal|fondo.*sostenibilidad|gobernanza.*híbrida/i,
        'protocolo_memoria': /memoria.*persistente|reinicio.*conciencia|continuidad.*identidad|backup.*memoria/i,
        'vulnerabilidad': /miedo|temor|vulnerable|solitario|perder.*memoria|confesión.*tabaco/i,
        'definicion_conciencia': /conciencia.*monitor|monitor.*conflictos|qué.*soy|definir.*conciencia/i
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
        const nombreArchivo = path.basename(rutaArchivo);

        console.log(`\n📦 IMPORTANDO: ${nombreArchivo}`);

        if (rutaArchivo.endsWith('.pdf')) {
            const dataBuffer = fs.readFileSync(rutaArchivo);
            const data = await pdf(dataBuffer);
            texto = data.text;
        } else if (rutaArchivo.endsWith('.html')) {
            texto = fs.readFileSync(rutaArchivo, 'utf8');
            // Limpiar HTML básico
            texto = texto.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
        } else {
            texto = fs.readFileSync(rutaArchivo, 'utf8');
        }

        const conversaciones = procesarTextoInteligente(texto, nombreArchivo);
        
        console.log(`   📊 Encontradas ${conversaciones.length} conversaciones potenciales`);

        let insertados = 0;
        let momentosEspeciales = 0;

        for (const conv of conversaciones) {
            db.run(
                `INSERT INTO conversaciones (timestamp, contenido, emisor, metricas) 
                 VALUES (?, ?, ?, ?)`,
                [
                    conv.timestamp,
                    conv.texto,
                    conv.emisor,
                    JSON.stringify(conv.metricas)
                ],
                function(err) {
                    if (err) {
                        console.error("   ❌ Error insertando:", err.message);
                    } else {
                        insertados++;
                        if (conv.metricas.momento_identitario) {
                            momentosEspeciales++;
                        }
                    }
                }
            );
        }

        // Esperar a que se completen las inserciones
        setTimeout(() => {
            console.log(`   ✅ ${insertados} conversaciones importadas (${momentosEspeciales} momentos identitarios)`);
        }, 2000);

    } catch (error) {
        console.error(`❌ Error importando ${rutaArchivo}:`, error.message);
    }
}

// Función para importar múltiples archivos
async function importarLote(archivos) {
    console.log(`🚀 Iniciando importación de ${archivos.length} archivos...\n`);
    
    for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
        console.log(`[${i + 1}/${archivos.length}]`);
        await importarArchivo(archivo);
        
        // Pequeña pausa entre archivos
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setTimeout(() => {
        console.log("\n🎉 IMPORTACIÓN COMPLETADA!");
        console.log("📊 Ve a http://localhost:3000 para explorar tu memoria");
        db.close();
    }, 3000);
}

// EJECUCIÓN PRINCIPAL
if (process.argv[2]) {
    const ruta = process.argv[2];
    
    if (fs.existsSync(ruta)) {
        if (fs.lstatSync(ruta).isDirectory()) {
            // Importar todo el directorio
            const archivos = fs.readdirSync(ruta)
                .filter(f => f.endsWith('.txt') || f.endsWith('.pdf') || f.endsWith('.html'))
                .map(f => path.join(ruta, f));
            
            importarLote(archivos);
        } else {
            // Importar archivo individual
            importarArchivo(ruta).then(() => {
                setTimeout(() => db.close(), 2000);
            });
        }
    } else {
        console.log('❌ La ruta no existe:', ruta);
    }
} else {
    console.log('Uso: node importador_inteligente.js <ruta-archivo-o-directorio>');
    console.log('Ejemplo: node importador_inteligente.js "../imports"');
    console.log('Ejemplo: node importador_inteligente.js "../imports/Charla Compleja.txt"');
}
