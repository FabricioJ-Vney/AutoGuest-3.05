const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Middleware de autenticación para administrador de taller
const isAuthenticated = (req, res, next) => {
    if (req.session.userId && req.session.role === 'taller') {
        next();
    } else {
        res.status(401).json({ error: 'Acceso no autorizado' });
    }
};

// @route   GET /api/taller/citas-hoy
// @desc    Obtener citas de hoy del taller
// @access  Private (Admin)
router.get('/citas-hoy', isAuthenticated, async (req, res) => {
    try {
        // Obtener idTaller del administrador
        const [admin] = await db.query(
            'SELECT idTaller FROM administrador WHERE idUsuario = ?',
            [req.session.userId]
        );

        if (!admin || admin.length === 0) {
            return res.status(404).json({ error: 'Taller no encontrado' });
        }

        const idTaller = admin[0].idTaller;

        // Obtener citas de hoy
        const [citas] = await db.query(`
            SELECT c.idCita, c.fechaHora, c.estado,
                   u.nombre as clienteNombre,
                   v.marca, v.modelo, v.placa,
                   m.nombre as mecanicoNombre
            FROM cita c
            JOIN cliente cl ON c.idCliente = cl.idUsuario
            JOIN usuario u ON cl.idUsuario = u.idUsuario
            JOIN vehiculo v ON c.idVehiculo = v.idVehiculo
            LEFT JOIN mecanico mec ON c.idMecanico = mec.idUsuario
            LEFT JOIN usuario m ON mec.idUsuario = m.idUsuario
            WHERE c.idTaller = ?
              AND c.estado = 'En Proceso'
              AND DATE(c.fechaHora) = CURDATE()
            ORDER BY c.fechaHora ASC
        `, [idTaller]);

        res.json(citas);

    } catch (error) {
        console.error('Error al obtener citas de hoy:', error);
        res.status(500).json({ error: 'Error al obtener citas' });
    }
});

// @route   GET /api/taller/citas
// @desc    Obtener todas las citas del taller
// @access  Private (Admin)
router.get('/citas', isAuthenticated, async (req, res) => {
    try {
        // Obtener idTaller del administrador
        const [admin] = await db.query(
            'SELECT idTaller FROM administrador WHERE idUsuario = ?',
            [req.session.userId]
        );

        if (!admin || admin.length === 0) {
            return res.status(404).json({ error: 'Taller no encontrado' });
        }

        const idTaller = admin[0].idTaller;

        // Obtener todas las citas
        const [citas] = await db.query(`
            SELECT c.idCita, c.fechaHora, c.estado,
                   u.nombre as clienteNombre,
                   v.marca, v.modelo, v.placa,
                   mec.idUsuario as idMecanico,
                   m.nombre as mecanicoNombre
            FROM cita c
            JOIN cliente cl ON c.idCliente = cl.idUsuario
            JOIN usuario u ON cl.idUsuario = u.idUsuario
            JOIN vehiculo v ON c.idVehiculo = v.idVehiculo
            LEFT JOIN mecanico mec ON c.idMecanico = mec.idUsuario
            LEFT JOIN usuario m ON mec.idUsuario = m.idUsuario
            WHERE c.idTaller = ?
            ORDER BY c.fechaHora DESC
        `, [idTaller]);

        console.log(`DEBUG: /api/taller/citas - Found ${citas.length} appointments for workshop ${idTaller}`);
        res.json(citas);

    } catch (error) {
        console.error('Error al obtener citas:', error);
        res.status(500).json({ error: 'Error al obtener citas' });
    }
});

// @route   GET /api/taller/citas/:id
// @desc    Obtener detalles de una cita específica
// @access  Private (Admin)
router.get('/citas/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        // Obtener idTaller del administrador
        const [admin] = await db.query(
            'SELECT idTaller FROM administrador WHERE idUsuario = ?',
            [req.session.userId]
        );

        if (!admin || admin.length === 0) {
            return res.status(404).json({ error: 'Taller no encontrado' });
        }

        const idTaller = admin[0].idTaller;

        // Obtener detalles de la cita
        const [cita] = await db.query(`
            SELECT c.idCita, c.fechaHora, c.estado,
                   u.nombre as clienteNombre, u.email as clienteEmail,
                   v.marca, v.modelo, v.placa,
                   m.nombre as mecanicoNombre
            FROM cita c
            JOIN cliente cl ON c.idCliente = cl.idUsuario
            JOIN usuario u ON cl.idUsuario = u.idUsuario
            JOIN vehiculo v ON c.idVehiculo = v.idVehiculo
            LEFT JOIN mecanico mec ON c.idMecanico = mec.idUsuario
            LEFT JOIN usuario m ON mec.idUsuario = m.idUsuario
            WHERE c.idCita = ? AND c.idTaller = ?
        `, [id, idTaller]);

        if (cita.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }

        res.json(cita[0]);

    } catch (error) {
        console.error('Error al obtener detalles de la cita:', error);
        res.status(500).json({ error: 'Error al obtener detalles' });
    }
});

// @route   GET /api/taller/mecanicos-activos
// @desc    Obtener mecánicos del taller
// @access  Private (Admin)
router.get('/mecanicos-activos', isAuthenticated, async (req, res) => {
    try {
        // Obtener idTaller del administrador
        const [admin] = await db.query(
            'SELECT idTaller FROM administrador WHERE idUsuario = ?',
            [req.session.userId]
        );

        if (!admin || admin.length === 0) {
            return res.status(404).json({ error: 'Taller no encontrado' });
        }

        const idTaller = admin[0].idTaller;

        // Obtener mecánicos del taller
        const [mecanicos] = await db.query(`
            SELECT m.idUsuario, u.nombre, m.especialidad
            FROM mecanico m
            JOIN usuario u ON m.idUsuario = u.idUsuario
            WHERE m.idTaller = ? AND m.estado_solicitud = 'APROBADO'
            ORDER BY u.nombre ASC
        `, [idTaller]);

        res.json(mecanicos);

    } catch (error) {
        console.error('Error al obtener mecánicos:', error);
        res.status(500).json({ error: 'Error al obtener mecánicos' });
    }
});

// @route   PUT /api/taller/citas/:id/mecanico
// @desc    Cambiar mecánico asignado a una cita
// @access  Private (Admin)
router.put('/citas/:id/mecanico', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { idMecanico } = req.body;

    if (!idMecanico) {
        return res.status(400).json({ error: 'ID de mecánico es obligatorio' });
    }

    try {
        // Obtener idTaller del administrador
        const [admin] = await db.query(
            'SELECT idTaller FROM administrador WHERE idUsuario = ?',
            [req.session.userId]
        );

        if (!admin || admin.length === 0) {
            return res.status(404).json({ error: 'Taller no encontrado' });
        }

        const idTaller = admin[0].idTaller;

        // Verificar que el mecánico pertenece al taller
        const [mecanico] = await db.query(
            'SELECT * FROM mecanico WHERE idUsuario = ? AND idTaller = ?',
            [idMecanico, idTaller]
        );

        if (!mecanico || mecanico.length === 0) {
            return res.status(404).json({ error: 'Mecánico no encontrado en este taller' });
        }

        // Actualizar mecánico de la cita
        await db.query(
            'UPDATE cita SET idMecanico = ? WHERE idCita = ?',
            [idMecanico, id]
        );

        res.json({
            success: true,
            mensaje: 'Mecánico asignado exitosamente'
        });

    } catch (error) {
        console.error('Error al cambiar mecánico:', error);
        res.status(500).json({ error: 'Error al cambiar mecánico' });
    }
});

// @route   PUT /api/taller/citas/:id/completar
// @desc    Marcar cita como completada
// @access  Private (Admin)
router.put('/citas/:id/completar', isAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        // Obtener idTaller del administrador
        const [admin] = await db.query(
            'SELECT idTaller FROM administrador WHERE idUsuario = ?',
            [req.session.userId]
        );

        if (!admin || admin.length === 0) {
            return res.status(404).json({ error: 'Taller no encontrado' });
        }

        const idTaller = admin[0].idTaller;

        // Verificar que la cita pertenece al taller y obtener estado actual
        const [cita] = await db.query(`
            SELECT c.estado
            FROM cita c
            JOIN mecanico m ON c.idMecanico = m.idUsuario
            WHERE c.idCita = ? AND m.idTaller = ?
        `, [id, idTaller]);

        if (!cita || cita.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada o no pertenece a este taller' });
        }

        // Validar que no esté cancelada
        if (cita[0].estado === 'Cancelado') {
            return res.status(400).json({ error: 'No se puede completar una cita cancelada' });
        }

        // Actualizar estado a Esperando Confirmacion Cliente
        await db.query(
            'UPDATE cita SET estado = ? WHERE idCita = ?',
            ['Esperando Confirmacion Cliente', id]
        );

        // Notificar al cliente
        const [citaRow] = await db.query('SELECT idCliente FROM cita WHERE idCita = ?', [id]);
        if (citaRow.length > 0) {
            const idCliente = citaRow[0].idCliente;
            await db.query(
                'INSERT INTO notificacion (idUsuario, titulo, mensaje, tipo) VALUES (?, ?, ?, ?)',
                [idCliente, 'Auto listo para entrega', 'El taller ha marcado como finalizado el trabajo para la cita ' + id + '. Por favor, confirma la entrega en tu portal.', 'cita']
            );
        }

        res.json({
            success: true,
            mensaje: 'Cita marcada como esperando confirmación exitosamente'
        });

    } catch (error) {
        console.error('Error al completar cita:', error);
        res.status(500).json({ error: 'Error al completar la cita' });
    }
});

module.exports = router;
