const express = require('express');
const router = express.Router();
const pool = require('../db');

// Import sub-routers
const userRoutes = require('./admin/users');
const productRoutes = require('./admin/products');
const orderRoutes = require('./admin/orders');

// Admin Dashboard Route
router.get('/dashboard', (req, res) => {
    res.render('admin/dashboard', { selectedTag: '' });
});

// Mount sub-routers
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);


// --- Promos Management ---

// List all promos
router.get('/promos', async (req, res) => {
    try {
        const [promos] = await pool.query('SELECT * FROM promotions ORDER BY created_at DESC');
        res.render('admin/promos/index', { promos, selectedTag: '' });
    } catch (error) {
        console.error('Error fetching promos:', error);
        res.status(500).send('Error fetching promotions.');
    }
});

// Show create promo form
router.get('/promos/create', (req, res) => {
    res.render('admin/promos/create', { selectedTag: '' });
});

// Create new promo
router.post('/promos', async (req, res) => {
    let { code, type, value, value_type, applies_to, expiration_date, usage_limit, is_active } = req.body;

    // Sanitize inputs
    code = code ? code.toUpperCase() : null;
    value = parseFloat(value);
    usage_limit = usage_limit ? parseInt(usage_limit, 10) : null;
    is_active = is_active === 'on' ? 1 : 0; // Checkbox value
    expiration_date = expiration_date ? new Date(expiration_date) : null;

    try {
        await pool.query(
            'INSERT INTO promotions (code, type, value, value_type, applies_to, expiration_date, usage_limit, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [code, type, value, value_type, applies_to, expiration_date, usage_limit, is_active]
        );
        res.redirect('/admin/promos');
    } catch (error) {
        console.error('Error creating promo:', error);
        res.status(500).send('Error creating promotion. Code might already exist.');
    }
});

// Show edit promo form
router.get('/promos/edit/:id', async (req, res) => {
    const promoId = req.params.id;
    try {
        const [promos] = await pool.query('SELECT * FROM promotions WHERE id = ?', [promoId]);
        if (promos.length === 0) {
            return res.status(404).send('Promo not found.');
        }
        res.render('admin/promos/edit', { promo: promos[0], selectedTag: '' });
    } catch (error) {
        console.error('Error fetching promo for edit:', error);
        res.status(500).send('Error fetching promotion.');
    }
});

// Update promo
router.post('/promos/edit/:id', async (req, res) => {
    const promoId = req.params.id;
    let { code, type, value, value_type, applies_to, expiration_date, usage_limit, is_active } = req.body;

    // Sanitize inputs
    code = code ? code.toUpperCase() : null;
    value = parseFloat(value);
    usage_limit = usage_limit ? parseInt(usage_limit, 10) : null;
    is_active = is_active === 'on' ? 1 : 0; // Checkbox value
    expiration_date = expiration_date ? new Date(expiration_date) : null;

    try {
        await pool.query(
            'UPDATE promotions SET code = ?, type = ?, value = ?, value_type = ?, applies_to = ?, expiration_date = ?, usage_limit = ?, is_active = ? WHERE id = ?',
            [code, type, value, value_type, applies_to, expiration_date, usage_limit, is_active, promoId]
        );
        res.redirect('/admin/promos');
    } catch (error) {
        console.error('Error updating promo:', error);
        res.status(500).send('Error updating promotion. Code might already exist.');
    }
});

// Delete promo
router.post('/promos/delete/:id', async (req, res) => {
    const promoId = req.params.id;
    try {
        await pool.query('DELETE FROM promotions WHERE id = ?', [promoId]);
        res.redirect('/admin/promos');
    } catch (error) {
        console.error('Error deleting promo:', error);
        res.status(500).send('Error deleting promotion.');
    }
});

// GET /admin/promos/:id/orders - View orders that used a specific promo
router.get('/promos/:id/orders', async (req, res) => {
    const promoId = req.params.id;
    try {
        const [promoRows] = await pool.query('SELECT * FROM promotions WHERE id = ?', [promoId]);
        if (promoRows.length === 0) {
            return res.status(404).send('Promotion not found.');
        }
        const promo = promoRows[0];

        const [orders] = await pool.query(`
            SELECT o.id, o.user_id, u.username, o.total_amount, o.status, o.created_at
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.promotion_id = ?
            ORDER BY o.created_at DESC
        `, [promoId]);

        res.render('admin/promos/promo-orders', { promo, orders, selectedTag: '' });
    } catch (error) {
        console.error('Error fetching orders for promo:', error);
        res.status(500).send('Error fetching orders.');
    }
});

// --- Settings Management ---

// Show settings page
router.get('/settings', async (req, res) => {
    try {
        const [settingsRows] = await pool.query('SELECT * FROM settings');
        const settings = settingsRows.reduce((acc, row) => {
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, {});
        res.render('admin/settings', { settings, selectedTag: '' });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).send('Error fetching settings.');
    }
});

// Update settings
router.post('/settings', async (req, res) => {
    const { promo_banner_text, promo_banner_active } = req.body;
    const settingsToUpdate = {
        promo_banner_text: promo_banner_text,
        promo_banner_active: promo_banner_active === 'on' ? 'true' : 'false'
    };

    try {
        for (const [key, value] of Object.entries(settingsToUpdate)) {
            await pool.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
        }
        res.redirect('/admin/settings');
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).send('Error updating settings.');
    }
});

module.exports = router;