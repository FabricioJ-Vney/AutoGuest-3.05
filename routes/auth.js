const express = require('express');
const bcrypt = require('bcryptjs');
// Nota: Asegúrate de tener instalada la versión 3 de nanoid (npm install nanoid@3.3.4)
const { nanoid } = require('nanoid');
const db = require('../config/database');
const router = express.Router();

// @route   POST /api/registro/cliente
// @desc    Registrar un nuevo cliente
router.post('/cliente', async (req, res) => {
    // 1. Recibimos 'telefono' también
    const { nombre, email, password, telefono } = req.body;

    // --- VALIDACIONES ---
    if (!nombre || !email || !password || !telefono) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    // Validación: El nombre solo debe tener letras y espacios (No números)
    const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!nombreRegex.test(nombre)) {
        return res.status(400).json({ mensaje: 'El nombre no es válido (no se permiten números).' });
    }

    // Validación: La contraseña debe ser segura
    if (password.length < 8) {
        return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    // --------------------

    try {
        // 2. Verificar si el email ya existe
        const [users] = await db.query('SELECT email FROM usuario WHERE email = ?', [email]);
        if (users.length > 0) {
            return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado.' });
        }

        // 3. Generar ID y Hash de contraseña
        const idUsuario = nanoid(10);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Insertar en tabla 'usuario' (INCLUYENDO EL TELÉFONO)
        const [userResult] = await db.query(
            'INSERT INTO usuario (idUsuario, nombre, email, password, telefono) VALUES (?, ?, ?, ?, ?)',
            [idUsuario, nombre, email, hashedPassword, telefono]
        );

        // 5. Insertar en tabla 'cliente'
        const [clientResult] = await db.query(
            'INSERT INTO cliente (idUsuario) VALUES (?)',
            [idUsuario]
        );

        if (userResult.affectedRows > 0 && clientResult.affectedRows > 0) {
            console.log(`Nuevo cliente registrado: ${email}`);
            res.status(201).json({ mensaje: '¡Registro exitoso! Ahora puedes iniciar sesión.' });
        } else {
            throw new Error('No se pudo guardar en la base de datos.');
        }

    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
});

// @route   POST /api/registro/login
// @desc    Iniciar sesión
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ mensaje: 'Email y contraseña son obligatorios.' });
    }

    try {
        const [users] = await db.query('SELECT * FROM usuario WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ mensaje: 'Credenciales incorrectas.' });
        }

        const user = users[0];

        // 1. Intentar comparar con encriptación (Lo correcto)
        let isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch && password === user.password) {
            isMatch = true;
        }
        if (!isMatch) {
            return res.status(401).json({ mensaje: 'Credenciales incorrectas.' });
        }

        // Verificar que sea cliente
        const [clients] = await db.query('SELECT idUsuario FROM cliente WHERE idUsuario = ?', [user.idUsuario]);
        if (clients.length === 0) {
            return res.status(403).json({ mensaje: 'Este usuario no es un cliente.' });
        }

        // Crear sesión
        req.session.userId = user.idUsuario;
        req.session.role = 'cliente'; // Variable necesaria para el Chat y otros módulos

        res.status(200).json({
            success: true,
            mensaje: 'Inicio de sesión exitoso.',
            userName: user.nombre,
            userId: user.idUsuario, // Agregar userId para localStorage
            redirectTo: 'pages/cliente/dashboard_cliente.html' // Ajusta la ruta si la moviste a una carpeta
        });

    } catch (error) {
        console.error('Error login:', error);
        res.status(500).json({ mensaje: 'Error del servidor.' });
    }
});

// @route   POST /api/registro/logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ mensaje: 'Error al cerrar sesión.' });
        res.clearCookie('connect.sid');
        res.status(200).json({ success: true });
    });
});

module.exports = router;