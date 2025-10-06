
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'clickngo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('Database connection pool created.');

module.exports = pool;
