const express = require('express');
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Middleware de autenticación
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Acceso no autorizado' });
    }
};

// @route   GET /api/perfil
// @desc    Obtener datos del perfil del usuario autenticado
// @access  Private
router.get('/', isAuthenticated, async (req, res) => {
    const idUsuario = req.session.userId;

    try {
        const [usuarios] = await db.query(
            'SELECT u.idUsuario, u.nombre, u.email, u.foto_perfil FROM usuario u WHERE u.idUsuario = ?',
            [idUsuario]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(usuarios[0]);
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ error: 'Error al obtener datos del perfil' });
    }
});

// @route   PUT /api/perfil
// @desc    Actualizar datos del perfil del usuario autenticado
// @access  Private
router.put('/', isAuthenticated, async (req, res) => {
    const idUsuario = req.session.userId;
    const { nombre, email, password, foto_perfil } = req.body;

    try {
        // Validar que al menos un campo esté presente
        if (!nombre && !email && !password && !foto_perfil) {
            return res.status(400).json({ error: 'Debe proporcionar al menos un campo para actualizar' });
        }

        // Si se está cambiando el email, verificar que no exista
        if (email) {
            const [existente] = await db.query(
                'SELECT idUsuario FROM usuario WHERE email = ? AND idUsuario != ?',
                [email, idUsuario]
            );

            if (existente.length > 0) {
                return res.status(409).json({ error: 'El correo electrónico ya está en uso' });
            }
        }

        // Construir query dinámicamente
        let updateFields = [];
        let updateValues = [];

        if (nombre) {
            updateFields.push('nombre = ?');
            updateValues.push(nombre);
        }

        if (email) {
            updateFields.push('email = ?');
            updateValues.push(email);
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push('password = ?');
            updateValues.push(hashedPassword);
        }

        if (foto_perfil) {
            updateFields.push('foto_perfil = ?');
            updateValues.push(foto_perfil);
        }

        // Agregar ID al final
        updateValues.push(idUsuario);

        // Ejecutar actualización
        await db.query(
            `UPDATE usuario SET ${updateFields.join(', ')} WHERE idUsuario = ?`,
            updateValues
        );

        // Obtener datos actualizados
        const [usuarios] = await db.query(
            'SELECT idUsuario, nombre, email, foto_perfil FROM usuario WHERE idUsuario = ?',
            [idUsuario]
        );

        res.json({
            success: true,
            mensaje: 'Perfil actualizado con éxito',
            usuario: usuarios[0]
        });

    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ error: 'Error al actualizar el perfil' });
    }
});

module.exports = router;
