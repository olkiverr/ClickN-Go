
const mysql = require('mysql2/promise');

const dbName = 'clickngo';

(async () => {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: ''
        });
        await conn.query(`DROP DATABASE IF EXISTS ${dbName}`);
        console.log(`Database '${dbName}' dropped successfully.`);
    } catch (error) {
        console.error('Error dropping database:', error);
    } finally {
        if (conn) {
            await conn.end();
            console.log('Database connection closed.');
        }
    }
})();
