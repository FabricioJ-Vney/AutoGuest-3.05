const express = require('express');
const db = require('../config/database');
const { nanoid } = require('nanoid');
const router = express.Router();

// ============================================================
// INICIALIZAR TABLA DE CHAT (se crea automáticamente si no existe)
// ============================================================
async function initChatTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_mensaje (
                idMensaje VARCHAR(20) PRIMARY KEY,
                idCita VARCHAR(20) NOT NULL,
                remitenteId VARCHAR(20) NOT NULL,
                remitenteTipo ENUM('cliente', 'mecanico') NOT NULL,
                tipoContenido ENUM('texto', 'imagen') NOT NULL DEFAULT 'texto',
                contenido LONGTEXT NOT NULL,
                nombreArchivo VARCHAR(255) NULL,
                leido TINYINT(1) NOT NULL DEFAULT 0,
                fechaEnvio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_idCita (idCita),
                INDEX idx_fechaEnvio (fechaEnvio)
            )
        `);
        console.log('[Chat] Tabla chat_mensaje verificada/creada correctamente.');
    } catch (err) {
        console.error('[Chat] Error al crear tabla chat_mensaje:', err.message);
    }
}

// Ejecutar al cargar el módulo
initChatTable();

// ============================================================
// IMPORTANTE: Las rutas MÁS ESPECÍFICAS van PRIMERO en Express
// ============================================================

// GET /api/chat/:idCita/no-leidos - Contar mensajes no leídos (PRIMERO - más específica)
router.get('/:idCita/no-leidos', async (req, res) => {
    const { idCita } = req.params;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const otroTipo = role === 'mecanico' ? 'cliente' : 'mecanico';
        const [result] = await db.query(
            'SELECT COUNT(*) as total FROM chat_mensaje WHERE idCita = ? AND remitenteTipo = ? AND leido = 0',
            [idCita, otroTipo]
        );
        res.json({ noLeidos: result[0].total });
    } catch (error) {
        console.error('[Chat] Error al contar mensajes:', error);
        res.status(500).json({ error: 'Error al contar mensajes' });
    }
});

// ============================================================
// GET /api/chat/:idCita - Obtener historial de mensajes
// ============================================================
router.get('/:idCita', async (req, res) => {
    const { idCita } = req.params;

    const userId = req.session.userId;
    const role = req.session.role;

    if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        // DEBUG: Ver qué datos llegan en la sesión
        console.log(`[Chat GET] idCita=${idCita} | userId=${userId} | role=${role}`);

        // Verificar que la cita existe y el usuario tiene relación con ella
        let citaQuery;
        if (role === 'mecanico') {
            citaQuery = await db.query(
                'SELECT idCita FROM cita WHERE idCita = ? AND idMecanico = ?',
                [idCita, userId]
            );
        } else if (role === 'taller') {
            citaQuery = await db.query(
                'SELECT c.idCita FROM cita c JOIN administrador a ON a.idUsuario = ? WHERE c.idCita = ? AND c.idTaller = a.idTaller',
                [userId, idCita]
            );
        } else {
            // Cliente
            citaQuery = await db.query(
                'SELECT idCita FROM cita WHERE idCita = ? AND idCliente = ?',
                [idCita, userId]
            );
        }

        console.log(`[Chat GET] citaQuery result length=${citaQuery[0].length}`);

        if (citaQuery[0].length === 0) {
            return res.status(403).json({ error: 'No tienes acceso a este chat' });
        }

        // Obtener mensajes ordenados por fecha
        const [mensajes] = await db.query(`
            SELECT 
                m.idMensaje,
                m.remitenteId,
                m.remitenteTipo,
                m.tipoContenido,
                m.contenido,
                m.nombreArchivo,
                m.leido,
                m.fechaEnvio,
                u.nombre AS remitenteNombre
            FROM chat_mensaje m
            JOIN usuario u ON m.remitenteId = u.idUsuario
            WHERE m.idCita = ?
            ORDER BY m.fechaEnvio ASC
        `, [idCita]);

        // Marcar como leídos los mensajes del otro participante SOLO si no es taller
        if (role !== 'taller') {
            const otroTipo = role === 'mecanico' ? 'cliente' : 'mecanico';
            await db.query(
                'UPDATE chat_mensaje SET leido = 1 WHERE idCita = ? AND remitenteTipo = ? AND leido = 0',
                [idCita, otroTipo]
            );
        }

        res.json(mensajes);
    } catch (error) {
        console.error('[Chat] Error al obtener mensajes:', error);
        res.status(500).json({ error: 'Error al obtener mensajes' });
    }
});

// ============================================================
// POST /api/chat/:idCita - Enviar un mensaje (texto o imagen)
// ============================================================
router.post('/:idCita', async (req, res) => {
    const { idCita } = req.params;
    const { contenido, tipoContenido, nombreArchivo } = req.body;

    const userId = req.session.userId;
    const role = req.session.role;

    if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    // Taller no puede enviar mensajes, solo leer
    if (role === 'taller') {
        return res.status(403).json({ error: 'El administrador del taller solo puede ver el chat (solo lectura)' });
    }

    if (!contenido || !tipoContenido) {
        return res.status(400).json({ error: 'Contenido y tipo de contenido son requeridos' });
    }

    // Validar tipos permitidos
    if (!['texto', 'imagen'].includes(tipoContenido)) {
        return res.status(400).json({ error: 'Tipo de contenido no válido' });
    }

    // Validar tamaño de imagen (máx 5MB en base64 = ~6.7MB de texto)
    if (tipoContenido === 'imagen' && contenido.length > 7000000) {
        return res.status(400).json({ error: 'La imagen es demasiado grande. Máximo 5MB.' });
    }

    // Determinar el tipo de remitente
    const remitenteTipo = role === 'mecanico' ? 'mecanico' : 'cliente';

    try {
        // DEBUG: Ver qué datos llegan en la sesión
        console.log(`[Chat POST] idCita=${idCita} | userId=${userId} | role=${role} | remitenteTipo=${remitenteTipo}`);

        // Verificar acceso a la cita
        let citaQuery;
        if (role === 'mecanico') {
            citaQuery = await db.query(
                'SELECT idCita FROM cita WHERE idCita = ? AND idMecanico = ?',
                [idCita, userId]
            );
        } else {
            citaQuery = await db.query(
                'SELECT idCita FROM cita WHERE idCita = ? AND idCliente = ?',
                [idCita, userId]
            );
        }

        console.log(`[Chat POST] citaQuery result length=${citaQuery[0].length}`);

        if (citaQuery[0].length === 0) {
            return res.status(403).json({ error: 'No tienes acceso a este chat' });
        }

        // FIX ESM nanoid issue by using crypto fallback just in case or keep nanoid but make sure we avoid crash if it's ESM only
        // The original code used nanoid(7).
        const idMensaje = 'MSG' + nanoid(7);

        await db.query(
            `INSERT INTO chat_mensaje 
                (idMensaje, idCita, remitenteId, remitenteTipo, tipoContenido, contenido, nombreArchivo)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [idMensaje, idCita, userId, remitenteTipo, tipoContenido, contenido, nombreArchivo || null]
        );

        // Devolver el mensaje recién creado con nombre del remitente
        const [nuevoMensaje] = await db.query(`
            SELECT 
                m.idMensaje,
                m.remitenteId,
                m.remitenteTipo,
                m.tipoContenido,
                m.contenido,
                m.nombreArchivo,
                m.leido,
                m.fechaEnvio,
                u.nombre AS remitenteNombre
            FROM chat_mensaje m
            JOIN usuario u ON m.remitenteId = u.idUsuario
            WHERE m.idMensaje = ?
        `, [idMensaje]);

        res.status(201).json({ success: true, mensaje: nuevoMensaje[0] });
    } catch (error) {
        console.error('[Chat] Error al enviar mensaje:', error);
        res.status(500).json({ error: 'Error al enviar mensaje' });
    }
});

module.exports = router;
