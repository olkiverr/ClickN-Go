
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Middleware to initialize cart in session
router.use((req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = [];
    }
    next();
});

// Add item to cart
router.post('/add/:id', async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const quantity = parseInt(req.body.quantity, 10) || 1;

    try {
        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);
        if (rows.length === 0) {
            return res.status(404).send('Product not found.');
        }

        const existingItem = req.session.cart.find(item => item.productId === productId);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            req.session.cart.push({ productId, quantity });
        }
        res.redirect(`/cart/confirmation?productId=${productId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Show cart page
router.get('/', async (req, res) => {
    const cart = req.session.cart;
    if (cart.length === 0) {
        return res.render('cart', { items: [], totalPrice: 0 });
    }

    const productIds = cart.map(item => item.productId);
    const [products] = await pool.query(`SELECT * FROM products WHERE id IN (${productIds.join(',')})`);

    let totalPrice = 0;
    const items = cart.map(item => {
        const product = products.find(p => p.id === item.productId);
        const itemTotal = product.price * item.quantity;
        totalPrice += itemTotal;
        return {
            ...item,
            product,
            itemTotal
        };
    });

    res.render('cart', { items, totalPrice });
});

// Cart confirmation page
router.get('/confirmation', async (req, res) => {
    const productId = parseInt(req.query.productId, 10);
    try {
        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);
        if (rows.length === 0) {
            return res.status(404).send('Product not found.');
        }
        res.render('cart-confirmation', { product: rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Checkout page
router.get('/checkout', async (req, res) => {
    const cart = req.session.cart;
    if (!req.session.userId) {
        return res.redirect('/login'); // Ensure user is logged in
    }

    if (cart.length === 0) {
        return res.render('checkout', { items: [], totalPrice: 0 });
    }

    const productIds = cart.map(item => item.productId);
    const [products] = await pool.query(`SELECT * FROM products WHERE id IN (${productIds.join(',')})`);

    let totalPrice = 0;
    const items = cart.map(item => {
        const product = products.find(p => p.id === item.productId);
        const itemTotal = product.price * item.quantity;
        totalPrice += itemTotal;
        return {
            ...item,
            product,
            itemTotal
        };
    });

    res.render('checkout', { items, totalPrice });
});

// Process checkout
router.post('/checkout', async (req, res) => {
    const userId = req.session.userId;
    const cart = req.session.cart;
    const { shipping_address, shipping_city, shipping_zip, shipping_country } = req.body;
    // Fake payment info is received but not stored for this project

    if (!userId) {
        return res.redirect('/login');
    }
    if (cart.length === 0) {
        return res.redirect('/cart');
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const productIds = cart.map(item => item.productId);
        const [products] = await connection.query(`SELECT id, price FROM products WHERE id IN (${productIds.join(',')})`);

        let totalOrderPrice = 0;
        const orderItemsData = cart.map(item => {
            const product = products.find(p => p.id === item.productId);
            const itemPrice = product ? product.price : 0; // Use current product price
            totalOrderPrice += itemPrice * item.quantity;
            return [item.productId, item.quantity, itemPrice];
        });

        // Generate a fake tracking number
        const trackingNumber = 'TRK' + Date.now() + Math.floor(Math.random() * 1000);

        // Insert into orders table
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, total_price, shipping_address, shipping_city, shipping_zip, shipping_country, tracking_number, shipping_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, totalOrderPrice, shipping_address, shipping_city, shipping_zip, shipping_country, trackingNumber, 'Pending']
        );
        const orderId = orderResult.insertId;

        // Insert into order_items table
        for (const item of orderItemsData) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item[0], item[1], item[2]]
            );
        }

        await connection.commit();
        req.session.cart = []; // Clear cart after successful order
        res.redirect(`/cart/order-success?orderId=${orderId}`); // Redirect to a success page

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Checkout error:', error);
        res.status(500).send('Error processing your order.');
    } finally {
        if (connection) connection.release();
    }
});

// Order success page
router.get('/order-success', async (req, res) => {
    const orderId = parseInt(req.query.orderId, 10);
    try {
        const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, req.session.userId]);
        if (orders.length === 0) {
            return res.status(404).send('Order not found or you do not have permission to view it.');
        }
        const order = orders[0];

        const [orderItems] = await pool.query(
            'SELECT oi.*, p.name, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
            [orderId]
        );

        res.render('order-success', { order, orderItems });
    } catch (error) {
        console.error('Error fetching order success page:', error);
        res.status(500).send('Error loading order success page.');
    }
});

// Remove item from cart
router.get('/remove/:id', (req, res) => {
    const productId = parseInt(req.params.id, 10);
    req.session.cart = req.session.cart.filter(item => item.productId !== productId);
    res.redirect('/cart');
});

module.exports = router;
