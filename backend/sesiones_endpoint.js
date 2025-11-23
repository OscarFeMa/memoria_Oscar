const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const router = express.Router();

const db = new sqlite3.Database("../database/memoria.db");

// Nuevo endpoint para obtener sesiones agrupadas
app.get("/api/sesiones", (req, res) => {
    const query = req.query.q;
    
    // Buscar conversaciones que contengan el término
    db.all(`
        SELECT 
            json_extract(metricas, '$.archivo_origen') as archivo,
            COUNT(*) as total_mensajes,
            MIN(timestamp) as inicio,
            MAX(timestamp) as fin,
            GROUP_CONCAT(contenido, ' ||| ') as preview,
            SUM(CASE WHEN emisor = 'oscar' THEN 1 ELSE 0 END) as mensajes_oscar,
            SUM(CASE WHEN emisor = 'ancla' THEN 1 ELSE 0 END) as mensajes_ancla
        FROM conversaciones 
        WHERE contenido LIKE ? OR metricas LIKE ?
        GROUP BY archivo
        ORDER BY inicio DESC
        LIMIT 50
    `, [`%${query}%`, `%${query}%`], (err, rows) => {
        if (err) {
            res.status(500).json({error: err.message});
            return;
        }
        
        // Procesar resultados para crear previews más útiles
        const sesiones = rows.map(sesion => {
            // Extraer fragmentos relevantes que contengan la búsqueda
            const fragmentos = sesion.preview.split(' ||| ')
                .filter(linea => linea.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 3); // Máximo 3 fragmentos
            
            return {
                archivo: sesion.archivo,
                total_mensajes: sesion.total_mensajes,
                inicio: sesion.inicio,
                fin: sesion.fin,
                duracion: sesion.fin - sesion.inicio,
                mensajes_oscar: sesion.mensajes_oscar,
                mensajes_ancla: sesion.mensajes_ancla,
                fragmentos: fragmentos,
                relevancia: fragmentos.length // Métrica simple de relevancia
            };
        });
        
        res.json(sesiones);
    });
});

// Endpoint para obtener una sesión completa
app.get("/api/sesion/:archivo", (req, res) => {
    const archivo = req.params.archivo;
    
    db.all(`
        SELECT * FROM conversaciones 
        WHERE json_extract(metricas, '$.archivo_origen') = ?
        ORDER BY timestamp ASC
    `, [archivo], (err, rows) => {
        if (err) {
            res.status(500).json({error: err.message});
            return;
        }
        
        res.json({
            archivo: archivo,
            total_mensajes: rows.length,
            conversaciones: rows
        });
    });
});

console.log("✅ Endpoints de sesiones agregados");
