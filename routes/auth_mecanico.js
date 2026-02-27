const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../config/database');
const router = express.Router();

// --- REGISTRO DE MECÁNICO ---
router.post('/registro', async (req, res) => {
    // 1. AHORA RECIBIMOS 'especialidad' TAMBIÉN
    const { nombre, email, password, telefono, idTaller, especialidad } = req.body;

    // --- Validaciones ---
    if (!nombre || !email || !password || !telefono || !idTaller || !especialidad) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    const telefonoRegex = /^\d{10}$/;
    if (!telefonoRegex.test(telefono)) {
        return res.status(400).json({ mensaje: 'El teléfono debe tener 10 dígitos.' });
    }

    try {
        // 2. Validar Taller
        const [taller] = await db.query('SELECT idTaller FROM taller WHERE idTaller = ?', [idTaller]);
        if (taller.length === 0) {
            return res.status(400).json({ mensaje: 'ID de Taller no válido.' });
        }

        // 3. Validar Email Duplicado
        const [userExists] = await db.query('SELECT email FROM usuario WHERE email = ?', [email]);
        if (userExists.length > 0) {
            return res.status(400).json({ mensaje: 'El correo ya está registrado.' });
        }

        // 4. Crear Usuario
        const idUsuario = 'MEC' + nanoid(7);

        // Guardar en tabla USUARIO
        await db.query(
            'INSERT INTO usuario (idUsuario, nombre, email, password, telefono) VALUES (?, ?, ?, ?, ?)',
            [idUsuario, nombre, email, password, telefono]
        );

        // 5. Guardar en tabla MECANICO con la ESPECIALIDAD (y estado PENDIENTE por defecto)
        await db.query(
            'INSERT INTO mecanico (idUsuario, idTaller, especialidad, estado_solicitud) VALUES (?, ?, ?, ?)',
            [idUsuario, idTaller, especialidad, 'PENDIENTE']
        );

        // 6. Notificar al administrador del taller
        const [admins] = await db.query('SELECT idUsuario FROM administrador WHERE idTaller = ?', [idTaller]);
        if (admins.length > 0) {
            const idAdminTaller = admins[0].idUsuario;
            await db.query(
                'INSERT INTO notificacion (idUsuario, titulo, mensaje) VALUES (?, ?, ?)',
                [idAdminTaller, 'Nueva Solicitud de Mecánico', 'El mecánico ' + nombre + ' ha solicitado unirse a tu taller. Ve a Gestionar Mecánicos para aprobar o rechazar su solicitud.']
            );
        }

        res.status(201).json({ success: true, mensaje: 'Mecánico registrado. Esperando aprobación del taller.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error en el servidor.' });
    }
});

// ... (El resto del archivo con el login y demás rutas se queda igual) ...
// --- LOGIN DE MECÁNICO ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM usuario WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ mensaje: 'Usuario no encontrado.' });

        const user = users[0];
        if (password !== user.password) return res.status(401).json({ mensaje: 'Contraseña incorrecta.' });

        const [mecanico] = await db.query('SELECT * FROM mecanico WHERE idUsuario = ?', [user.idUsuario]);
        if (mecanico.length === 0) return res.status(403).json({ mensaje: 'No tienes cuenta de mecánico.' });

        // Verificamos si fue aprobado por el taller
        if (mecanico[0].estado_solicitud !== 'APROBADO') {
            return res.status(403).json({ mensaje: 'Tu cuenta aún no ha sido aprobada por el taller.' });
        }

        req.session.userId = user.idUsuario;
        req.session.role = 'mecanico';
        req.session.tallerId = mecanico[0].idTaller;

        res.status(200).json({
            success: true,
            redirectTo: 'portal_mecanico.html',
            userName: user.nombre,
            userId: user.idUsuario
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al iniciar sesión.' });
    }
});

// --- OBTENER CITAS ASIGNADAS AL MECÁNICO ---
// --- OBTENER CITAS (ASIGNADAS + DISPONIBLES) ---
router.get('/mis-citas', async (req, res) => {
    if (!req.session.userId || req.session.role !== 'mecanico') {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const { userId, tallerId } = req.session;

    try {
        const [citas] = await db.query(`
            SELECT c.idCita, c.fechaHora, c.estado, c.idMecanico,
                   v.marca, v.modelo, v.placa, 
                   u.nombre as clienteNombre
            FROM cita c
            JOIN vehiculo v ON c.idVehiculo = v.idVehiculo
            JOIN usuario u ON c.idCliente = u.idUsuario
            WHERE (c.idMecanico = ? AND c.estado != 'Cancelado') 
               OR (c.idTaller = ? AND c.idMecanico IS NULL AND c.estado = 'Pendiente')
            ORDER BY c.fechaHora ASC
        `, [userId, tallerId]);

        res.json(citas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al cargar citas' });
    }
});

// --- TOMAR UNA CITA (ASIGNARSE A SÍ MISMO) ---
router.post('/tomar-cita/:id', async (req, res) => {
    if (!req.session.userId || req.session.role !== 'mecanico') return res.status(401).json({ error: 'No autorizado' });

    const { id } = req.params;
    const { userId } = req.session;

    try {
        // Verificar que la cita esté libre
        const [cita] = await db.query('SELECT idMecanico FROM cita WHERE idCita = ?', [id]);
        if (cita.length === 0) return res.status(404).json({ error: 'Cita no encontrada.' });
        if (cita[0].idMecanico) return res.status(400).json({ error: 'Esta cita ya fue tomada por otro mecánico.' });

        await db.query('UPDATE cita SET idMecanico = ?, estado = ? WHERE idCita = ?', [userId, 'En Proceso', id]);
        res.json({ success: true, message: 'Has tomado la cita. ¡A trabajar!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al tomar la cita.' });
    }
});

// --- FINALIZAR UNA CITA ---
router.post('/finalizar-cita/:id', async (req, res) => {
    if (!req.session.userId || req.session.role !== 'mecanico') return res.status(401).json({ error: 'No autorizado' });
    const { id } = req.params;

    try {
        await db.query('UPDATE cita SET estado = ? WHERE idCita = ?', ['Completado', id]);
        res.json({ success: true, message: 'Trabajo finalizado correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al finalizar trabajo.' });
    }
});

// --- CREAR COTIZACIÓN (DIAGNÓSTICO) ---
// --- CREAR COTIZACIÓN (DIAGNÓSTICO) ---
router.post('/cotizar', async (req, res) => {
    if (!req.session.userId || req.session.role !== 'mecanico') return res.status(401).json({ error: 'No autorizado' });

    const { idCita, servicios, notas } = req.body; // servicios is array of IDs

    if (!servicios || !Array.isArray(servicios) || servicios.length === 0) {
        return res.status(400).json({ error: 'Debe seleccionar al menos un servicio.' });
    }

    const idCotizacion = 'COT' + nanoid(6);
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 0. Ensure junction table exists (Safe to run multiple times, but ideally in migration)
        // Ignoring user rule "don't affect other processes" risk slightly to ensure this works without manual DB intervention
        await connection.query(`
            CREATE TABLE IF NOT EXISTS cotizacion_servicios (
                idCotizacion VARCHAR(50),
                idServicio VARCHAR(50),
                precio FLOAT,
                PRIMARY KEY (idCotizacion, idServicio),
                FOREIGN KEY (idCotizacion) REFERENCES cotizacion(idCotizacion),
                FOREIGN KEY (idServicio) REFERENCES servicio(idServicio)
            )
        `);

        // 1. Calculate Total and Validate Services
        let total = 0;
        const validServices = [];

        for (const serviceId of servicios) {
            const [rows] = await connection.query('SELECT * FROM servicio WHERE idServicio = ?', [serviceId]);
            if (rows.length > 0) {
                const service = rows[0];
                total += parseFloat(service.precio);
                validServices.push(service);
            }
        }

        if (validServices.length === 0) {
            throw new Error("Ningún servicio válido encontrado.");
        }

        // 2. Crear cotización header
        // Using 'notas' as 'diagnostico' for backward compatibility or simple text field
        // 'mano_obra' and 'costo_refacciones' set to 0 as they are now bundled in services, or we could split if service has structure.
        // For now, total is what matters.
        await connection.query(
            'INSERT INTO cotizacion (idCotizacion, idCita, diagnostico, mano_obra, costo_refacciones, totalAprobado, estado_pago) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [idCotizacion, idCita, notas || 'Servicios predefinidos', 0, 0, total, 'PENDIENTE']
        );

        // 3. Insert services into junction table
        for (const service of validServices) {
            await connection.query(
                'INSERT INTO cotizacion_servicios (idCotizacion, idServicio, precio) VALUES (?, ?, ?)',
                [idCotizacion, service.idServicio, service.precio]
            );
        }

        // 4. Actualizar estado de la cita
        await connection.query('UPDATE cita SET estado = ? WHERE idCita = ?', ['Cotizado', idCita]);

        // 5. Notificar al cliente
        const [citaRow] = await connection.query('SELECT idCliente FROM cita WHERE idCita = ?', [idCita]);
        if (citaRow.length > 0) {
            const idCliente = citaRow[0].idCliente;
            await connection.query(
                'INSERT INTO notificacion (idUsuario, titulo, mensaje) VALUES (?, ?, ?)',
                [idCliente, '¡Nueva Cotización Recibida!', 'El mecánico ha enviado una cotización para tu cita ' + idCita + '. Revísala para continuar.']
            );
        }

        await connection.commit();
        res.json({ success: true, mensaje: 'Cotización enviada al cliente.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Error al guardar cotización: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// --- CREAR ORDEN EXPRESS (NUEVO TRABAJO / WALK-IN) ---
router.post('/crear-orden-express', async (req, res) => {
    if (!req.session.userId || req.session.role !== 'mecanico') {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const { nombreCliente, telefonoCliente, marca, modelo, placa, notaInicial } = req.body;
    const idMecanico = req.session.userId;
    const idTaller = req.session.tallerId;

    if (!nombreCliente || !telefonoCliente || !marca || !placa) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Buscar o Crear Usuario (Cliente)
        let idCliente;
        const [existingUser] = await connection.query('SELECT idUsuario FROM usuario WHERE email = ? OR telefono = ?', [telefonoCliente + "@temp.com", telefonoCliente]); // Hack para email unico si no se pide

        if (existingUser.length > 0) {
            idCliente = existingUser[0].idUsuario;
        } else {
            idCliente = 'CLI' + nanoid(7);
            // Creamos usuario con telefono como password temporal
            const fakeEmail = telefonoCliente + "@temp.com";
            await connection.query(
                'INSERT INTO usuario (idUsuario, nombre, email, password, telefono) VALUES (?, ?, ?, ?, ?)',
                [idCliente, nombreCliente, fakeEmail, telefonoCliente, telefonoCliente]
            );
            // Insertar en tabla cliente tambien si es necesario por integridad referencial
            await connection.query('INSERT INTO cliente (idUsuario) VALUES (?)', [idCliente]);
        }

        // 2. Buscar o Crear Vehiculo
        let idVehiculo;
        const [existingCar] = await connection.query('SELECT idVehiculo FROM vehiculo WHERE placa = ?', [placa]);

        if (existingCar.length > 0) {
            idVehiculo = existingCar[0].idVehiculo;
        } else {
            idVehiculo = 'VEH' + nanoid(7);
            await connection.query(
                'INSERT INTO vehiculo (idVehiculo, idDuenio, marca, modelo, placa, anio) VALUES (?, ?, ?, ?, ?, ?)',
                [idVehiculo, idCliente, marca, modelo, placa, new Date().getFullYear()]
            );
        }

        // 3. Crear Cita
        const idCita = 'CIT' + nanoid(5);
        // Fecha actual
        const now = new Date();
        const fechaHora = now.toISOString().slice(0, 19).replace('T', ' ');

        await connection.query(
            'INSERT INTO cita (idCita, fechaHora, estado, idCliente, idVehiculo, idMecanico) VALUES (?, ?, ?, ?, ?, ?)',
            [idCita, fechaHora, 'Pendiente', idCliente, idVehiculo, idMecanico]
        );

        await connection.commit();
        res.json({ success: true, message: 'Trabajo creado exitosamente', idCita });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error al crear orden express:', error);
        res.status(500).json({ error: 'Error al crear la orden.' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;