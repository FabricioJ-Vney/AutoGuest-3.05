const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Middleware de autenticación (Reutilizable)
const isAuthenticated = (req, res, next) => {
    if (req.session.userId || req.session.tallerId || req.session.role) {
        next();
    } else {
        res.status(401).json({ error: 'Acceso no autorizado' });
    }
};

router.get('/', isAuthenticated, async (req, res) => {
    const idUsuario = req.session.userId;

    if (!idUsuario) {
        return res.status(400).json({ error: 'No se pudo identificar al usuario' });
    }

    try {
        const [notificaciones] = await db.query(
            'SELECT * FROM notificacion WHERE idUsuario = ? AND leida = FALSE ORDER BY fechaCreacion DESC LIMIT 20',
            [idUsuario]
        );
        res.json(notificaciones);
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
});

// Marcar notificación como leída
router.put('/:id/leer', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const idUsuario = req.session.userId;

    try {
        await db.query(
            'UPDATE notificacion SET leida = TRUE WHERE idNotificacion = ? AND idUsuario = ?',
            [id, idUsuario]
        );
        res.json({ success: true, message: 'Notificación marcada como leída' });
    } catch (error) {
        console.error('Error al marcar notificación:', error);
        res.status(500).json({ error: 'Error al marcar notificación' });
    }
});

// Marcar todas las notificaciones como leídas
router.put('/leer-todas', isAuthenticated, async (req, res) => {
    const idUsuario = req.session.userId;

    try {
        await db.query(
            'UPDATE notificacion SET leida = TRUE WHERE idUsuario = ? AND leida = FALSE',
            [idUsuario]
        );
        res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        console.error('Error al marcar todas como leídas:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
});

module.exports = router;
