const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'pages/cliente/perfil_cliente.html');
if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Muro 1
    content = content.replace(
        /<a href="dashboard_cliente.html" class="back-to-dashboard">\s*<i class="fas fa-arrow-left"><\/i>\s*<span>Volver al Panel<\/span>\s*<\/a>/g,
        '<a href="dashboard_cliente.html" class="back-to-dashboard" title="Volver al Panel">\n                <i class="fas fa-arrow-left" style="font-size: 1.5em; color: #f39c12;"></i>\n            </a>'
    );

    // Muro 2
    content = content.replace(
        /<button type="button" class="btn btn-secondary" onclick="window.location.href='dashboard_cliente.html'">\s*Volver al Panel\s*<\/button>/g,
        '<button type="button" class="btn btn-secondary" onclick="window.location.href=\'dashboard_cliente.html\'" title="Volver al Panel">\n                    <i class="fas fa-arrow-left" style="font-size: 1.2em;"></i>\n                </button>'
    );

    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed perfil_cliente.html');
}
