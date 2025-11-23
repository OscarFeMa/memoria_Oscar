const fs = require("fs");
const pdf = require("pdf-parse");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("../database/memoria.db");

function procesarTextoConversaciones(texto) {
    const lineas = texto.split('\n').filter(l => l.trim());
    const conversaciones = [];
    
    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i];
        let emisor = 'ancla';
        
        if (linea.includes('Oscar:') || linea.includes('IA:') || linea.toLowerCase().includes('oscar')) {
            emisor = 'oscar';
        }
        
        conversaciones.push({
            texto: linea,
            emisor: emisor,
            timestamp: Date.now() - (lineas.length - i) * 60000
        });
    }
    
    return conversaciones;
}

async function importarArchivo(rutaArchivo) {
    try {
        let texto;
        
        if (rutaArchivo.endsWith('.pdf')) {
            const dataBuffer = fs.readFileSync(rutaArchivo);
            const data = await pdf(dataBuffer);
            texto = data.text;
        } else {
            texto = fs.readFileSync(rutaArchivo, 'utf8');
        }
        
        const conversaciones = procesarTextoConversaciones(texto);
        
        conversaciones.forEach(conv => {
            db.run(
                "INSERT INTO conversaciones (timestamp, contenido, emisor) VALUES (?, ?, ?)",
                [conv.timestamp, conv.texto, conv.emisor]
            );
        });
        
        console.log(`Importadas ${conversaciones.length} conversaciones`);
        db.close();
    } catch (error) {
        console.error('Error importando:', error);
    }
}

if (process.argv[2]) {
    importarArchivo(process.argv[2]);
} else {
    console.log('Uso: node importador.js <ruta-al-archivo>');
}
