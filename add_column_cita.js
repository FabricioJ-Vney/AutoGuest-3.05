require('dotenv').config();
const db = require('./config/database');
async function addColumn() {
    try {
        await db.query("ALTER TABLE cita ADD COLUMN servicio_solicitado VARCHAR(255) DEFAULT NULL");
        console.log("Columna servicio_solicitado añadida con éxito");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
addColumn();
