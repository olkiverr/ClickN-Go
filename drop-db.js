
require('dotenv').config();
const mysql = require('mysql2/promise');

const dbName = process.env.DB_DATABASE;

(async () => {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
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
