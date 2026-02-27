const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        if (file === 'node_modules' || file.startsWith('.')) continue; // skip node_modules and hidden folders

        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            if (!content.includes('global_nav.js')) {
                // Check if font-awesome is there
                if (!content.includes('font-awesome')) {
                    content = content.replace('</head>', '    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">\n</head>');
                }

                // Inject script at bottom
                content = content.replace('</body>', '    <script src="http://localhost:3000/js/global_nav.js"></script>\n</body>');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log(`Injected into ${fullPath}`);
            }
        }
    }
}

console.log("Starting universal navigation injection...");
processDir(path.join(__dirname, '.'));
console.log("Done injecting global navigation.");
