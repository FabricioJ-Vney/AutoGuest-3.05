require('dotenv').config();
const db = require('./config/database');
async function run() {
    try {
        await db.query('ALTER TABLE taller ADD COLUMN telefono_contacto VARCHAR(20) DEFAULT NULL;');
        console.log('Added telefono_contacto');
    } catch (e) { console.log(e.message); }
    try {
        await db.query('ALTER TABLE taller ADD COLUMN redes_sociales VARCHAR(255) DEFAULT NULL;');
        console.log('Added redes_sociales');
    } catch (e) { console.log(e.message); }
    process.exit();
}
run();
