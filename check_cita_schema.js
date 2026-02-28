require('dotenv').config();
const db = require('./config/database');
async function check() {
    try {
        const [rows] = await db.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cita' AND TABLE_SCHEMA = 'gestion_taller'");
        console.log(rows.map(r => r.COLUMN_NAME));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
