const fs = require('fs');
const path = require('path');

const filesToClean = [
    'buscar_talleres.html',
    'detalle_cita.html',
    'gestionar_vehiculos.html',
    'perfil_cliente.html'
];

const cleanHeader = `<header class="simple-header" style="background: #2c2c2c; padding: 15px 40px; border-bottom: 1px solid #333;">
        <a href="dashboard_cliente.html">
            <img src="../../imagenes/Logo_Autoguest.png" alt="Logo de AutoGuest" class="logo" style="height: 50px;">
        </a>
    </header>`;

filesToClean.forEach(file => {
    const fullPath = path.join(__dirname, 'pages/cliente', file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');

        // Find the <header> block and replace it
        // We use regex to match <header class="dashboard-header">...</header>
        const regex = /<header class="dashboard-header">[\s\S]*?<\/header>/g;
        if (regex.test(content)) {
            content = content.replace(regex, cleanHeader);
            fs.writeFileSync(fullPath, content);
            console.log(`Cleaned header in ${file}`);
        }
    }
});
