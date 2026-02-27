const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Middleware de autenticación
// Este "guardián" se asegura de que el usuario haya iniciado sesión antes de acceder a las rutas de vehículos.
const isAuthenticated = (req, res, next) => {
    console.log('DEBUG: Middleware isAuthenticated executed.');
    console.log('DEBUG: Session ID:', req.sessionID);
    console.log('DEBUG: User ID in session:', req.session.userId);
    if (req.session.userId) {
        // Si existe un userId en la sesión, el usuario está autenticado.
        next(); // Permite que la petición continúe.
    } else {
        // Si no, devuelve un error 401 (No Autorizado).
        console.log('DEBUG: Acceso denegado. No hay userId en la sesión.');
        res.status(401).json({ mensaje: 'Acceso no autorizado. Por favor, inicia sesión.' });
    }
};

// @route   GET /api/vehiculos
// @desc    Obtener todos los vehículos del usuario autenticado
// @access  Private
router.get('/debug-session', (req, res) => {
    res.json({
        sessionID: req.sessionID,
        session: req.session,
        user: req.user // In case JWT is used
    });
});

router.get('/', isAuthenticated, async (req, res) => {
    // El middleware 'isAuthenticated' ya se ejecutó. Si llegamos aquí, el usuario está logueado.
    const idUsuario = req.session.userId;

    try {
        const [vehiculos] = await db.query('SELECT idVehiculo, marca, modelo, anio, placa FROM vehiculo WHERE idDuenio = ?', [idUsuario]);
        res.status(200).json(vehiculos);
    } catch (error) {
        console.error('Error al obtener vehículos:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al buscar vehículos.' });
    }
});

// @route   POST /api/vehiculos
// @desc    Añadir un nuevo vehículo para el usuario autenticado
// @access  Private
router.post('/', isAuthenticated, async (req, res) => {
    const idUsuario = req.session.userId || 'CLI02';
    const { marca, modelo, anio, placa } = req.body;

    if (!marca || !modelo || !anio || !placa) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    try {
        // Generar ID único para el vehículo
        const { nanoid } = require('nanoid');
        const idVehiculo = 'VEH' + nanoid(8);

        const [result] = await db.query(
            'INSERT INTO vehiculo (idVehiculo, idDuenio, marca, modelo, anio, placa) VALUES (?, ?, ?, ?, ?, ?)',
            [idVehiculo, idUsuario, marca, modelo, anio, placa]
        );

        // Devolvemos el vehículo recién creado con su nuevo ID.
        const nuevoVehiculo = {
            idVehiculo,
            marca,
            modelo,
            anio,
            placa
        };

        res.status(201).json(nuevoVehiculo);

    } catch (error) {
        console.error('Error al añadir vehículo:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ mensaje: 'Ya existe un vehículo registrado con esta placa.' });
        }
        res.status(500).json({ mensaje: 'Error interno del servidor al añadir el vehículo.' });
    }
});
// @route   PUT /api/vehiculos/:id
// @desc    Actualizar un vehículo del usuario autenticado
// @access  Private
router.put('/:idVehiculo', isAuthenticated, async (req, res) => {
    const idUsuario = req.session.userId || 'CLI02';
    const { idVehiculo } = req.params;
    const { marca, modelo, anio, placa } = req.body;

    if (!marca || !modelo || !anio || !placa) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    try {
        // Verificar que el vehículo pertenece al usuario
        const [check] = await db.query(
            'SELECT idVehiculo FROM vehiculo WHERE idVehiculo = ? AND idDuenio = ?',
            [idVehiculo, idUsuario]
        );

        if (check.length === 0) {
            return res.status(404).json({ mensaje: 'Vehículo no encontrado o no tienes permiso para editarlo.' });
        }

        // Actualizar el vehículo
        await db.query(
            'UPDATE vehiculo SET marca = ?, modelo = ?, anio = ?, placa = ? WHERE idVehiculo = ?',
            [marca, modelo, anio, placa, idVehiculo]
        );

        res.status(200).json({
            success: true,
            mensaje: 'Vehículo actualizado con éxito.',
            vehiculo: { idVehiculo, marca, modelo, anio, placa }
        });

    } catch (error) {
        console.error('Error al actualizar vehículo:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el vehículo.' });
    }
});
// @route   DELETE /api/vehiculos/:id
// @desc    Eliminar un vehículo del usuario autenticado
// @access  Private
router.delete('/:idVehiculo', isAuthenticated, async (req, res) => {
    const idUsuario = req.session.userId || 'CLI02';
    const { idVehiculo } = req.params;

    try {
        // Verificar si existen citas asociadas a este vehículo
        // En un sistema real, tal vez quieras impedir el borrado si hay citas futuras,
        // o usar "soft delete". Aquí, para cumplir con el requerimiento del usuario,
        // eliminaremos las citas asociadas primero (CASCADE manual).
        await db.query('DELETE FROM cita WHERE idVehiculo = ?', [idVehiculo]);

        // Luego eliminamos el vehículo
        const [result] = await db.query(
            'DELETE FROM vehiculo WHERE idVehiculo = ? AND idDuenio = ?',
            [idVehiculo, idUsuario]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Vehículo no encontrado o no tienes permiso para eliminarlo.' });
        }

        res.status(200).json({ success: true, mensaje: 'Vehículo eliminado con éxito.' });

    } catch (error) {
        console.error('Error al eliminar vehículo:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al eliminar el vehículo.' });
    }
});


module.exports = router;
