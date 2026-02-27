const fs = require('fs');
const path = require('path');

function injectScript(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            injectScript(fullPath);
        } else if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');

            // Si ya tiene el script, omítelo
            if (content.includes('global_nav.js')) {
                console.log(`Bypassing ${fullPath} (already injected)`);
                continue;
            }

            // Averiguar el nivel de profundidad para generar la ruta correcta al JS
            const relativePath = path.relative(fullPath, path.join(__dirname, 'js/global_nav.js'));
            // Normalize path for web
            let scriptPath = relativePath.replace(/\\/g, '/').replace('../', '');

            // Asumiendo que todos corren en el puerto 3000 de forma local o usar una ruta absoluta
            const scriptTag = `\n    <script src="http://localhost:3000/js/global_nav.js"></script>\n</body>`;

            if (content.includes('</body>')) {
                content = content.replace('</body>', scriptTag);
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Injected into ${fullPath}`);
            }
        }
    }
}

const targetDir = path.join(__dirname, 'pages', 'cliente');
injectScript(targetDir);
console.log('Done injecting global nav script.');
