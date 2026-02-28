const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../config/database');
const router = express.Router();

// Crear un nuevo pedido
// Crear un nuevo pedido
router.post('/', async (req, res) => {
    const { items, metodoPago } = req.body;

    // Obtener usuario de la sesión o cliente general
    let idCliente = req.session.userId || 'CLI02';

    // Si el usuario en sesión no es un cliente (ej. Mecánico), usar el genérico para evitar error de Foreign Key
    if (!idCliente.startsWith('CLI')) {
        idCliente = 'CLI02';
    }

    if (!items || items.length === 0) {
        return res.status(400).json({ mensaje: 'El carrito está vacío.' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const idPedido = 'PED' + nanoid(5);
        let total = 0;

        // Verificar stock y calcular total
        for (const item of items) {
            const [productRows] = await connection.query('SELECT stock, precio, nombre FROM iteminventario WHERE idItem = ?', [item.idItemInventario]);

            if (productRows.length === 0) {
                throw new Error(`Producto con ID ${item.idItemInventario} no encontrado.`);
            }

            const product = productRows[0];

            if (product.stock < item.cantidad) {
                return res.status(400).json({ mensaje: `Stock insuficiente para ${product.nombre}.` });
            }

            total += product.precio * item.cantidad;
        }

        // Insertar Pedido
        // Estado de pago: 'PAGADO' si viene método de pago, sino 'PENDIENTE'
        const estadoPago = metodoPago ? 'PAGADO' : 'PENDIENTE';

        await connection.query(
            'INSERT INTO pedido (idPedido, estado, total_pedido, estado_pago, idCliente) VALUES (?, ?, ?, ?, ?)',
            [idPedido, 'Procesando', total, estadoPago, idCliente]
        );

        // Notificar al administrador del taller sobre el nuevo pedido
        // Buscamos el taller del primer item para simplificar (asumiendo un solo taller por pedido)
        const [firstItemRows] = await connection.query('SELECT idTaller FROM iteminventario WHERE idItem = ?', [items[0].idItemInventario]);
        if (firstItemRows.length > 0) {
            const idTaller = firstItemRows[0].idTaller;
            const [adminRows] = await connection.query('SELECT idUsuario FROM administrador WHERE idTaller = ? LIMIT 1', [idTaller]);
            if (adminRows.length > 0) {
                await connection.query(
                    'INSERT INTO notificacion (idUsuario, titulo, mensaje, tipo) VALUES (?, ?, ?, ?)',
                    [adminRows[0].idUsuario, 'Nueva Venta Recibida', `Se ha generado un nuevo pedido (${idPedido}) por un total de $${total.toFixed(2)}.`, 'venta']
                );
            }
        }

        // Insertar Líneas de Pedido y actualizar stock
        for (const item of items) {
            await connection.query(
                'INSERT INTO lineapedido (idPedido, cantidad, idItemInventario) VALUES (?, ?, ?)',
                [idPedido, item.cantidad, item.idItemInventario]
            );

            await connection.query(
                'UPDATE iteminventario SET stock = stock - ? WHERE idItem = ?',
                [item.cantidad, item.idItemInventario]
            );

            // Notificar al Taller si el producto se agota
            const [invRows] = await connection.query('SELECT stock, idTaller, nombre FROM iteminventario WHERE idItem = ?', [item.idItemInventario]);
            if (invRows.length > 0 && invRows[0].stock <= 0) {
                const [adminRows] = await connection.query('SELECT idUsuario FROM administrador WHERE idTaller = ? LIMIT 1', [invRows[0].idTaller]);
                if (adminRows.length > 0) {
                    await connection.query(
                        'INSERT INTO notificacion (idUsuario, titulo, mensaje, tipo) VALUES (?, ?, ?, ?)',
                        [adminRows[0].idUsuario, 'Stock Agotado', `El producto "${invRows[0].nombre}" se ha quedado en cero.`, 'inventario']
                    );
                }
            }
        }

        // Crear ticket de soporte
        let idTicket = null;
        if (estadoPago === 'PAGADO') {
            idTicket = 'TK-PAY-' + nanoid(6);
            await connection.query(
                'INSERT INTO ticketsoporte (idTicket, asunto, estado, idCliente, idPedido) VALUES (?, ?, ?, ?, ?)',
                [idTicket, `Comprobante de Pago Pedido: ${idPedido}`, 'Cerrado', idCliente, idPedido]
            );
        }

        await connection.commit();
        res.status(201).json({ mensaje: 'Pedido creado con éxito', idPedido, idTicket });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ mensaje: 'Error al guardar el pedido: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// Generar Ticket de Venta
router.get('/:id/ticket', async (req, res) => {
    const { id } = req.params;

    try {
        // Obtener datos del pedido
        const [pedidos] = await db.query(`
            SELECT p.idPedido, p.fecha_pedido, p.total_pedido, p.estado_pago, u.nombre as nombre_cliente
            FROM pedido p
            LEFT JOIN usuario u ON p.idCliente = u.idUsuario
            WHERE p.idPedido = ?
        `, [id]);

        if (pedidos.length === 0) {
            return res.status(404).send('Pedido no encontrado');
        }

        const pedido = pedidos[0];

        // Obtener líneas del pedido
        const [lineas] = await db.query(`
            SELECT lp.cantidad, i.nombre, i.precio, (lp.cantidad * i.precio) as subtotal
            FROM lineapedido lp
            JOIN iteminventario i ON lp.idItemInventario = i.idItem
            WHERE lp.idPedido = ?
        `, [id]);

        const fecha = new Date(pedido.fecha_pedido).toLocaleString('es-MX');

        // Generar HTML del ticket
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Nota de Venta - ${pedido.idPedido}</title>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; background-color: #f4f4f4; padding: 20px; }
                    .ticket { max-width: 400px; margin: 0 auto; background: white; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                    .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 10px; margin-bottom: 10px; }
                    .header h1 { font-size: 24px; margin: 0; color: #d35400; }
                    .header p { margin: 5px 0; font-size: 14px; }
                    .info { margin-bottom: 15px; font-size: 14px; }
                    .items-table { width: 100%; border-collapse: collapse; font-size: 14px; }
                    .items-table th { text-align: left; border-bottom: 1px solid #ddd; padding: 5px 0; }
                    .items-table td { padding: 5px 0; }
                    .total-section { border-top: 2px dashed #333; margin-top: 10px; padding-top: 10px; text-align: right; font-size: 18px; font-weight: bold; }
                    .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #777; }
                    .btn-print { display: block; width: 100%; padding: 10px; background: #333; color: white; text-align: center; text-decoration: none; margin-top: 20px; border-radius: 5px; }
                    @media print { .btn-print { display: none; } body { background: white; } .ticket { box-shadow: none; border: none; } }
                </style>
            </head>
            <body>
                <div class="ticket">
                    <div class="header">
                        <h1>AUTO GUEST</h1>
                        <p>Refacciones y Servicios</p>
                        <p>Sucursal Principal</p>
                    </div>
                    
                    <div class="info">
                        <p><strong>Folio:</strong> ${pedido.idPedido}</p>
                        <p><strong>Fecha:</strong> ${fecha}</p>
                        <p><strong>Cliente:</strong> ${pedido.nombre_cliente || 'Cliente General'}</p>
                        <p><strong>Estado:</strong> ${pedido.estado_pago}</p>
                    </div>

                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Cant.</th>
                                <th>Producto</th>
                                <th>Importe</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lineas.map(item => `
                                <tr>
                                    <td>${item.cantidad}</td>
                                    <td>${item.nombre}</td>
                                    <td>$${Number(item.subtotal).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="total-section">
                        Total: $${Number(pedido.total_pedido).toFixed(2)}
                    </div>

                    <div class="footer">
                        <p>¡Gracias por su compra!</p>
                        <p>Para dudas o aclaraciones conserve este ticket.</p>
                        <p>www.autoguest.com</p>
                    </div>

                    <a href="#" onclick="window.print()" class="btn-print">Imprimir Ticket</a>
                </div>
            </body>
            </html>
        `;

        res.send(html);

    } catch (error) {
        console.error('Error al generar ticket:', error);
        res.status(500).send('Error al generar el ticket');
    }
});

module.exports = router;