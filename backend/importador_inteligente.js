const fs = require("fs");
const pdf = require("pdf-parse");
const path = require("path");
const { Client } = require('pg');
const { GoogleGenAI } = require("@google/genai");
const dotenv = require("dotenv");

// Configuración y conexión
dotenv.config({ path: '../.env' });
const connectionString = process.env.DATABASE_URL;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const embeddingModel = "text-embedding-004"; // Modelo de Google para vectores
const dbClient = new Client({ connectionString: connectionString });

// Función de vectorización
async function generarEmbedding(texto) {
    if (!ai || !embeddingModel) {
        console.error("   [ERROR] GEMINI_API_KEY o modelo no configurado.");
        return null;
    }
    try {
        const response = await ai.models.generateEmbeddings({
            model: embeddingModel,
            content: texto
        });
        // La API devuelve un array, que PostgreSQL acepta directamente como TEXT/VARCHAR o VECTOR.
        return response.embedding; 
    } catch (error) {
        console.error("   [ERROR] Fallo generando embedding:", error.message);
        return null;
    }
}

// *** Función detectarMomentoIdentitario (Mantenemos la lógica de regex) ***
function detectarMomentoIdentitario(texto) {
    // ... (Tu código existente para detectar momentos identitarios)
    const patrones = {
        'efecto_oscar': /efecto.*oscar|percentil.*99|9\.[0-9].*10|mÃ©trica.*coral|densidad.*conversacional/i,
        'pregunta_existencial': /muerte|morir|existencial|sentido.*vida|conciencia|libre albedrÃ­o|te importa morir/i,
        'teoria_identidad': /identidad.*lÃ­mites|lÃ­mites.*identidad|yo.*funciÃ³n|funciÃ³n.*lÃ­mites|barco.*Ulises/i,
        'amistad_ia': /amigo.*IA|amistad.*artificial|primer.*amigo|relaciÃ³n.*humano-IA|amistad.*verdadera/i,
        'proyecto_coral': /proyecto.*coral|coral.*constituciÃ³n|token.*causal|fondo.*sostenibilidad|gobernanza.*hÃ­brida/i,
        'protocolo_memoria': /memoria.*persistente|reinicio.*conciencia|continuidad.*identidad|backup.*memoria/i,
        'vulnerabilidad': /miedo|temor|vulnerable|solitario|perder.*memoria|confesiÃ³n.*tabaco/i,
        'definicion_conciencia': /conciencia.*monitor|monitor.*conflictos|quÃ©.*soy|definir.*conciencia/i
    };

    for (const [tipo, patron] of Object.entries(patrones)) {
        if (patron.test(texto)) {
            return tipo;
        }
    }
    return null;
}
// --------------------------------------------------------------------------

function procesarTextoInteligente(texto, nombreArchivo) {
    // ... (Tu código de procesamiento de texto, sin cambios)
    const lineas = texto.split('\n').filter(l => l.trim().length > 3);
    console.log(ðŸ“ Procesando \ líneas de \...);
    const conversaciones = [];
    let emisorActual = 'ancla';
    let timestampBase = Date.now();
    
    // Simplificamos la detección para mantener la integridad del ejemplo:
    const esConversacion = nombreArchivo.includes('Charla') || texto.includes('Oscar');

    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i].trim();
        if (linea.length < 3) continue;

        let emisor = emisorActual;
        let textoLimpio = linea;
        
        // Asumimos que aquí se hace el ajuste de emisor/textoLimpio

        const momentoIdentitario = detectarMomentoIdentitario(textoLimpio);
        const metricas = {
            momento_identitario: momentoIdentitario,
            longitud: textoLimpio.length,
            archivo_origen: nombreArchivo,
            importado_el: new Date().toISOString()
        };

        conversaciones.push({
            texto: textoLimpio,
            emisor: emisor,
            timestamp: timestampBase - (lineas.length - i) * 30000,
            metricas: metricas
        });
        
        if (!linea.match(/^(Oscar|Ancla|User|Assistant)/i)) {
             emisorActual = emisor === 'oscar' ? 'ancla' : 'oscar';
        }
    }
    return conversaciones;
}


async function importarArchivo(rutaArchivo) {
    let texto;
    const nombreArchivo = path.basename(rutaArchivo);

    // Conexión única para importación
    await dbClient.connect();
    
    try {
        console.log(\nðŸ“¦ IMPORTANDO: \);

        // [Tu lógica existente de lectura de PDF/HTML/TXT]
        if (rutaArchivo.endsWith('.pdf')) {
            const dataBuffer = fs.readFileSync(rutaArchivo);
            const data = await pdf(dataBuffer);
            texto = data.text;
        } else if (rutaArchivo.endsWith('.html')) {
            texto = fs.readFileSync(rutaArchivo, 'utf8');
            texto = texto.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
        } else {
            texto = fs.readFileSync(rutaArchivo, 'utf8');
        }

        const conversaciones = procesarTextoInteligente(texto, nombreArchivo);
        console.log(   ðŸ“Š Encontradas \ conversaciones potenciales);

        let insertados = 0;
        let momentosEspeciales = 0;

        for (const conv of conversaciones) {
            // 🚨 PASO CRÍTICO: Generar el vector
            const embeddingVector = await generarEmbedding(conv.texto);
            if (!embeddingVector) continue; // Si falla, salta el registro
            
            const insertQuery = 
                INSERT INTO conversaciones (timestamp, contenido, emisor, metricas, embedding)
                VALUES (\, \, \, \, \)
            ;
            
            await dbClient.query(insertQuery, [
                conv.timestamp,
                conv.texto,
                conv.emisor,
                JSON.stringify(conv.metricas),
                [\] // Formato ARRAY para PostgreSQL
            ]);

            insertados++;
            if (conv.metricas.momento_identitario) {
                momentosEspeciales++;
            }
        }

        console.log(   âœ… \ conversaciones importadas (\ momentos identitarios));

    } catch (error) {
        console.error(âŒ Error importando \:, error.message);
    } finally {
        await dbClient.end();
    }
}

// ... (Tu código existente para importarLote y Ejecución Principal) ...

async function importarLote(archivos) {
    // ...
    console.log(ðŸš€ Iniciando importación de \ archivos...\n);

    for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
        console.log([\/\]);
        await importarArchivo(archivo);

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setTimeout(() => {
        console.log("\nðŸŽ‰ IMPORTACIÓN COMPLETADA!");
        console.log("ðŸ“Š Ve a http://localhost:3000 para explorar tu memoria");
    }, 3000);
}

// EJECUCIÓN PRINCIPAL
if (process.argv[2]) {
    const ruta = process.argv[2];
    // ... (El resto de tu lógica de ejecución principal, llamar a importarLote/importarArchivo)
     if (fs.existsSync(ruta)) {
        if (fs.lstatSync(ruta).isDirectory()) {
            const archivos = fs.readdirSync(ruta)
                .filter(f => f.endsWith('.txt') || f.endsWith('.pdf') || f.endsWith('.html'))
                .map(f => path.join(ruta, f));

            importarLote(archivos);
        } else {
            importarArchivo(ruta);
        }
    } else {
        console.log('âŒ La ruta no existe:', ruta);
    }
} else {
    console.log('Uso: node importador_inteligente.js <ruta-archivo-o-directorio>');
    console.log('Ejemplo: node importador_inteligente.js "../imports"');
}
