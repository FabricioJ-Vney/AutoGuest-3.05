const fs = require('fs');
const path = require('path');

const filesToClean = [
    'buscar_talleres.html',
    'detalle_cita.html',
    'gestionar_vehiculos.html',
    'perfil_cliente.html',
    'mis_citas.html'
];

filesToClean.forEach(file => {
    const fullPath = path.join(__dirname, 'pages/cliente', file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');

        // Remove the height constraint to restore normal logo size
        let modified = false;

        if (content.includes('style="height: 50px;"')) {
            content = content.replace(/style="height: 50px;"/g, 'style="height: 90px;"'); // Using 90px as a standard robust header size, or empty. I'll use 90px to be safe.
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(fullPath, content);
            console.log(`Fixed logo size in ${file}`);
        }
    }
});
