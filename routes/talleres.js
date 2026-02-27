// Archivo: routes/talleres.js
const express = require('express');
const db = require('../config/database');
const { nanoid } = require('nanoid');
const router = express.Router();

// Ruta para obtener todos los talleres
router.get('/', async (req, res) => {
    try {
        // Esta consulta trae los 50 talleres de tu base de datos
        const [rows] = await db.query('SELECT idTaller, nombre, direccion, foto_perfil FROM taller');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener talleres:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// 2. Obtener DETALLE de un taller específico (Info + Servicios + Reseñas)
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // A) Info del taller
        const [taller] = await db.query('SELECT * FROM taller WHERE idTaller = ?', [id]);
        if (taller.length === 0) return res.status(404).json({ message: 'Taller no encontrado' });

        // B) Servicios (Tabla servicio)
        const [servicios] = await db.query('SELECT * FROM servicio WHERE idTaller = ?', [id]);

        // C) Productos (Para saber si mostrar botón de catálogo)
        const [productos] = await db.query('SELECT count(*) as total FROM iteminventario WHERE idTaller = ? AND esParaVenta = 1', [id]);
        const tieneProductos = productos[0].total > 0;

        // D) Reseñas
        const [resenas] = await db.query(`
            SELECT r.*, u.nombre as nombreCliente 
            FROM resenas r 
            JOIN usuario u ON r.idUsuario = u.idUsuario 
            WHERE r.idTaller = ? 
            ORDER BY r.fecha DESC`, [id]);

        res.json({
            info: taller[0],
            servicios: servicios,
            resenas: resenas,
            tieneProductos: tieneProductos
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// 3. Guardar una nueva RESEÑA
router.post('/:id/resenas', async (req, res) => {
    const { idTaller } = req.params;
    const { idUsuario, calificacion, comentario } = req.body;

    try {
        await db.query('INSERT INTO resenas (idTaller, idUsuario, calificacion, comentario) VALUES (?, ?, ?, ?)',
            [idTaller, idUsuario, calificacion, comentario]);
        res.json({ success: true, message: 'Reseña guardada' });
    } catch (error) {
        res.status(500).json({ error: 'No se pudo guardar la reseña' });
    }
});
module.exports = router;