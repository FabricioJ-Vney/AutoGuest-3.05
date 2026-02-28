const express = require('express');
const db = require('../config/database');
const router = express.Router();
const { nanoid } = require('nanoid');

// Middleware de autenticación
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Acceso no autorizado' });
    }
};

// @route   GET /api/inventario
// @desc    Obtener productos de un taller (Público / Catálogo)
// @access  Public
router.get('/', async (req, res) => {
    const { idTaller } = req.query; // Para filtrar productos por taller en el catálogo
    try {
        let query = 'SELECT idItem, nombre, precio, stock, imagen FROM iteminventario WHERE esParaVenta = 1';
        let params = [];
        if (idTaller) {
            query += ' AND idTaller = ?';
            params.push(idTaller);
        }

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// @route   GET /api/inventario/taller
// @desc    Obtener inventario completo del taller autenticado
// @access  Private (Admin)
router.get('/taller', isAuthenticated, async (req, res) => {
    try {
        const idTaller = req.session.tallerId;
        if (!idTaller) return res.status(403).json({ error: 'No es admin de taller (inicia sesión de Taller)' });

        const [rows] = await db.query('SELECT * FROM iteminventario WHERE idTaller = ?', [idTaller]);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener inventario:', error);
        res.status(500).json({ error: 'Error al obtener inventario' });
    }
});

// @route   POST /api/inventario
// @desc    Crear un nuevo producto en el inventario
// @access  Private (Admin)
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const { nombre, precio, stock, esParaVenta, imagen } = req.body;

        const idTaller = req.session.tallerId;
        if (!idTaller) return res.status(403).json({ error: 'No es admin de taller' });

        const idItem = nanoid(10);
        await db.query(
            'INSERT INTO iteminventario (idItem, nombre, precio, stock, esParaVenta, idTaller, imagen) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [idItem, nombre, precio, stock, esParaVenta ? 1 : 0, idTaller, imagen || null]
        );

        res.status(201).json({ success: true, message: 'Producto creado', idItem });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// @route   PUT /api/inventario/:id
// @desc    Actualizar producto
// @access  Private (Admin)
router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const { nombre, precio, stock, esParaVenta, imagen } = req.body;
        const idItem = req.params.id;

        const idTaller = req.session.tallerId;
        if (!idTaller) return res.status(403).json({ error: 'No es admin de taller' });

        await db.query(
            'UPDATE iteminventario SET nombre=?, precio=?, stock=?, esParaVenta=?, imagen=? WHERE idItem=? AND idTaller=?',
            [nombre, precio, stock, esParaVenta ? 1 : 0, imagen || null, idItem, idTaller]
        );

        res.json({ success: true, message: 'Producto actualizado' });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// @route   DELETE /api/inventario/:id
// @desc    Eliminar producto
// @access  Private (Admin)
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const idItem = req.params.id;

        const idTaller = req.session.tallerId;
        if (!idTaller) return res.status(403).json({ error: 'No es admin de taller' });

        await db.query('DELETE FROM iteminventario WHERE idItem=? AND idTaller=?', [idItem, idTaller]);
        res.json({ success: true, message: 'Producto eliminado' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

module.exports = router;
