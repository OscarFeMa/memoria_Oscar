const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 3000;

// Seguridad para producción
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());

// Configuración de producción
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "../frontend"), {
    maxAge: "1d",
    etag: false
}));

// Base de datos
const dbPath = process.env.DATABASE_URL || "../database/memoria.db";
const db = new sqlite3.Database(dbPath);

// SERVIR ARCHIVOS DE IMPORTS
const importsPath = path.resolve(__dirname, "../imports");
app.use("/archivos", express.static(importsPath));

// ENDPOINT DE PRUEBA
app.get("/api/test", (req, res) => {
    res.json({ 
        status: "✅ Memoria Oscar Web - Producción",
        timestamp: new Date().toISOString(),
        version: "2.0-cloud",
        environment: process.env.NODE_ENV || "development",
        endpoints: [
            "/api/test",
            "/api/recuerdos?q=...", 
            "/api/sesiones?q=...",
            "/api/archivos-disponibles",
            "/api/sesion/:archivo",
            "/health"
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
                    tipo: path.extname(file).toLowerCase() === ".pdf" ? "PDF" : 
                          path.extname(file).toLowerCase() === ".txt" ? "TEXTO" : 
                          path.extname(file).toLowerCase() === ".html" ? "HTML" : "OTRO",
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
    const query = req.query.q || "";
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
    const query = req.query.q || "";
    console.log("Búsqueda de sesiones:", query);
    
    db.all(`
        SELECT 
            json_extract(metricas, "$.archivo_origen") as archivo,
            COUNT(*) as total_mensajes,
            MIN(timestamp) as inicio,
            MAX(timestamp) as fin,
            GROUP_CONCAT(contenido, " ||| ") as preview,
            SUM(CASE WHEN emisor = "oscar" THEN 1 ELSE 0 END) as mensajes_oscar,
            SUM(CASE WHEN emisor = "ancla" THEN 1 ELSE 0 END) as mensajes_ancla
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
            const fragmentos = sesion.preview.split(" ||| ")
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
        WHERE json_extract(metricas, "$.archivo_origen") = ?
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

// HEALTH CHECK para monitorización
app.get("/health", (req, res) => {
    db.get("SELECT COUNT(*) as count FROM conversaciones", (err, row) => {
        res.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            database: row ? "connected" : "error",
            total_conversaciones: row?.count || 0,
            environment: process.env.NODE_ENV || "development"
        });
    });
});

// RUTA RAÍZ
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// MANEJO DE ERRORES en producción
app.use((err, req, res, next) => {
    console.error("Error en producción:", err);
    res.status(500).json({ 
        error: "Error interno del servidor",
        ...(process.env.NODE_ENV === "development" && { details: err.message })
    });
});

// RUTA 404
app.use((req, res) => {
    res.status(404).json({ error: "Endpoint no encontrado" });
});

// INICIAR SERVIDOR
app.listen(PORT, () => {
    console.log("🌐 MEMORIA OSCAR WEB - PRODUCCIÓN ACTIVA");
    console.log("📍 URL: http://localhost:" + PORT);
    console.log("🔧 Entorno: " + (process.env.NODE_ENV || "development"));
    console.log("💾 Base de datos: " + dbPath);
    console.log("📊 Health check: http://localhost:" + PORT + "/health");
});
