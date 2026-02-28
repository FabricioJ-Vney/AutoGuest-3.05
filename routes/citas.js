const express = require('express');
const db = require('../config/database');
const { nanoid } = require('nanoid');
const router = express.Router();

// Middleware de autenticación (Reutilizable)
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Acceso no autorizado' });
    }
};

// Crear nueva cita
router.post('/', isAuthenticated, async (req, res) => {
    const { idTaller, idVehiculo, fecha, hora, servicio } = req.body;
    const idCliente = req.session.userId; // Obtener ID del cliente de la sesión

    try {
        // Validación de fecha futura
        const fechaCita = new Date(`${fecha}T${hora}:00`);
        const ahora = new Date();
        if (fechaCita < ahora) {
            return res.status(400).json({ error: 'No se puede agendar una cita en el pasado.' });
        }

        // 0. VERIFICAR QUE EL USUARIO EXISTA EN LA TABLA CLIENTE (Evitar Error FK)
        const [clienteExists] = await db.query('SELECT idUsuario FROM cliente WHERE idUsuario = ?', [idCliente]);
        if (clienteExists.length === 0) {
            // Si no existe, lo insertamos automáticamente
            console.log(`Usuario ${idCliente} no estaba en tabla cliente. Insertando...`);
            await db.query('INSERT INTO cliente (idUsuario) VALUES (?)', [idCliente]);
        }

        // NUEVA VALIDACIÓN: Verificar si el vehículo ya tiene una cita activa
        const [citasActivas] = await db.query(`
            SELECT c.idCita, c.estado, c.fechaHora, t.nombre as tallerNombre
            FROM cita c
            JOIN taller t ON c.idTaller = t.idTaller
            WHERE c.idVehiculo = ? 
              AND c.estado IN ('Pendiente', 'Pendiente de Cotización', 'Cotizado', 'En Proceso')
            ORDER BY c.fechaHora DESC
            LIMIT 1
        `, [idVehiculo]);

        if (citasActivas.length > 0) {
            const citaActiva = citasActivas[0];
            return res.status(400).json({
                error: 'Este vehículo ya tiene una cita activa',
                citaActiva: {
                    idCita: citaActiva.idCita,
                    estado: citaActiva.estado,
                    taller: citaActiva.tallerNombre,
                    fecha: citaActiva.fechaHora
                }
            });
        }

        // 1. Asignar un mecánico aleatorio de ese taller (OPCIONAL)
        const [mecanicos] = await db.query('SELECT idUsuario FROM mecanico WHERE idTaller = ?', [idTaller]);

        let idMecanico = null;
        if (mecanicos.length > 0) {
            const random = Math.floor(Math.random() * mecanicos.length);
            idMecanico = mecanicos[random].idUsuario;
        } else {
            console.warn("No hay mecánicos en el taller " + idTaller + ". Cita quedará pendiente de asignar.");
        }

        // 2. Crear ID de cita
        const idCita = 'CIT' + nanoid(5);
        const fechaHora = `${fecha} ${hora}:00`;

        // 3. Insertar con idTaller y servicio_solicitado
        await db.query(
            'INSERT INTO cita (idCita, fechaHora, estado, idCliente, idVehiculo, idMecanico, idTaller, servicio_solicitado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [idCita, fechaHora, 'Pendiente', idCliente, idVehiculo, idMecanico, idTaller, servicio]
        );

        res.json({ success: true, message: 'Cita agendada con éxito', idCita });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al agendar cita' });
    }
});

// Obtener citas para el taller (autenticado)
router.get('/taller', async (req, res) => {
    // Check session
    if (!req.session.tallerId) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const [citas] = await db.query(`
            SELECT c.*, u.nombre as clienteNombre, u.email as clienteEmail, 
                   v.marca as vehiculoMarca, v.placa as vehiculoPlaca, 
                   m.nombre as mecanicoNombre 
            FROM cita c 
            JOIN usuario u ON c.idCliente = u.idUsuario 
            JOIN vehiculo v ON c.idVehiculo = v.idVehiculo 
            LEFT JOIN usuario m ON c.idMecanico = m.idUsuario 
            WHERE c.idTaller = ?
            ORDER BY c.fechaHora DESC
        `, [req.session.tallerId]);
        res.json(citas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al cargar citas del taller' });
    }
});

// Obtener vehículos de un cliente (Para llenar el select del formulario)
router.get('/vehiculos/:idCliente', async (req, res) => {
    try {
        const [vehiculos] = await db.query('SELECT * FROM vehiculo WHERE idDuenio = ?', [req.params.idCliente]);
        res.json(vehiculos);
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar vehículos' });
    }
});

// Obtener citas del cliente autenticado
router.get('/', isAuthenticated, async (req, res) => {
    const idCliente = req.session.userId;
    try {
        const [citas] = await db.query(`
            SELECT c.idCita, c.fechaHora, c.estado, 
                   COALESCE(t.nombre, 'Taller no disponible') as tallerNombre, 
                   v.marca as vehiculoMarca, v.placa as vehiculoPlaca
            FROM cita c
            JOIN vehiculo v ON c.idVehiculo = v.idVehiculo
            LEFT JOIN taller t ON c.idTaller = t.idTaller
            WHERE c.idCliente = ?
            ORDER BY c.fechaHora DESC
        `, [idCliente]);
        res.json(citas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener citas' });
    }
});

// Obtener detalles de una cita específica
router.get('/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const idCliente = req.session.userId;

    try {
        const [citas] = await db.query(`
            SELECT c.*, 
                   COALESCE(t.nombre, 'Taller no disponible') as tallerNombre, 
                   t.direccion as tallerDireccion, 
                   v.marca as vehiculoMarca, v.modelo as vehiculoModelo, v.placa as vehiculoPlaca,
                   m.nombre as mecanicoNombre
            FROM cita c
            JOIN vehiculo v ON c.idVehiculo = v.idVehiculo
            LEFT JOIN mecanico mec ON c.idMecanico = mec.idUsuario
            LEFT JOIN taller t ON mec.idTaller = t.idTaller
            LEFT JOIN usuario m ON c.idMecanico = m.idUsuario
            WHERE c.idCita = ? AND c.idCliente = ?
        `, [id, idCliente]);

        if (citas.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }

        res.json(citas[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener detalles de la cita' });
    }
});

// Actualizar estado de cita
router.put('/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    // Validar que el usuario sea taller (opcional pero recomendado)
    if (!req.session.tallerId) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        await db.query('UPDATE cita SET estado = ? WHERE idCita = ?', [estado, id]);
        res.json({ success: true, message: 'Estado actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
});

// Cancelar cita (cliente)
router.delete('/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const idCliente = req.session.userId;

    try {
        // Verificar que la cita pertenece al cliente
        const [cita] = await db.query(
            'SELECT estado FROM cita WHERE idCita = ? AND idCliente = ?',
            [id, idCliente]
        );

        if (cita.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada o no tienes permiso para cancelarla' });
        }

        // Validar que no esté completada
        if (cita[0].estado === 'Completado') {
            return res.status(400).json({ error: 'No se puede cancelar una cita ya completada' });
        }

        // Actualizar estado a Cancelado
        await db.query('UPDATE cita SET estado = ? WHERE idCita = ?', ['Cancelado', id]);

        res.json({ success: true, message: 'Cita cancelada exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al cancelar la cita' });
    }
});

// Aprobar cotización (cliente)
router.put('/:id/aprobar-cotizacion', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const idCliente = req.session.userId;

    try {
        // Verificar que la cita pertenece al cliente y está en estado 'Cotizado'
        const [cita] = await db.query(
            'SELECT estado FROM cita WHERE idCita = ? AND idCliente = ?',
            [id, idCliente]
        );

        if (cita.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada o no tienes permiso.' });
        }

        if (cita[0].estado !== 'Cotizado') {
            return res.status(400).json({ error: 'La cita no está en estado de cotización.' });
        }

        let connection;
        try {
            connection = await db.getConnection();
            await connection.beginTransaction();

            // Actualizar estado de cita a 'En Proceso'
            await connection.query('UPDATE cita SET estado = ? WHERE idCita = ?', ['En Proceso', id]);

            // Actualizar estado de pago en cotización (opcional, para registro)
            // Asumimos que al aprobar se acepta el compromiso de pago, aunque el pago real es al final o anticipado.
            // Por ahora solo cambiamos el estado de la cita que es lo que mueve el flujo.

            // Notificar al mecánico
            const [mecanicoRow] = await connection.query('SELECT idMecanico FROM cita WHERE idCita = ?', [id]);
            if (mecanicoRow.length > 0 && mecanicoRow[0].idMecanico) {
                await connection.query(
                    'INSERT INTO notificacion (idUsuario, titulo, mensaje) VALUES (?, ?, ?)',
                    [mecanicoRow[0].idMecanico, '¡Cotización Aprobada!', 'El cliente ha aceptado la cotización de la cita ' + id + '. Puedes iniciar el servicio.']
                );
            }

            await connection.commit();
            res.json({ success: true, message: 'Cotización aprobada. El mecánico comenzará el trabajo pronto.' });

        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) connection.release();
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al aprobar la cotización' });
    }
});

// Rechazar cotización (cliente)
router.put('/:id/rechazar-cotizacion', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const idCliente = req.session.userId;

    try {
        const [cita] = await db.query(
            'SELECT estado FROM cita WHERE idCita = ? AND idCliente = ?',
            [id, idCliente]
        );

        if (cita.length === 0) return res.status(404).json({ error: 'Cita no encontrada.' });
        if (cita[0].estado !== 'Cotizado') return res.status(400).json({ error: 'La cita no está en estado cotizado.' });

        // Update to 'Cancelado'
        await db.query('UPDATE cita SET estado = ? WHERE idCita = ?', ['Cancelado', id]);

        // Notificar al mecánico
        if (cita[0].idMecanico) {
            await db.query(
                'INSERT INTO notificacion (idUsuario, titulo, mensaje) VALUES (?, ?, ?)',
                [cita[0].idMecanico, 'Cotización Rechazada', 'El cliente ha rechazado la cotización de la cita ' + id + ' y ha sido cancelada.']
            );
        }

        res.json({ success: true, message: 'Cotización rechazada. La cita ha sido cancelada.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al rechazar cotización' });
    }
});

// Obtener cotización de una cita
router.get('/:id/cotizacion', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const idCliente = req.session.userId;

    try {
        // Verificar permiso
        const [cita] = await db.query('SELECT idCita FROM cita WHERE idCita = ? AND idCliente = ?', [id, idCliente]);
        if (cita.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });

        // Obtener cabecera
        const [cotizacion] = await db.query('SELECT * FROM cotizacion WHERE idCita = ?', [id]);
        if (cotizacion.length === 0) return res.status(404).json({ error: 'Cotización no encontrada' });

        const cot = cotizacion[0];

        // Obtener servicios
        const [servicios] = await db.query(`
            SELECT s.nombre, cs.precio
            FROM cotizacion_servicios cs
            JOIN servicio s ON cs.idServicio = s.idServicio
            WHERE cs.idCotizacion = ?
                        `, [cot.idCotizacion]);

        res.json({
            idCotizacion: cot.idCotizacion,
            diagnostico: cot.diagnostico,
            totalAprobado: cot.totalAprobado,
            servicios: servicios
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener cotización' });
    }
});

// Confirmar entrega con código de efectivo
router.put('/:id/confirmar-entrega-codigo', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { codigo } = req.body;
    try {
        const [cita] = await db.query('SELECT estado, codigo_pago_efectivo FROM cita WHERE idCita = ?', [id]);
        if (cita.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });

        if (cita[0].estado !== 'Esperando Confirmacion Cliente') {
            return res.status(400).json({ error: 'La cita no está en estado de liberar.' });
        }

        if (cita[0].codigo_pago_efectivo !== codigo) {
            return res.status(400).json({ error: 'Código de pago incorrecto.' });
        }

        await db.query('UPDATE cita SET estado = "Completado" WHERE idCita = ?', [id]);
        res.json({ message: 'Vehículo liberado correctamente con pago en efectivo.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al confirmar la entrega' });
    }
});

// Confirmar entrega con pago online
router.put('/:id/confirmar-entrega-online', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE cita SET estado = "Completado" WHERE idCita = ?', [id]);
        res.json({ message: 'Vehículo liberado correctamente con pago en línea.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al confirmar la entrega' });
    }
});
// Confirmar entrega (cliente)
router.put('/:id/confirmar-entrega', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const idCliente = req.session.userId;

    try {
        // Verificar que la cita pertenece al cliente y está esperando confirmación
        const [cita] = await db.query(
            'SELECT estado, idMecanico, idTaller FROM cita WHERE idCita = ? AND idCliente = ?',
            [id, idCliente]
        );

        if (cita.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada o no tienes permiso.' });
        }

        if (cita[0].estado !== 'Esperando Confirmacion Cliente') {
            return res.status(400).json({ error: 'La cita no está esperando tu confirmación.' });
        }

        // Actualizar a Completado
        await db.query('UPDATE cita SET estado = ? WHERE idCita = ?', ['Completado', id]);

        // Notificar al mecánico y/o taller que el auto fue entregado (Opcional, pero buena práctica)
        if (cita[0].idMecanico) {
            await db.query(
                'INSERT INTO notificacion (idUsuario, titulo, mensaje) VALUES (?, ?, ?)',
                [cita[0].idMecanico, 'Entrega Confirmada', 'El cliente ha confirmado la entrega del auto de la cita ' + id + '.']
            );
        }

        let idTallerResult = cita[0].idTaller;
        if (!idTallerResult && cita[0].idMecanico) {
            const [mec] = await db.query('SELECT idTaller FROM mecanico WHERE idUsuario = ?', [cita[0].idMecanico]);
            if (mec.length > 0) idTallerResult = mec[0].idTaller;
        }

        if (idTallerResult) {
            const [admins] = await db.query('SELECT idUsuario FROM administrador WHERE idTaller = ?', [idTallerResult]);
            if (admins.length > 0) {
                await db.query(
                    'INSERT INTO notificacion (idUsuario, titulo, mensaje) VALUES (?, ?, ?)',
                    [admins[0].idUsuario, 'Entrega Confirmada', 'El cliente ha confirmado la entrega del auto de la cita ' + id + '.']
                );
            }
        }

        res.json({ success: true, message: 'Entrega confirmada. La cita ha sido completada exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al confirmar la entrega' });
    }
});

module.exports = router;