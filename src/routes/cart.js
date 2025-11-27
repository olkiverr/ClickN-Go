
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
    let promo = req.session.promo || null;
    let discountAmount = 0;
    let finalPrice = 0;

    if (cart.length === 0) {
        // Clear promo if cart becomes empty
        if (req.session.promo) delete req.session.promo;
        return res.render('cart', { 
            items: [], 
            totalPrice: 0, 
            discountAmount: 0, 
            finalPrice: 0,
            promo: null,
            promoError: req.session.promoError,
            promoSuccess: req.session.promoSuccess
        });
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

    finalPrice = totalPrice;

    if (promo) {
        if (promo.value_type === 'percentage') {
            discountAmount = totalPrice * promo.value;
        } else { // Fixed amount
            discountAmount = promo.value;
        }
        finalPrice = totalPrice - discountAmount;
        if (finalPrice < 0) finalPrice = 0; // Ensure total doesn't go negative
    }
    
    const promoError = req.session.promoError;
    const promoSuccess = req.session.promoSuccess;
    delete req.session.promoError;
    delete req.session.promoSuccess;

    res.render('cart', { items, totalPrice, discountAmount, finalPrice, promo, promoError, promoSuccess });
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
    // This page is now just for entering shipping info
    if (!req.session.userId) return res.redirect('/login');
    if (req.session.cart.length === 0) return res.redirect('/cart');
    res.render('checkout', { shippingInfo: req.session.shippingInfo || {} });
});

// Save shipping info and move to review
router.post('/checkout', (req, res) => {
    req.session.shippingInfo = req.body;
    res.redirect('/cart/checkout/review');
});

// Review order page
router.get('/checkout/review', async (req, res) => {
    const { cart, promo, shippingInfo, userId } = req.session;
    if (!userId) return res.redirect('/login');
    if (!cart || cart.length === 0) return res.redirect('/cart');
    if (!shippingInfo) return res.redirect('/cart/checkout');

    const productIds = cart.map(item => item.productId);
    const [products] = await pool.query(`SELECT * FROM products WHERE id IN (${productIds.join(',')})`);

    let totalPrice = 0;
    const items = cart.map(item => {
        const product = products.find(p => p.id === item.productId);
        const itemTotal = product.price * item.quantity;
        totalPrice += itemTotal;
        return { ...item, product, itemTotal };
    });

    let discountAmount = 0;
    let finalPrice = totalPrice;
    if (promo) {
        discountAmount = promo.value_type === 'percentage' ? totalPrice * promo.value : promo.value;
        finalPrice = Math.max(0, totalPrice - discountAmount);
    }

    res.render('checkout-review', { items, totalPrice, discountAmount, finalPrice, promo, shippingInfo });
});

// Process checkout
router.post('/checkout/confirm', async (req, res) => {
    const { userId, cart, promo, shippingInfo } = req.session;
    if (!userId) return res.redirect('/login');
    if (!cart || cart.length === 0) return res.redirect('/cart');
    if (!shippingInfo) return res.redirect('/cart/checkout');

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const productIds = cart.map(item => item.productId);
        const [products] = await connection.query(`SELECT id, price FROM products WHERE id IN (${productIds.join(',')})`);

        let totalPrice = 0;
        const orderItemsData = cart.map(item => {
            const product = products.find(p => p.id === item.productId);
            const itemPrice = product ? product.price : 0;
            totalPrice += itemPrice * item.quantity;
            return [item.productId, item.quantity, itemPrice];
        });

        let discountAmount = 0;
        let finalPrice = totalPrice;
        let promotionId = null;

        if (promo) {
            discountAmount = promo.value_type === 'percentage' ? totalPrice * promo.value : promo.value;
            finalPrice = Math.max(0, totalPrice - discountAmount);
            promotionId = promo.id;
        }

        const trackingNumber = 'TRK' + Date.now() + Math.floor(Math.random() * 1000);

        const { shipping_address, shipping_city, shipping_zip, shipping_country } = shippingInfo;
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, total_amount, discount_amount, promotion_id, shipping_address, shipping_city, shipping_zip, shipping_country, tracking_number, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, finalPrice, discountAmount, promotionId, shipping_address, shipping_city, shipping_zip, shipping_country, trackingNumber, 'Pending']
        );
        const orderId = orderResult.insertId;

        for (const item of orderItemsData) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item[0], item[1], item[2]]
            );
        }

        if (promotionId) {
            await connection.query('UPDATE promotions SET used_count = used_count + 1 WHERE id = ?', [promotionId]);
        }

        await connection.commit();
        req.session.cart = [];
        delete req.session.promo;
        delete req.session.shippingInfo;
        res.redirect(`/cart/order-success?orderId=${orderId}`);

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

// Apply a promotion code
router.post('/apply-promo', async (req, res) => {
    const { promoCode } = req.body;
    const cart = req.session.cart;

    if (!cart || cart.length === 0) {
        req.session.promoError = 'Your cart is empty.';
        return res.redirect('/cart');
    }

    try {
        const [promos] = await pool.query('SELECT * FROM promotions WHERE code = ? AND is_active = 1', [promoCode]);
        if (promos.length === 0) {
            req.session.promoError = 'Invalid or expired promotion code.';
            return res.redirect('/cart');
        }

        const promo = promos[0];

        // Optional: Add more validation like expiration date, usage limit, etc.

        req.session.promo = {
            id: promo.id,
            code: promo.code,
            type: promo.type,
            value: promo.value,
            value_type: promo.value_type
        };
        
        req.session.promoSuccess = `Promotion code "${promo.code}" applied successfully.`;
        delete req.session.promoError;
        res.redirect('/cart');

    } catch (error) {
        console.error('Error applying promo code:', error);
        req.session.promoError = 'Error applying promotion code.';
        res.status(500).send('Error applying promotion code.');
    }
});

module.exports = router;
