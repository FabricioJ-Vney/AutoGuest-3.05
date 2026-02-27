const fs = require('fs');
let filename = 'detalle_taller.html';
let content = fs.readFileSync(filename, 'utf8');
const replacement = `headers: { 
                        'Authorization': 'Bearer ' + localStorage.getItem('token'), 
                        'Content-Type': 'application/json' 
                    }, 
                    credentials: 'include'`;

content = content.replace(/credentials\s*:\s*'include'/g, replacement);
fs.writeFileSync(filename, content);
console.log('Fixed auth tokens inside ' + filename);
