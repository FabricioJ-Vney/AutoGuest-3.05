const express = require('express');
const paypal = require('@paypal/checkout-server-sdk');
const { nanoid } = require('nanoid'); // Usar nanoid para IDs
const paypalClient = require('../config/paypal');
const db = require('../config/database');

const router = express.Router();

// @route   POST /api/paypal/create-order
// @desc    Crear una orden de pago en PayPal basada en una cotización
router.post('/create-order', async (req, res) => {
    const { id_cotizacion } = req.body;

    if (!id_cotizacion) {
        return res.status(400).json({ message: 'El ID de la cotización es requerido.' });
    }

    try {
        // 1. Obtener el monto de la cotización desde la base de datos de manera real
        const [rows] = await db.query('SELECT totalAprobado, moneda FROM cotizacion WHERE idCotizacion = ?', [id_cotizacion]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Error: Cotización no encontrada.' });
        }

        const totalAmount = parseFloat(rows[0].totalAprobado).toFixed(2);
        const currencyCode = rows[0].moneda || 'MXN';

        if (parseFloat(totalAmount) <= 0) {
            return res.status(400).json({ message: 'Error: El monto de la cotización no es válido.' });
        }

        // 2. Crear la orden en PayPal
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: currencyCode,
                    value: totalAmount
                }
            }]
        });

        const order = await paypalClient.execute(request);
        const paypalOrderID = order.result.id;

        // 3. Guardar el id_orden_paypal en la cotización tal como se solicitó
        await db.query(
            'UPDATE cotizacion SET id_orden_paypal = ? WHERE idCotizacion = ?',
            [paypalOrderID, id_cotizacion]
        );

        console.log(`Orden de PayPal ${paypalOrderID} creada para la cotización ${id_cotizacion}. Monto: ${totalAmount}`);
        res.status(200).json({ orderID: paypalOrderID });

    } catch (err) {
        console.error('Error al crear la orden de PayPal:', err);
        res.status(500).json({ message: 'Error interno al crear la orden de PayPal.' });
    }
});

// @route   POST /api/paypal/capture-order
// @desc    Capturar el pago y actualizar el estado
router.post('/capture-order', async (req, res) => {
    const { orderID } = req.body;

    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    try {
        const capture = await paypalClient.execute(request);
        const status = capture.result.status;
        const captureDetails = capture.result;

        console.log(`Orden ${orderID} capturada con estado: ${status}`);

        // 1. Guardar la respuesta completa en log_pagos_paypal para auditoría
        try {
            await db.query(
                'INSERT INTO log_pagos_paypal (id_orden_paypal, status, respuesta_completa) VALUES (?, ?, ?)',
                [orderID, status, JSON.stringify(captureDetails)]
            );
        } catch (logError) {
            console.error("Error al registrar el log en log_pagos_paypal:", logError);
            // No interrumpir el proceso de captura por fallo en logs
        }

        // 2. Registrar el evento en paypal_webhooks (se toma el id de la captura)
        const transactionID = capture.result.purchase_units[0].payments.captures[0].id;

        try {
            await db.query(
                'INSERT INTO paypal_webhooks (evento_id, tipo_evento, estado, detalles) VALUES (?, ?, ?, ?)',
                [transactionID, 'PAYMENT.CAPTURE.COMPLETED', status, JSON.stringify(captureDetails)]
            );
        } catch (webhookError) {
            console.error("Error al registrar el webhook en paypal_webhooks:", webhookError);
        }

        if (status === 'COMPLETED') {
            // 3. Actualizar la tabla cotizacion con estado_pago = 'PAGADO' y id_transaccion
            const [result] = await db.query(
                'UPDATE cotizacion SET estado_pago = ?, metodo_pago = ?, id_transaccion = ? WHERE id_orden_paypal = ?',
                ['PAGADO', 'PAYPAL', transactionID, orderID]
            );

            let message = 'Pago completado con éxito.';

            if (result.affectedRows > 0) {
                console.log(`Cotización actualizada. Orden ${orderID} PAGADO con transacción ${transactionID}`);

                // 4. Crear Ticket de Soporte como Comprobante
                try {
                    // Obtener idCliente y origen (Cita o Pedido) de la cotizacion
                    const [cotizRows] = await db.query('SELECT idCliente, id_pedido, idCita FROM cotizacion WHERE id_orden_paypal = ?', [orderID]);
                    if (cotizRows.length > 0) {
                        const idCliente = cotizRows[0].idCliente;
                        const idPedido = cotizRows[0].id_pedido || null;
                        const idCita = cotizRows[0].idCita;

                        const idTicket = 'TK-PAY-' + nanoid(6).toUpperCase();

                        // LÓGICA DE ASUNTO ESPECÍFICA SOLICITADA
                        let asunto;
                        if (idPedido) {
                            asunto = 'Comprobante de Pago - Catálogo';
                        } else {
                            asunto = 'Comprobante de Pago - Cita: ' + idCita;
                        }

                        // El estado siempre debe ser Cerrado para comprobantes de pago
                        await db.query(`
                            INSERT INTO ticketsoporte (idTicket, asunto, estado, idCliente, idPedido)
                            VALUES (?, ?, ?, ?, ?)
                        `, [idTicket, asunto, 'Cerrado', idCliente, idPedido]);

                        console.log(`Ticket de comprobante generado: ${idTicket}`);
                        message = 'Pago completado y comprobante generado.';

                        // Enviamos el idTicket en la respuesta
                        return res.status(200).json({
                            success: true,
                            message: message,
                            idTicket: idTicket,
                            redirectUrl: `/pages/cliente/ticket_confirmacion.html?idTicket=${idTicket}`
                        });
                    }
                } catch (ticketError) {
                    console.error("Error al generar el ticket de soporte:", ticketError);
                }
            } else {
                console.warn(`No se actualizó ninguna cotización con el id_orden_paypal ${orderID}`);
            }

            res.status(200).json({ success: true, message: message });
        } else {
            res.status(400).json({ success: false, message: `El pago no se completó. Estado actual: ${status}` });
        }

    } catch (err) {
        console.error('Error al capturar el pago:', err);
        res.status(500).json({ message: 'Error interno al capturar el pago de PayPal.', details: err.message });
    }
});

module.exports = router;
