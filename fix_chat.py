import os

filepath = 'c:/Users/chabl/OneDrive/Documentos/AutoguestApp/App_web/routes/chat.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """        // Verificar que la cita existe y el usuario tiene relación con ella
        let citaQuery;
        if (role === 'mecanico') {
            citaQuery = await db.query(
                'SELECT idCita FROM cita WHERE idCita = ? AND idMecanico = ?',
                [idCita, userId]
            );
        } else {
            // Cliente
            citaQuery = await db.query(
                'SELECT idCita FROM cita WHERE idCita = ? AND idCliente = ?',
                [idCita, userId]
            );
        }"""

replacement1 = """        // Verificar que la cita existe y el usuario tiene relación con ella
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
        }"""

target2 = """        // Marcar como leídos los mensajes del otro participante
        const otroTipo = role === 'mecanico' ? 'cliente' : 'mecanico';
        await db.query(
            'UPDATE chat_mensaje SET leido = 1 WHERE idCita = ? AND remitenteTipo = ? AND leido = 0',
            [idCita, otroTipo]
        );"""

replacement2 = """        // Marcar como leídos los mensajes del otro participante SOLO si no es taller
        if (role !== 'taller') {
            const otroTipo = role === 'mecanico' ? 'cliente' : 'mecanico';
            await db.query(
                'UPDATE chat_mensaje SET leido = 1 WHERE idCita = ? AND remitenteTipo = ? AND leido = 0',
                [idCita, otroTipo]
            );
        }"""

if target1 in content and target2 in content:
    content = content.replace(target1, replacement1)
    content = content.replace(target2, replacement2)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target string not found in file")
