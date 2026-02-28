// 1. Cargar variables de entorno
require('dotenv').config();

// 2. Importar dependencias
const express = require('express');
const path = require('path');
const cors = require('cors'); // Importar CORS
const session = require('express-session');
const paymentRoutes = require('./routes/payment');
const mercadopagoRoutes = require('./routes/mercadopago');
const authRoutes = require('./routes/auth');
const vehiculosRoutes = require('./routes/vehiculos');
const talleresRoutes = require('./routes/talleres'); // <--- Importar
const tallerAuthRoutes = require('./routes/taller_auth');
const citasRoutes = require('./routes/citas');
const pedidosRoutes = require('./routes/pedidos');
const perfilRoutes = require('./routes/perfil');
const resenasRoutes = require('./routes/resenas');
const tallerServiciosRoutes = require('./routes/taller_servicios');
const tallerCitasRoutes = require('./routes/taller_citas');
const tallerAdminRoutes = require('./routes/taller_admin');
const mecanicoRoutes = require('./routes/auth_mecanico');
const inventarioRoutes = require('./routes/inventario');
const chatRoutes = require('./routes/chat');
const ticketsRoutes = require('./routes/tickets'); // <--- Importar tickets
const notificacionesRoutes = require('./routes/notificaciones'); // <--- Notificaciones

// 3. Inicializar la aplicación de Express
const app = express();

// 4. Middlewares
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], // Ambos puertos posibles del Live Server
    credentials: true, // Permitir el envío de cookies de sesión cross-origin
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json({ limit: '50mb' })); // Aumentar límite para imágenes
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Configuración de express-session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // Poner en true si usas HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Servir archivos estáticos (nuestros archivos HTML, CSS, JS del frontend)
app.use(express.static(path.join(__dirname)));


app.use('/api/talleres', talleresRoutes); // <--- Usar

app.use('/api/registro', tallerAuthRoutes);
app.use('/api/citas', citasRoutes);

// Rutas del portal de taller
app.use('/api/taller', tallerServiciosRoutes);
app.use('/api/taller', tallerCitasRoutes);
app.use('/api/taller', tallerAdminRoutes);

// Usar las rutas de pago
app.use('/api/paypal', paymentRoutes);
app.use('/api/mercadopago', mercadopagoRoutes);

// Usar las rutas de autenticación
app.use('/api/registro', authRoutes);

// Usar las rutas de vehículos
app.use('/api/vehiculos', vehiculosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/resenas', resenasRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tickets', ticketsRoutes); // <--- Rutas de tickets

app.use('/api/mecanico', mecanicoRoutes);
app.use('/api/taller/citas', require('./routes/taller_citas'));
app.use('/api/notificaciones', notificacionesRoutes); // <--- Notificaciones


// 5. Rutas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
// 6. Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});