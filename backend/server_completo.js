const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const db = new sqlite3.Database("../database/memoria.db");

// Configuración
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// SERVIR ARCHIVOS DE IMPORTS
const importsPath = path.resolve(__dirname, "../imports");
app.use("/archivos", express.static(importsPath));

// ENDPOINT DE PRUEBA
app.get("/api/test", (req, res) => {
    res.json({ 
        status: "✅ Servidor Memoria Oscar Activo",
        timestamp: new Date().toISOString(),
        version: "2.0",
        endpoints: [
            "/api/test",
            "/api/recuerdos?q=...", 
            "/api/sesiones?q=...",
            "/api/archivos-disponibles",
            "/api/sesion/:archivo"
        ]
    });
});

// ENDPOINT PARA ARCHIVOS DISPONIBLES
app.get("/api/archivos-disponibles", (req, res) => {
    fs.readdir(importsPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: "No se puede acceder a imports" });
        }
        
        const archivos = files.map(file => {
            const filePath = path.join(importsPath, file);
            try {
                const stats = fs.statSync(filePath);
                return {
                    nombre: file,
                    ruta: `/archivos/${file}`,
                    tamanio: stats.size,
                    extension: path.extname(file),
                    tipo: path.extname(file).toLowerCase() === '.pdf' ? 'PDF' : 
                          path.extname(file).toLowerCase() === '.txt' ? 'TEXTO' : 
                          path.extname(file).toLowerCase() === '.html' ? 'HTML' : 'OTRO',
                    modificado: stats.mtime
                };
            } catch (e) {
                return { nombre: file, error: e.message };
            }
        }).filter(archivo => !archivo.error);
        
        res.json({
            rutaBase: importsPath,
            totalArchivos: archivos.length,
            archivos: archivos
        });
    });
});

// ENDPOINT DE BÚSQUEDA BÁSICO
app.get("/api/recuerdos", (req, res) => {
    const query = req.query.q || '';
    console.log("Búsqueda recibida:", query);
    
    db.all(
        "SELECT * FROM conversaciones WHERE contenido LIKE ? ORDER BY timestamp DESC LIMIT 50",
        [`%${query}%`],
        (err, rows) => {
            if (err) {
                res.status(500).json({error: err.message});
                return;
            }
            res.json(rows);
        }
    );
});

// ENDPOINT DE SESIONES
app.get("/api/sesiones", (req, res) => {
    const query = req.query.q || '';
    console.log("Búsqueda de sesiones:", query);
    
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
        WHERE contenido LIKE ?
        GROUP BY archivo
        ORDER BY inicio DESC
        LIMIT 20
    `, [`%${query}%`], (err, rows) => {
        if (err) {
            res.status(500).json({error: err.message});
            return;
        }
        
        const sesiones = rows.map(sesion => {
            const fragmentos = sesion.preview.split(' ||| ')
                .filter(linea => linea.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 3);
            
            return {
                archivo: sesion.archivo,
                total_mensajes: sesion.total_mensajes,
                inicio: sesion.inicio,
                fin: sesion.fin,
                duracion: sesion.fin - sesion.inicio,
                mensajes_oscar: sesion.mensajes_oscar,
                mensajes_ancla: sesion.mensajes_ancla,
                fragmentos: fragmentos,
                relevancia: fragmentos.length
            };
        });
        
        res.json(sesiones);
    });
});

// ENDPOINT PARA SESIÓN COMPLETA
app.get("/api/sesion/:archivo", (req, res) => {
    const archivo = req.params.archivo;
    console.log("Solicitada sesión completa:", archivo);
    
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

// RUTA RAÍZ
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// INICIAR SERVIDOR
const PORT = 3000;
app.listen(PORT, () => {
    console.log("🚀 MEMORIA OSCAR - SERVIDOR COMPLETO ACTIVO");
    console.log("📍 URL: http://localhost:" + PORT);
    console.log("🔍 Endpoint prueba: http://localhost:" + PORT + "/api/test");
    console.log("📁 Archivos: http://localhost:" + PORT + "/api/archivos-disponibles");
    console.log("🔎 Búsqueda: http://localhost:" + PORT + "/api/recuerdos?q=oscar");
    console.log("💬 Sesiones: http://localhost:" + PORT + "/api/sesiones?q=proyecto");
});
