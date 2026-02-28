const mysql = require('mysql2/promise');
async function run() {
    const conn = await mysql.createConnection({ user: 'root', database: 'gestion_taller' });
    const [rows] = await conn.query('SHOW CREATE TABLE cita');
    console.log(rows[0]['Create Table']);
    process.exit();
}
run();
