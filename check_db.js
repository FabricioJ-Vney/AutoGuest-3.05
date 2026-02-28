require('dotenv').config();
const db = require('./config/database');
async function check() {
    try {
        const [rows] = await db.query('DESCRIBE taller');
        console.log(rows);
    } catch (e) { console.error(e); }
    process.exit();
}
check();
