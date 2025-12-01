
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const dbName = process.env.DB_DATABASE;

(async () => {
    let conn;
    try {
        conn = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, port: process.env.DB_PORT });
        await conn.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
        await conn.end();

        conn = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: dbName, port: process.env.DB_PORT });
        console.log(`Connected to database '${dbName}'.`);

        // Create/update users table
        const usersTableSQL = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'user',
                must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await conn.query(usersTableSQL);
        console.log("Table 'users' is up to date.");

        // Create products table
        const productsTableSQL = `
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                stock INT NOT NULL DEFAULT 0,
                image_url VARCHAR(255),
                tags VARCHAR(255) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await conn.query(productsTableSQL);
        console.log("Table 'products' created or already exists.");

        // Create promotions table
        const promotionsTableSQL = `
            CREATE TABLE IF NOT EXISTS promotions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) UNIQUE NULL, /* NULL for global promotions */
                type ENUM('global', 'coupon', 'category', 'product') NOT NULL,
                value DECIMAL(5, 2) NOT NULL, /* Percentage (e.g., 0.15 for 15%) or fixed amount */
                value_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
                applies_to VARCHAR(255) NULL, /* Category name, product ID, or NULL for global */
                expiration_date DATETIME NULL,
                usage_limit INT NULL,
                used_count INT DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `;
        await conn.query(promotionsTableSQL);
        console.log("Table 'promotions' created or already exists.");

        // Create orders table
        const ordersTableSQL = `
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                total_amount DECIMAL(10, 2) NOT NULL,
                discount_amount DECIMAL(10, 2) DEFAULT 0.00,
                promotion_id INT NULL,
                shipping_address TEXT,
                shipping_city VARCHAR(255),
                shipping_zip VARCHAR(20),
                shipping_country VARCHAR(255),
                tracking_number VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (promotion_id) REFERENCES promotions(id)
            );
        `;
        await conn.query(ordersTableSQL);
        console.log("Table 'orders' created or already exists.");

        // Create order_items table
        const orderItemsTableSQL = `
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity INT NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            );
        `;
        await conn.query(orderItemsTableSQL);
        console.log("Table 'order_items' created or already exists.");

        // Create marketplace_items table
        const marketplaceItemsTableSQL = `
            CREATE TABLE IF NOT EXISTS marketplace_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                image_url VARCHAR(255),
                price_type ENUM('fixed', 'negotiable', 'bid') NOT NULL DEFAULT 'fixed',
                price DECIMAL(10, 2) NULL,
                delivery_type ENUM('pickup', 'shipping') NOT NULL DEFAULT 'pickup',
                delivery_fee DECIMAL(10, 2) NULL,
                status ENUM('available', 'sold', 'pending') NOT NULL DEFAULT 'available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        `;
        await conn.query(marketplaceItemsTableSQL);
        console.log("Table 'marketplace_items' created or already exists.");

        // Create chat_messages table
        const chatMessagesTableSQL = `
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                item_id INT NOT NULL,
                sender_id INT NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES marketplace_items(id),
                FOREIGN KEY (sender_id) REFERENCES users(id)
            );
        `;
        await conn.query(chatMessagesTableSQL);
        console.log("Table 'chat_messages' created or already exists.");

        // Create settings table
        const settingsTableSQL = `
            CREATE TABLE IF NOT EXISTS settings (
                setting_key VARCHAR(255) PRIMARY KEY,
                setting_value TEXT
            );
        `;
        await conn.query(settingsTableSQL);
        console.log("Table 'settings' created or already exists.");

        // Insert default settings if not present
        const [settingsRows] = await conn.query('SELECT COUNT(*) AS count FROM settings');
        if (settingsRows[0].count === 0) {
            await conn.query(
                `INSERT INTO settings (setting_key, setting_value) VALUES ('promo_banner_text', 'Welcome to ClickN''Go!')`
            );
            await conn.query(
                `INSERT INTO settings (setting_key, setting_value) VALUES ('promo_banner_active', 'true')`
            );
            console.log('Default settings inserted.');
        } else {
            console.log('Settings already exist.');
        }

        // Create admin user if it doesn't exist
        const [adminRows] = await conn.query('SELECT * FROM users WHERE username = ?', ['admin']);
        if (adminRows.length === 0) {
            const adminPassword = await bcrypt.hash('admin', 10);
            await conn.query(
                'INSERT INTO users (username, email, password, role, must_change_password) VALUES (?, ?, ?, ?, ?)',
                ['admin', 'admin@gmail.com', adminPassword, 'admin', true]
            );
            console.log('Admin user created.');
        } else {
            console.log('Admin user already exists.');
        }

        // Add sample products if the table is empty
        const [productRows] = await conn.query('SELECT id FROM products');
        if (productRows.length === 0) {
            const sampleProducts = [
                ['Intel Core i9-13900K', 'The latest and greatest CPU from Intel.', 589.99, 10, '/img/cpu.jpg', 'CPU,Intel,Gaming'],
                ['NVIDIA GeForce RTX 4090', 'The most powerful GPU on the market.', 1599.99, 10, '/img/gpu.jpg', 'GPU,NVIDIA,Gaming'],
                ['Corsair Vengeance 32GB DDR5', 'High speed DDR5 RAM for modern systems.', 150.00, 10, '/img/ram.jpg', 'RAM,DDR5,Memory'],
                ['Samsung 980 Pro 2TB NVMe SSD', 'Lightning fast storage for your games and applications.', 179.99, 10, '/img/ssd.jpg', 'SSD,NVMe,Storage'],
                ['Windows 11 Pro Key', 'Official license key for Windows 11 Pro.', 199.99, 10, '/img/win.jpg', 'Software,OS,Windows']
            ];
            await conn.query(
                'INSERT INTO products (name, description, price, stock, image_url, tags) VALUES ?',
                [sampleProducts]
            );
            console.log('Sample products inserted.');
        }

        // Add sample marketplace items if the table is empty
        const [marketplaceItemRows] = await conn.query('SELECT id FROM marketplace_items');
        if (marketplaceItemRows.length === 0) {
            const [userRows] = await conn.query('SELECT id FROM users WHERE username = ?', ['admin']);
            const adminUserId = userRows.length > 0 ? userRows[0].id : 1; // Fallback to 1 if admin not found

            const sampleMarketplaceItems = [
                [adminUserId, 'Used Gaming PC', 'A powerful gaming PC with an RTX 3080. Lightly used.', '/img/used_pc.jpg', 'negotiable', 1200.00, 'pickup', null],
                [adminUserId, 'Vintage Camera', 'Classic film camera, great condition.', '/img/vintage_camera.jpg', 'fixed', 250.00, 'shipping', 15.00],
                [adminUserId, 'Designer Watch', 'Luxury watch, almost new.', '/img/watch.jpg', 'bid', 800.00, 'shipping', 10.00]
            ];
            await conn.query(
                'INSERT INTO marketplace_items (user_id, title, description, image_url, price_type, price, delivery_type, delivery_fee) VALUES ?',
                [sampleMarketplaceItems]
            );
            console.log('Sample marketplace items inserted.');
        }

    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        if (conn) {
            await conn.end();
            console.log('Database connection closed.');
        }
    }
})();

