const fs = require('fs');
const path = require('path');

const filesToFix = [
    'pages/cliente/historial_cliente.html',
    'pages/cliente/detalle_cita.html',
    'pages/cliente/ticket_confirmacion.html'
];

for (const file of filesToFix) {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) continue;

    let content = fs.readFileSync(fullPath, 'utf8');

    // 1. Repair historial_cliente.html syntax corruption
    if (file.includes('historial_cliente.html')) {
        content = content.replace(/\$ \{/g, '${');
        content = content.replace(/! !/g, '!!');
        content = content.replace(/! ==/g, '!==');
        content = content.replace(/===/g, '==='); // Just in case
        content = content.replace(/=> \{/g, '=>{');
    }

    // 2. Safely replace "Volver a..." links without ruining HTML/JS via the LLM tool
    if (file.includes('historial_cliente.html')) {
        content = content.replace(
            '<a href="dashboard_cliente.html" style="color: #f39c12; text-decoration: none; font-size: 1.5em;" title="Volver al Dashboard"><i class="fas fa-arrow-left"></i></a>',
            '<a href="dashboard_cliente.html" style="color: #f39c12; text-decoration: none; font-size: 1.5em;" title="Volver al Dashboard"><i class="fas fa-arrow-left"></i></a>'
        ); // (Already replaced manually above in historial_cliente, just ensuring)

        // Sometimes it might still have the old one
        content = content.replace(
            '<a href="dashboard_cliente.html" style="color: #f39c12; text-decoration: none;">Volver al Dashboard</a>',
            '<a href="dashboard_cliente.html" style="color: #f39c12; text-decoration: none; font-size: 1.5em;" title="Volver al Dashboard"><i class="fas fa-arrow-left"></i></a>'
        );
    }

    if (file.includes('detalle_cita.html')) {
        content = content.replace(
            '<a href="mis_citas.html" class="back-link"><i class="fas fa-arrow-left"></i><span>Volver a Mis Citas</span></a>',
            '<a href="mis_citas.html" class="back-link" title="Volver a Mis Citas"><i class="fas fa-arrow-left" style="font-size: 1.5em; color: #f39c12;"></i></a>'
        );
    }

    if (file.includes('ticket_confirmacion.html')) {
        content = content.replace(
            '<a href="dashboard_cliente.html" style="color: #f39c12; text-decoration: none;">Volver al Dashboard</a>',
            '<a href="dashboard_cliente.html" style="color: #f39c12; text-decoration: none; font-size: 1.5em;" title="Volver al Dashboard"><i class="fas fa-arrow-left"></i></a>'
        );
        content = content.replace(
            '<a href="dashboard_cliente.html" class="btn btn-primary"><i class="fas fa-home"></i> Volver al Inicio</a>',
            '<a href="dashboard_cliente.html" class="btn btn-primary" title="Volver al Inicio"><i class="fas fa-arrow-left" style="font-size: 1.5em;"></i></a>'
        );
    }

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed and updated: ${file}`);
}
