const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const helmet = require("helmet");
const { Client } = require('pg');
const { GoogleGenAI } = require("@google/genai");
const dotenv = require("dotenv");

// Configuración
dotenv.config({ path: '../.env' });
const app = express();
const PORT = process.env.PORT || 3000;
const connectionString = process.env.DATABASE_URL;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const embeddingModel = "text-embedding-004";

// Seguridad y Middlewares
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "../frontend")));

// Cliente de base de datos
const dbClient = new Client({ connectionString: connectionString });
dbClient.connect().catch(err => console.error("❌ Falló la conexión inicial a PostgreSQL", err));

// Función para generar embeddings
async function generarEmbedding(texto) {
    if (!ai || !embeddingModel) return null;
    try {
        const response = await ai.models.generateEmbeddings({
            model: embeddingModel,
            content: texto
        });
        return response.embedding;
    } catch (error) {
        console.error("Error generando embedding en servidor:", error.message);
        return null;
    }
}

const importsPath = path.resolve(__dirname, "../imports");
app.use("/archivos", express.static(importsPath));


// ENDPOINT DE BÚSQUEDA SEMÁNTICA
app.get("/api/recuerdos", async (req, res) => {
    const query = req.query.q || "";
    if (!query) {
        return res.json([]);
    }
    console.log("Búsqueda semántica recibida:", query);

    try {
        const queryVector = await generarEmbedding(query);
        if (!queryVector) {
            return res.status(500).json({ error: "Falló la vectorización de la consulta." });
        }
        
        // 2. Consulta de Similitud de Coseno (USANDO ACENTO GRAVE EN JS)
        const searchQuery = `
            SELECT
                id, contenido, emisor, metricas, timestamp,
                1 - (embedding <-> $1) AS similitud
            FROM conversaciones
            ORDER BY similitud DESC
            LIMIT 50
        `; // <-- Acuérdate de la tilde grave (backtick)

        const vectorString = `[${queryVector.join(',')}]`;

        const result = await dbClient.query(searchQuery, [vectorString]);
        
        res.json(result.rows);
    } catch (err) {
        console.error("Error en búsqueda semántica:", err.message);
        res.status(500).json({ error: "Error en la búsqueda de la memoria." });
    }
});


// ENDPOINT DE SESIONES
app.get("/api/sesiones", async (req, res) => {
    const query = req.query.q || "";
    console.log("Búsqueda de sesiones:", query);
    
    // Consulta SQL usando tildes graves (backticks) y $1
    const sessionsQuery = `
        SELECT
            metricas->>'archivo_origen' as archivo,
            COUNT(*) as total_mensajes,
            MIN(timestamp) as inicio,
            MAX(timestamp) as fin,
            STRING_AGG(contenido, ' ||| ') as preview,
            SUM(CASE WHEN emisor = 'oscar' THEN 1 ELSE 0 END) as mensajes_oscar,
            SUM(CASE WHEN emisor = 'ancla' THEN 1 ELSE 0 END) as mensajes_ancla
        FROM conversaciones
        WHERE contenido ILIKE $1
        GROUP BY 1
        ORDER BY inicio DESC
        LIMIT 20
    `;

    try {
        // El parámetro de consulta debe ser un array que contenga el valor del LIKE
        const result = await dbClient.query(sessionsQuery, [`%${query}%`]);
        
        const sesiones = result.rows.map(sesion => {
            const fragmentos = sesion.preview.split(" ||| ")
                .filter(linea => linea.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 3);

            return {
                archivo: sesion.archivo,
                total_mensajes: parseInt(sesion.total_mensajes),
                inicio: sesion.inicio,
                fin: sesion.fin,
                mensajes_oscar: parseInt(sesion.mensajes_oscar),
                mensajes_ancla: parseInt(sesion.mensajes_ancla),
                fragmentos: fragmentos,
                relevancia: fragmentos.length
            };
        });
        res.json(sesiones);

    } catch (err) {
        console.error("Error en búsqueda de sesiones:", err.message);
        res.status(500).json({ error: "Error al recuperar sesiones." });
    }
});


// ENDPOINT PARA SESIÓN COMPLETA
app.get("/api/sesion/:archivo", async (req, res) => {
    const archivo = req.params.archivo;
    console.log("Solicitada sesión completa:", archivo);

    // Consulta SQL usando tildes graves (backticks) y $1
    const sessionQuery = `
        SELECT * FROM conversaciones
        WHERE metricas->>'archivo_origen' = $1
        ORDER BY timestamp ASC
    `;
    
    try {
        const result = await dbClient.query(sessionQuery, [archivo]);
        
        res.json({
            archivo: archivo,
            total_mensajes: result.rows.length,
            conversaciones: result.rows
        });
    } catch (err) {
        console.error("Error recuperando sesión:", err.message);
        res.status(500).json({ error: "Error al recuperar la sesión completa." });
    }
});

// HEALTH CHECK
app.get("/health", async (req, res) => {
    try {
        const result = await dbClient.query("SELECT COUNT(*) as count FROM conversaciones");
        const row = result.rows[0];
        
        res.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            database: "connected",
            total_conversaciones: row.count,
            environment: process.env.NODE_ENV || "development"
        });
    } catch (err) {
        res.status(500).json({
            status: "unhealthy",
            database: "error",
            error: err.message
        });
    }
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
    console.log("🌐 MEMORIA OSCAR WEB - PRODUCCIÓN ACTIVA (PostgreSQL/Vector)");
    console.log("📍 URL: http://localhost:" + PORT);
    console.log("📊 Health check: http://localhost:" + PORT + "/health");
});