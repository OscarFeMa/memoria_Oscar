const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const db = new sqlite3.Database("../database/memoria.db");

// Configuración de archivos estáticos CORREGIDA
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// SERVIR ARCHIVOS DE IMPORTS - RUTA ABSOLUTA
const importsPath = path.resolve(__dirname, "../imports");
app.use("/archivos", express.static(importsPath, {
    setHeaders: (res, filePath) => {
        // Configurar headers para diferentes tipos de archivo
        const ext = path.extname(filePath);
        if (ext === '.pdf') {
            res.setHeader('Content-Type', 'application/pdf');
        } else if (ext === '.txt') {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        } else if (ext === '.html') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
        }
    }
}));

// Endpoint para verificar archivos disponibles
app.get("/api/archivos-disponibles", (req, res) => {
    fs.readdir(importsPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: "No se puede acceder a la carpeta imports" });
        }
        
        const archivos = files.map(file => {
            const filePath = path.join(importsPath, file);
            try {
                const stats = fs.statSync(filePath);
                return {
                    nombre: file,
                    ruta: `/archivos/${file}`,
                    rutaCompleta: filePath,
                    existe: true,
                    tamanio: stats.size,
                    extension: path.extname(file)
                };
            } catch (e) {
                return {
                    nombre: file,
                    existe: false,
                    error: e.message
                };
            }
        }).filter(archivo => archivo.existe);
        
        res.json({
            rutaBase: importsPath,
            totalArchivos: archivos.length,
            archivos: archivos
        });
    });
});

// [MANTENER TODOS LOS ENDPOINTS ANTERIORES...]

// Endpoint raíz
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(3000, () => {
    console.log("🎯 Servidor corriendo en http://localhost:3000");
    console.log("📁 Archivos disponibles en: http://localhost:3000/archivos/");
    console.log("🔍 Verificar archivos: http://localhost:3000/api/archivos-disponibles");
});
