const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'pages/cliente');

function processFile(filePath) {
    if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Buscamos todos los fetch() que no tengan Authorization y se lo agregamos
        // Hay dos casos: fetch('url', { options }) o fetch('url')

        // Este regex busca peticiones fetch con objetos de configuración (que tienen headers o credentials)
        // y les inyecta el token Bearer en los headers.

        // 1. Reemplazamos credentials: 'include' añadiendo headers si no existen
        // Nota: Es un reemplazo algo sucio vía regex, para algo más seguro lo inyectaremos en la cabecera misma
        const tokenInyector = `headers: { 
                                'Authorization': 'Bearer ' + localStorage.getItem('token'), 
                                'Content-Type': 'application/json' 
                            }, 
                            credentials: 'include'`;

        if (content.includes("credentials: 'include'") && !content.includes("Authorization")) {
            // Reemplazamos los que tienen solo method y credentials
            content = content.replace(/credentials:\s*'include'/g, tokenInyector);
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log(`Token enforce aplicado en: ${path.basename(filePath)}`);
        }
    }
}

function traverseDirectory(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            // traverseDirectory(fullPath); // Evitamos subdirectorios complejos si no es necesario
        } else {
            processFile(fullPath);
        }
    });
}

traverseDirectory(directoryPath);
// También en Catalogo
processFile(path.join(__dirname, 'pages/cliente/catalogo-om66/Catalogo_Productos.html'));
