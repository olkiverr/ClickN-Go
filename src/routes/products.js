
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Route to display all products with filtering and search
router.get('/', async (req, res) => {
    const { q, tag, minPrice, maxPrice } = req.query;
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (q) {
        sql += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${q}%`, `%${q}%`);
    }
    if (tag) {
        sql += ' AND tags LIKE ?';
        params.push(`%${tag}%`);
    }
    if (minPrice) {
        sql += ' AND price >= ?';
        params.push(parseFloat(minPrice));
    }
    if (maxPrice) {
        sql += ' AND price <= ?';
        params.push(parseFloat(maxPrice));
    }

    try {
        const [products] = await pool.query(sql, params);
        res.render('products', { products, searchQuery: q, selectedTag: tag, minPrice, maxPrice });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Error fetching products.');
    }
});

// Route to display a single product's details
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).send('Product not found.');
        }
        res.render('product-detail', { product: rows[0] });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).send('Error fetching product.');
    }
});

module.exports = router;
