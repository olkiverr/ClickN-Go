
const express = require('express');
const router = express.Router();
const pool = require('../db');
const requireLogin = require('../middleware/requireLogin');

// Marketplace home - list all available items
router.get('/', async (req, res) => {
    try {
        const [items] = await pool.query("SELECT * FROM marketplace_items WHERE status = 'available' ORDER BY created_at DESC");
        res.render('marketplace/index', { items, selectedTag: '' });
    } catch (error) {
        console.error('Error fetching marketplace items:', error);
        res.status(500).send('Error fetching marketplace items.');
    }
});

// Show form to create a new listing
router.get('/new', requireLogin, (req, res) => {
    res.render('marketplace/new', { selectedTag: '' });
});

// Handle creation of a new listing
router.post('/', requireLogin, async (req, res) => {
    const { title, description, image_url, price_type, price, delivery_type, delivery_fee } = req.body;
    const userId = req.session.userId;

    try {
        await pool.query(
            'INSERT INTO marketplace_items (user_id, title, description, image_url, price_type, price, delivery_type, delivery_fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, title, description, image_url, price_type, price, delivery_type, delivery_fee]
        );
        res.redirect('/marketplace');
    } catch (error) {
        console.error('Error creating marketplace item:', error);
        res.status(500).send('Error creating listing.');
    }
});

// Show details of a single item
router.get('/:id', async (req, res) => {
    try {
        const [items] = await pool.query('SELECT * FROM marketplace_items WHERE id = ?', [req.params.id]);
        if (items.length === 0) {
            return res.status(404).send('Item not found.');
        }
        const item = items[0];
        res.render('marketplace/detail', { item, selectedTag: '' });
    } catch (error) {
        console.error('Error fetching marketplace item:', error);
        res.status(500).send('Error fetching item details.');
    }
});

module.exports = router;
