const { GoogleGenAI } = require("@google/genai");
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require("dotenv");

// Load environment variables (DB_URL, GEMINI_API_KEY)
// Assumes the .env file is one level up (../.env)
dotenv.config({ path: '../.env' });

const connectionString = process.env.DATABASE_URL;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const embeddingModel = "text-embedding-004";
const BATCH_SIZE = 50; // Process in batches of 50 fragments for the API

// Database client
const dbClient = new Client({ connectionString: connectionString });

// Function to generate embeddings for a batch of text
async function generarEmbeddingsBatch(textos) {
    if (!ai || !embeddingModel) return null;
    try {
        // The API expects an array of strings to generate batch embeddings
        const response = await ai.models.generateEmbeddings({
            model: embeddingModel,
            content: textos
        });
        return response.embeddings; 
    } catch (error) {
        console.error("❌ Error generating embeddings in the script:", error.message);
        // Returns an array of nulls if the batch fails
        return Array(textos.length).fill(null);
    }
}

// Main initialization and import function
async function initDb() {
    console.log("🚀 Starting the import and vectorization process...");
    
    if (!connectionString || !process.env.GEMINI_API_KEY) {
        console.error("❌ ERROR: DATABASE_URL or GEMINI_API_KEY are not configured in .env.");
        return;
    }
    
    try {
        await dbClient.connect();
        console.log("✅ PostgreSQL connection established.");
        
        // 1. **CRITICAL STEP:** Ensure the 'vector' extension is enabled
        console.log("🛠️ Ensuring 'vector' extension...");
        // This solves the 'type "vector" does not exist' error
        await dbClient.query("CREATE EXTENSION IF NOT EXISTS vector;");
        console.log("✅ 'vector' extension secured.");

        // 2. DROP table if it exists to ensure a clean run
        console.log("🗑️ Deleting old 'conversaciones' table for clean import...");
        await dbClient.query("DROP TABLE IF EXISTS conversaciones;");
        console.log("✅ Old table deleted.");

        // 3. Create table
        const createTableQuery = `
            CREATE TABLE conversaciones (
                id SERIAL PRIMARY KEY,
                contenido TEXT NOT NULL,
                emisor TEXT,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                metricas JSONB,
                embedding VECTOR(1536) NOT NULL
            );
        `;
        await dbClient.query(createTableQuery);
        console.log("✅ 'conversaciones' table created.");

        // 4. Read and fragment the text file
        const filePath = path.join(__dirname, 'conversaciones.txt'); // Assumes the file is in backend/
        if (!fs.existsSync(filePath)) {
            console.error("❌ ERROR: 'conversaciones.txt' file not found in:", filePath);
            return;
        }

        const data = fs.readFileSync(filePath, 'utf8');
        // Fragment text by new lines, filtering out empty lines
        const fragmentos = data.split('\n').filter(line => line.trim() !== '');
        
        console.log(`💬 Found ${fragmentos.length} conversation fragments to process.`);
        if (fragmentos.length === 0) {
            console.log("🚨 No fragments found, ending import process.");
            return;
        }

        // 5. Batch Processing
        for (let i = 0; i < fragmentos.length; i += BATCH_SIZE) {
            const batchTextos = fragmentos.slice(i, i + BATCH_SIZE);
            
            // Generate embeddings for the batch
            const batchEmbeddings = await generarEmbeddingsBatch(batchTextos);
            
            if (!batchEmbeddings || batchEmbeddings.some(e => e === null)) {
                console.error(`❌ Embedding generation failed for batch ${i} to ${i + BATCH_SIZE}. Skipping batch.`);
                continue;
            }

            // 6. Prepare Insertion Query (INSERT)
            const values = batchTextos.map((texto, index) => {
                const vector = batchEmbeddings[index].values;
                // Format [0.1, 0.2, 0.3, ...] required by PostgreSQL VECTOR type
                const vectorString = `[${vector.join(',')}]`;
                
                // Infer sender (emisor) and basic metrics
                let emisor = 'desconocido';
                let metricas = {};

                // Simple sender inference (adjust based on your file format)
                if (texto.toLowerCase().startsWith('oscar:')) {
                    emisor = 'oscar';
                    texto = texto.substring(6).trim(); // Remove prefix
                } else if (texto.toLowerCase().startsWith('ancla:')) {
                    emisor = 'ancla';
                    texto = texto.substring(6).trim(); // Remove prefix
                } else {
                    // If no sender prefix, use original text
                }

                metricas['archivo_origen'] = path.basename(filePath); // Save source file name

                // Sanitize content and use the ::vector conversion
                // E'...' allows special characters in PostgreSQL. Replace single quotes with double single quotes (escapado).
                const contenidoSanitizado = texto.replace(/'/g, "''");
                const metricasJSON = JSON.stringify(metricas).replace(/'/g, "''");

                // The conversion (::vector) is CRITICAL here for the data type.
                return `(E'${contenidoSanitizado}', '${emisor}', '${metricasJSON}', '${vectorString}'::vector)`;
            });
            
            if (values.length > 0) {
                const insertQuery = `
                    INSERT INTO conversaciones (contenido, emisor, metricas, embedding)
                    VALUES ${values.join(',')}
                `;
                
                await dbClient.query(insertQuery);
                console.log(`[${i}/${fragmentos.length}] ✅ Batch processed and saved.`);
            }
        }

        console.log("🎉 Import and vectorization completed successfully.");
        
        // Final check
        const countResult = await dbClient.query("SELECT COUNT(*) AS count FROM conversaciones");
        console.log(`📊 TOTAL MEMORIES IN THE DATABASE: ${countResult.rows[0].count}`);

    } catch (error) {
        console.error("❌ Complete import process failed:", error.message);
    } finally {
        await dbClient.end();
        console.log("🔌 PostgreSQL connection closed.");
    }
}

initDb();