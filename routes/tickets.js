const express = require('express');
const db = require('../config/database');
const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ mensaje: 'Acceso no autorizado. Por favor, inicia sesión.' });
    }
};

// @route   GET /api/tickets/detalle/:idTicket
// @desc    Obtener detalles completos de un ticket de soporte (pago/servicio)
// @access  Private
router.get('/detalle/:idTicket', isAuthenticated, async (req, res) => {
    try {
        const { idTicket } = req.params;

        // 1. Obtener ticket original
        const [tickets] = await db.query('SELECT * FROM ticketsoporte WHERE idTicket = ?', [idTicket]);
        if (tickets.length === 0) {
            return res.status(404).json({ message: 'Ticket no encontrado' });
        }

        const ticket = tickets[0];
        let detalles = { ticket: ticket, items: [], total: 0, moneda: 'MXN', tipo: '' };

        // 2. Revisar si es pedido o cotización basado en las nuevas reglas de negocio
        if (ticket.idPedido) {
            // Es un pedido de catálogo
            const [pedidos] = await db.query('SELECT * FROM pedido WHERE idPedido = ?', [ticket.idPedido]);
            if (pedidos.length > 0) {
                const pedidoObj = pedidos[0];
                detalles.tipo = 'Catálogo / Compra';
                detalles.total = parseFloat(pedidoObj.total_pedido || 0);
                detalles.fecha = pedidoObj.fecha_pedido ? new Date(pedidoObj.fecha_pedido).toLocaleString('es-MX') : 'Fecha no disponible';

                // JOIN estricto solicitado: lineapedido e iteminventario
                const [lineas] = await db.query(`
                    SELECT i.nombre as descripcion, lp.cantidad, i.precio, t.nombre as nombre_taller
                    FROM lineapedido lp
                    JOIN iteminventario i ON lp.idItemInventario = i.idItem
                    LEFT JOIN taller t ON i.idTaller = t.idTaller
                    WHERE lp.idPedido = ?
                `, [ticket.idPedido]);

                if (lineas.length > 0 && lineas[0].nombre_taller) {
                    detalles.taller = lineas[0].nombre_taller;
                } else {
                    detalles.taller = 'AutoGuest (Catálogo General)';
                }

                detalles.items = lineas.map(l => ({
                    descripcion: l.descripcion,
                    cantidad: l.cantidad,
                    precio: parseFloat(l.precio),
                    subtotal: parseFloat(l.precio) * l.cantidad
                }));
            }
        }
        else if (ticket.asunto.includes('Cita')) {
            // Es un servicio de Taller (Cita). El asunto tiene el formato 'Comprobante de Pago - Cita: {idCita}'
            // o 'Pago Cita: {idCita}'
            const idCitaMatch = ticket.asunto.match(/Cita:\s*(.*)/);
            if (idCitaMatch && idCitaMatch[1]) {
                const idCita = idCitaMatch[1].trim();

                // JOIN estricto solicitado: cotizacion y lineacotizacion
                const [cots] = await db.query('SELECT * FROM cotizacion WHERE idCita = ?', [idCita]);

                if (cots.length > 0) {
                    const cotizacion = cots[0];
                    detalles.total = parseFloat(cotizacion.totalAprobado);
                    detalles.moneda = cotizacion.moneda || 'MXN';
                    detalles.tipo = 'Cita / Servicio Mecánico';
                    detalles.fecha = new Date().toLocaleString('es-MX');

                    const [lineas] = await db.query(`
                        SELECT descripcion, costo as precio, cantidad
                        FROM lineacotizacion
                        WHERE idCotizacion = ?
                    `, [cotizacion.idCotizacion]);

                    detalles.items = lineas.map(l => ({
                        // Se asume cantidad 1 si es NULL por el modelo vago
                        descripcion: l.descripcion,
                        cantidad: l.cantidad || 1,
                        precio: parseFloat(l.precio),
                        subtotal: parseFloat(l.precio) * (l.cantidad || 1)
                    }));

                    // Añadir explícitamente la mano de obra si existe
                    if (cotizacion.mano_obra && parseFloat(cotizacion.mano_obra) > 0) {
                        detalles.items.push({
                            descripcion: 'Mano de Obra',
                            cantidad: 1,
                            precio: parseFloat(cotizacion.mano_obra),
                            subtotal: parseFloat(cotizacion.mano_obra)
                        });
                    }
                }
            }
        }

        res.json(detalles);

    } catch (error) {
        console.error("Error obteniendo detalle de ticket:", error);
        res.status(500).json({ message: 'Error interno de servidor' });
    }
});

// @route   GET /api/tickets/cliente/:idCliente
// @desc    Obtener lista de tickets del cliente
// @access  Private
router.get('/cliente/:idCliente', isAuthenticated, async (req, res) => {
    try {
        const { idCliente } = req.params;
        const [tickets] = await db.query('SELECT * FROM ticketsoporte WHERE idCliente = ? ORDER BY idTicket DESC', [idCliente]);
        res.json(tickets);
    } catch (error) {
        console.error("Error obteniendo tickets:", error);
        res.status(500).json({ message: 'Error interno de servidor' });
    }
});

module.exports = router;
