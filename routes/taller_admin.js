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

// @route   GET /api/taller/clientes
// @desc    Obtener clientes que han tenido citas en el taller
// @access  Private (Admin)
router.get('/clientes', isAuthenticated, async (req, res) => {
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

        // Obtener clientes con citas en este taller
        const [clientes] = await db.query(`
            SELECT DISTINCT u.idUsuario, u.nombre, u.email, u.telefono,
                   COUNT(c.idCita) as totalCitas,
                   MAX(c.fechaHora) as ultimaCita
            FROM usuario u
            JOIN cliente cl ON u.idUsuario = cl.idUsuario
            JOIN cita c ON cl.idUsuario = c.idCliente
            JOIN mecanico m ON c.idMecanico = m.idUsuario
            WHERE m.idTaller = ?
            GROUP BY u.idUsuario, u.nombre, u.email, u.telefono
            ORDER BY totalCitas DESC
        `, [idTaller]);

        res.json(clientes);
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ error: 'Error al obtener clientes' });
    }
});

// @route   GET /api/taller/stats
// @desc    Obtener estadísticas generales del taller (incluyendo contador de mecánicos)
// @access  Private (Admin)
router.get('/stats', isAuthenticated, async (req, res) => {
    try {
        const [admin] = await db.query('SELECT idTaller FROM administrador WHERE idUsuario = ?', [req.session.userId]);
        if (!admin || admin.length === 0) return res.status(404).json({ error: 'Taller no encontrado' });
        const idTaller = admin[0].idTaller;

        const [mecanicos] = await db.query('SELECT COUNT(*) as total FROM mecanico WHERE idTaller = ?', [idTaller]);
        const [clientes] = await db.query(`
            SELECT COUNT(DISTINCT c.idCliente) as total 
            FROM cita c 
            JOIN mecanico m ON c.idMecanico = m.idUsuario 
            WHERE m.idTaller = ?`, [idTaller]);

        res.json({
            mecanicos: mecanicos[0].total,
            clientes: clientes[0].total
        });
    } catch (error) {
        console.error('Error stats:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// @route   GET /api/taller/resenas
// @desc    Obtener reseñas del taller
// @access  Private (Admin)
router.get('/resenas', isAuthenticated, async (req, res) => {
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

        // Obtener reseñas del taller
        const [resenas] = await db.query(`
            SELECT r.idResena, r.calificacion, r.comentario, r.fecha, r.respuesta_taller,
                   u.nombre as clienteNombre
            FROM resenas r
            JOIN usuario u ON r.idUsuario = u.idUsuario
            WHERE r.idTaller = ?
            ORDER BY r.fecha DESC
        `, [idTaller]);

        res.json(resenas);

    } catch (error) {
        console.error('Error al obtener reseñas:', error);
        res.status(500).json({ error: 'Error al obtener reseñas' });
    }
});

// @route   PUT /api/taller/resenas/:id/responder
// @desc    Responder a una reseña
// @access  Private (Admin)
router.put('/resenas/:id/responder', isAuthenticated, async (req, res) => {
    try {
        const { respuesta } = req.body;
        const idResena = req.params.id;

        const [admin] = await db.query('SELECT idTaller FROM administrador WHERE idUsuario = ?', [req.session.userId]);
        if (!admin || admin.length === 0) return res.status(404).json({ error: 'Taller no encontrado' });

        // Ensure review belongs to this taller
        const [resena] = await db.query('SELECT idResena FROM resenas WHERE idResena = ? AND idTaller = ?', [idResena, admin[0].idTaller]);
        if (!resena || resena.length === 0) return res.status(404).json({ error: 'Reseña no encontrada o no pertenece a este taller' });

        await db.query('UPDATE resenas SET respuesta_taller = ? WHERE idResena = ?', [respuesta, idResena]);
        res.json({ success: true, message: 'Respuesta guardada con éxito' });
    } catch (error) {
        console.error('Error al responder reseña:', error);
        res.status(500).json({ error: 'Error al guardar respuesta' });
    }
});

// @route   GET /api/taller/info
// @desc    Obtener información básica del taller (ID para compartir)
// @access  Private (Admin)
router.get('/info', isAuthenticated, async (req, res) => {
    try {
        const [admin] = await db.query(`
            SELECT t.idTaller, t.nombre, t.direccion, t.foto_perfil, t.telefono_contacto, t.redes_sociales
            FROM administrador a
            JOIN taller t ON a.idTaller = t.idTaller
            WHERE a.idUsuario = ?
        `, [req.session.userId]);

        if (!admin || admin.length === 0) return res.status(404).json({ error: 'Taller no encontrado' });

        res.json(admin[0]);
    } catch (error) {
        console.error('Error info:', error);
        res.status(500).json({ error: 'Error al obtener información' });
    }
});

// @route   GET /api/taller/perfil
// @desc    Obtener perfil completo del taller
// @access  Private (Admin)
router.get('/perfil', isAuthenticated, async (req, res) => {
    try {
        const [admin] = await db.query(`
            SELECT t.idTaller, t.nombre, t.foto_perfil, t.link_maps, t.telefono_contacto, t.redes_sociales
            FROM administrador a
            JOIN taller t ON a.idTaller = t.idTaller
            WHERE a.idUsuario = ?
        `, [req.session.userId]);

        if (!admin || admin.length === 0) return res.status(404).json({ error: 'Taller no encontrado' });

        res.json(admin[0]);
    } catch (error) {
        console.error('Error perfil:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
});

// @route   PUT /api/taller/perfil
// @desc    Actualizar perfil completo del taller
// @access  Private (Admin)
router.put('/perfil', isAuthenticated, async (req, res) => {
    try {
        const { nombre, link_maps, foto_perfil, telefono_contacto, redes_sociales } = req.body;

        const [admin] = await db.query('SELECT idTaller FROM administrador WHERE idUsuario = ?', [req.session.userId]);
        if (!admin || admin.length === 0) return res.status(404).json({ error: 'Taller no encontrado' });

        let query = 'UPDATE taller SET nombre = ?, link_maps = ?, telefono_contacto = ?, redes_sociales = ?';
        let params = [nombre || '', link_maps || '', telefono_contacto || '', redes_sociales || ''];

        if (foto_perfil) {
            query += ', foto_perfil = ?';
            params.push(foto_perfil);
        }

        query += ' WHERE idTaller = ?';
        params.push(admin[0].idTaller);

        await db.query(query, params);

        res.json({ success: true, message: 'Perfil actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

// @route   PUT /api/taller/perfil/foto
// @desc    Actualizar foto de perfil del taller
// @access  Private (Admin)
router.put('/perfil/foto', isAuthenticated, async (req, res) => {
    try {
        const { urlFoto } = req.body;

        const [admin] = await db.query('SELECT idTaller FROM administrador WHERE idUsuario = ?', [req.session.userId]);
        if (!admin || admin.length === 0) return res.status(404).json({ error: 'Taller no encontrado' });

        await db.query('UPDATE taller SET foto_perfil = ? WHERE idTaller = ?', [urlFoto, admin[0].idTaller]);

        res.json({ success: true, message: 'Foto de perfil actualizada exitosamente' });
    } catch (error) {
        console.error('Error al actualizar foto:', error);
        res.status(500).json({ error: 'Error al actualizar foto de perfil' });
    }
});

// @route   GET /api/taller/mecanicos
// @desc    Obtener lista de mecánicos del taller (pendientes y aprobados)
// @access  Private (Admin)
router.get('/mecanicos', isAuthenticated, async (req, res) => {
    try {
        const [admin] = await db.query('SELECT idTaller FROM administrador WHERE idUsuario = ?', [req.session.userId]);
        if (!admin || admin.length === 0) return res.status(404).json({ error: 'Taller no encontrado' });
        const idTaller = admin[0].idTaller;

        const [mecanicos] = await db.query(`
            SELECT u.idUsuario, u.nombre, u.email, u.telefono, m.especialidad, m.estado_solicitud
            FROM mecanico m
            JOIN usuario u ON m.idUsuario = u.idUsuario
            WHERE m.idTaller = ?
            ORDER BY m.estado_solicitud DESC, u.nombre ASC
        `, [idTaller]);

        res.json(mecanicos);
    } catch (error) {
        console.error('Error al obtener mecánicos:', error);
        res.status(500).json({ error: 'Error al obtener mecánicos' });
    }
});

// @route   PUT /api/taller/mecanicos/:id/aprobar
// @desc    Aprobar solicitud de un mecánico
// @access  Private (Admin)
router.put('/mecanicos/:id/aprobar', isAuthenticated, async (req, res) => {
    try {
        const idMecanico = req.params.id; // Es el idUsuario del mecánico
        const [admin] = await db.query('SELECT idTaller, nombre as adminNombre FROM administrador a JOIN usuario u ON a.idUsuario=u.idUsuario WHERE a.idUsuario = ?', [req.session.userId]);
        if (!admin || admin.length === 0) return res.status(404).json({ error: 'Taller no encontrado' });

        await db.query('UPDATE mecanico SET estado_solicitud = ? WHERE idUsuario = ? AND idTaller = ?', ['APROBADO', idMecanico, admin[0].idTaller]);

        // Notificar al mecánico
        await db.query(
            'INSERT INTO notificacion (idUsuario, titulo, mensaje, tipo) VALUES (?, ?, ?, ?)',
            [idMecanico, '¡Solicitud Aprobada!', 'Tu solicitud para unirte al taller ha sido aprobada. Ya puedes ingresar al portal de mecánicos.', 'cita']
        );

        res.json({ success: true, message: 'Mecánico aprobado exitosamente.' });
    } catch (error) {
        console.error('Error al aprobar mecánico:', error);
        res.status(500).json({ error: 'Error al aprobar mecánico' });
    }
});

// @route   PUT /api/taller/mecanicos/:id/remover
// @desc    Dar de baja a un mecánico del taller
// @access  Private (Admin)
router.put('/mecanicos/:id/remover', isAuthenticated, async (req, res) => {
    let connection;
    try {
        const idMecanico = req.params.id; // Es el idUsuario del mecánico
        const [admin] = await db.query('SELECT idTaller from administrador WHERE idUsuario = ?', [req.session.userId]);
        if (!admin || admin.length === 0) return res.status(404).json({ error: 'Taller no encontrado' });
        const idTaller = admin[0].idTaller;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Reasignar citas "En Proceso" a "Pendiente" y quitar mecánico
        await connection.query(
            "UPDATE cita SET estado = 'Pendiente', idMecanico = NULL WHERE idMecanico = ? AND idTaller = ? AND estado = 'En Proceso'",
            [idMecanico, idTaller]
        );

        // 2. Eliminar al mecánico de la tabla mecanico para que pierda el acceso al taller
        await connection.query('DELETE FROM mecanico WHERE idUsuario = ? AND idTaller = ?', [idMecanico, idTaller]);

        // 3. Notificar al mecánico
        await connection.query(
            'INSERT INTO notificacion (idUsuario, titulo, mensaje, tipo) VALUES (?, ?, ?, ?)',
            [idMecanico, 'Baja del Taller', 'Has sido dado de baja del taller. Ya no tienes acceso a sus citas ni servicios.', 'cita']
        );

        await connection.commit();
        res.json({ success: true, message: 'Mecánico removido y sus citas en proceso fueron regresadas a Pendiente.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error al remover mecánico:', error);
        res.status(500).json({ error: 'Error al remover mecánico' });
    } finally {
        if (connection) connection.release();
    }
});

// ==========================================
// PUNTO DE VENTA (POS)
// ==========================================

// @route   POST /api/taller/pos/venta
// @desc    Registrar venta física de un producto (reduce stock)
// @access  Private (Admin)
router.post('/pos/venta', isAuthenticated, async (req, res) => {
    let connection;
    try {
        const { idItem, cantidad } = req.body;
        if (!idItem || !cantidad || cantidad <= 0) return res.status(400).json({ error: 'Datos inválidos' });

        const [admin] = await db.query('SELECT idTaller FROM administrador WHERE idUsuario = ?', [req.session.userId]);
        if (!admin || admin.length === 0) return res.status(404).json({ error: 'Taller no encontrado' });

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [item] = await connection.query('SELECT stock, nombre, precio FROM iteminventario WHERE idItem = ? AND idTaller = ? FOR UPDATE', [idItem, admin[0].idTaller]);

        if (!item || item.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Producto no encontrado en tu inventario' });
        }

        if (item[0].stock < cantidad) {
            await connection.rollback();
            return res.status(400).json({ error: 'Stock insuficiente' });
        }

        await connection.query('UPDATE iteminventario SET stock = stock - ? WHERE idItem = ?', [cantidad, idItem]);

        await connection.commit();
        res.json({ success: true, message: 'Venta registrada con éxito', item: item[0] });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en POS venta:', error);
        res.status(500).json({ error: 'Error al registrar venta' });
    } finally {
        if (connection) connection.release();
    }
});

// @route   POST /api/taller/pos/cita/:id/cobrar
// @desc    Generar código de cobro en efectivo para una cita
// @access  Private (Admin)
router.post('/pos/cita/:id/cobrar', isAuthenticated, async (req, res) => {
    try {
        const idCita = req.params.id;
        const [admin] = await db.query('SELECT idTaller FROM administrador WHERE idUsuario = ?', [req.session.userId]);
        if (!admin || admin.length === 0) return res.status(404).json({ error: 'Taller no encontrado' });

        const [cita] = await db.query('SELECT estado FROM cita WHERE idCita = ? AND idTaller = ?', [idCita, admin[0].idTaller]);
        if (!cita || cita.length === 0) return res.status(404).json({ error: 'Cita no encontrada o no pertenece a tu taller' });

        if (cita[0].estado !== 'Esperando Confirmacion Cliente') {
            return res.status(400).json({ error: 'La cita debe estar en estado Esperando Confirmacion Cliente para cobrar en persona.' });
        }

        // Generar código alfanumérico corto (ej. 6 caracteres)
        const { customAlphabet } = require('nanoid');
        const nanoidShort = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
        const codigo = nanoidShort();

        await db.query('UPDATE cita SET codigo_pago_efectivo = ? WHERE idCita = ?', [codigo, idCita]);

        res.json({ success: true, codigo, message: 'Código generado con éxito' });

    } catch (error) {
        console.error('Error al generar código POS Cita:', error);
        res.status(500).json({ error: 'Error al generar código de cobro' });
    }
});

module.exports = router;
