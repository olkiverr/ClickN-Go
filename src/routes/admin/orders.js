const express = require('express');
const router = express.Router();
const pool = require('../../db');

// GET /admin/orders - Display all orders
router.get('/', async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT o.id, o.user_id, u.username, o.total_amount, o.status, o.created_at
            FROM orders o
            JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
        `);
        res.render('admin/orders', { orders, selectedTag: 'admin' });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Error fetching orders.');
    }
});

// GET /admin/orders/:id - Display a single order's details
router.get('/:id', async (req, res) => {
    try {
        const [orderRows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        if (orderRows.length === 0) {
            return res.status(404).send('Order not found.');
        }
        const order = orderRows[0];

        const [itemRows] = await pool.query(`
            SELECT oi.quantity, oi.price, p.name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [req.params.id]);

        res.render('admin/order-detail', { order, items: itemRows, selectedTag: 'admin' });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Error fetching order details.');
    }
});

// POST /admin/orders/status/:id - Update an order's status
router.post('/status/:id', async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        res.redirect(`/admin/orders/${req.params.id}`);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).send('Error updating order status.');
    }
});

module.exports = router;
