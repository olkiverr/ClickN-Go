
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

// Show form to edit an existing listing
router.get('/edit/:id', requireLogin, async (req, res) => {
    try {
        const [items] = await pool.query('SELECT * FROM marketplace_items WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
        if (items.length === 0) {
            return res.status(404).send('Item not found or you do not have permission to edit it.');
        }
        res.render('marketplace/edit', { item: items[0], selectedTag: '' });
    } catch (error) {
        console.error('Error fetching item for editing:', error);
        res.status(500).send('Error fetching item for editing.');
    }
});

// Handle updating of an existing listing
router.post('/edit/:id', requireLogin, async (req, res) => {
    const { title, description, image_url, price_type, price, delivery_type, delivery_fee } = req.body;
    const itemId = req.params.id;
    const userId = req.session.userId;

    try {
        const [items] = await pool.query('SELECT * FROM marketplace_items WHERE id = ? AND user_id = ?', [itemId, userId]);
        if (items.length === 0) {
            return res.status(404).send('Item not found or you do not have permission to edit it.');
        }

        await pool.query(
            'UPDATE marketplace_items SET title = ?, description = ?, image_url = ?, price_type = ?, price = ?, delivery_type = ?, delivery_fee = ? WHERE id = ?',
            [title, description, image_url, price_type, price, delivery_type, delivery_fee, itemId]
        );
        res.redirect(`/marketplace/${itemId}`);
    } catch (error) {
        console.error('Error updating marketplace item:', error);
        res.status(500).send('Error updating listing.');
    }
});

// Handle deletion of a listing
router.post('/delete/:id', requireLogin, async (req, res) => {
    const itemId = req.params.id;
    const userId = req.session.userId;

    try {
        const [items] = await pool.query('SELECT * FROM marketplace_items WHERE id = ? AND user_id = ?', [itemId, userId]);
        if (items.length === 0) {
            return res.status(404).send('Item not found or you do not have permission to delete it.');
        }

        await pool.query('DELETE FROM marketplace_items WHERE id = ?', [itemId]);
        res.redirect('/marketplace');
    } catch (error) {
        console.error('Error deleting marketplace item:', error);
        res.status(500).send('Error deleting listing.');
    }
});

module.exports = router;
