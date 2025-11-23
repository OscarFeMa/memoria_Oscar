const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' }); // Cargar .env

// Asegúrate de que la variable DATABASE_URL está definida en tu .env o Railway
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ ERROR: La variable DATABASE_URL no está definida.");
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
});

async function initializeDatabase() {
    try {
        await client.connect();
        console.log("✅ Conexión a PostgreSQL exitosa.");

        // 1. Instalar la extensión pgvector (necesaria para el tipo de dato VECTOR)
        console.log("🛠️ Creando extensión 'vector'...");
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');
        console.log("✅ Extensión creada/verificada.");

        // 2. Crear la tabla 'conversaciones' con la columna 'embedding' tipo VECTOR
        const createTableQuery = 
            CREATE TABLE IF NOT EXISTS conversaciones (
                id SERIAL PRIMARY KEY,
                timestamp BIGINT NOT NULL,
                contenido TEXT NOT NULL,
                emisor VARCHAR(50) NOT NULL,
                metricas JSONB,
                -- 🚨 VECTOR(768) define el tipo de vector con 768 dimensiones
                embedding VECTOR(768)
            );
        ;
        console.log("🛠️ Creando tabla 'conversaciones' con VECTOR(768)...");
        await client.query(createTableQuery);
        console.log("✅ Tabla creada/verificada.");

    } catch (err) {
        console.error("❌ ERROR en la inicialización de la base de datos:", err);
    } finally {
        await client.end();
    }
}

initializeDatabase();
