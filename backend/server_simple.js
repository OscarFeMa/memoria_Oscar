const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const db = new sqlite3.Database("../database/memoria.db");

app.use(express.json());

// SERVIR ARCHIVOS ESTÁTICOS CORRECTAMENTE
app.use(express.static(path.join(__dirname, "../frontend")));

// Ruta raíz - enviar index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// [INSERTAR AQUÍ TODOS LOS ENDPOINTS DE LA MEMORIA...]

app.listen(3000, () => {
    console.log("🎯 Memoria Oscar corriendo en http://localhost:3000");
});
