const fs = require('fs');
const filepath = 'pages/cliente/catalogo-om66/Catalogo_Productos.html';
let content = fs.readFileSync(filepath, 'utf8');

// There's a duplicate headers object right after credentials: 'include',
content = content.replace(/credentials:\s*'include',\s*headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\}/, "credentials: 'include'");

fs.writeFileSync(filepath, content);
console.log('Fixed catalog duplicate headers syntax error');
