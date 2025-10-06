
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Admin Dashboard Route
router.get('/dashboard', (req, res) => {
    res.render('admin/dashboard');
});

// --- Promos Management ---

// List all promos
router.get('/promos', async (req, res) => {
    try {
        const [promos] = await pool.query('SELECT * FROM promotions ORDER BY created_at DESC');
        res.render('admin/promos/index', { promos });
    } catch (error) {
        console.error('Error fetching promos:', error);
        res.status(500).send('Error fetching promotions.');
    }
});

// Show create promo form
router.get('/promos/create', (req, res) => {
    res.render('admin/promos/create');
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
        res.render('admin/promos/edit', { promo: promos[0] });
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

module.exports = router;
