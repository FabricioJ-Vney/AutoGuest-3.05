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

        let modified = false;

        // Fix user-greeting error
        const regexGreeting = /document\.querySelector\('\.header-right \.user-greeting'\)\.textContent\s*=\s*(.*?);/g;
        if (regexGreeting.test(content)) {
            content = content.replace(regexGreeting, "let ug = document.querySelector('.header-right .user-greeting'); if(ug) { ug.textContent = $1; }");
            modified = true;
        }

        // Also fix logout error since we removed logout-btn too
        const regexLogout = /const logoutBtn = document\.querySelector\('\.logout-btn'\);/g;
        // Actually, the existing code says `if (logoutBtn) { ... }` so it's already safe against null. BUT it might throw errors if something else is chained.
        // Let's just fix the generic `document.querySelector('.user-greeting').textContent` too just in case.
        const regexGreetingGen = /document\.querySelector\('\.user-greeting'\)\.textContent\s*=\s*(.*?);/g;
        if (regexGreetingGen.test(content)) {
            content = content.replace(regexGreetingGen, "let ug2 = document.querySelector('.user-greeting'); if(ug2) { ug2.textContent = $1; }");
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(fullPath, content);
            console.log(`Patched JS errors in ${file}`);
        }
    }
});
