const express = require('express');
const router = express.Router();
const pool = require('../../db');

// GET /admin/products - Display all products
router.get('/', async (req, res) => {
    try {
        const [products] = await pool.query('SELECT * FROM products');
        res.render('admin/products', { products, selectedTag: 'admin' });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Error fetching products.');
    }
});

// GET /admin/products/create - Display form to create a new product
router.get('/create', (req, res) => {
    res.render('admin/create-product', { selectedTag: 'admin' });
});

// POST /admin/products - Create a new product
router.post('/', async (req, res) => {
    const { name, description, price, image_url, stock } = req.body;
    try {
        await pool.query(
            'INSERT INTO products (name, description, price, image_url, stock) VALUES (?, ?, ?, ?, ?)',
            [name, description, price, image_url, stock]
        );
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).send('Error creating product.');
    }
});

// GET /admin/products/edit/:id - Display form to edit a product
router.get('/edit/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).send('Product not found.');
        }
        res.render('admin/edit-product', { product: rows[0], selectedTag: 'admin' });
    } catch (error) {
        console.error('Error fetching product for editing:', error);
        res.status(500).send('Error fetching product.');
    }
});

// POST /admin/products/edit/:id - Update a product's details
router.post('/edit/:id', async (req, res) => {
    const { name, description, price, image_url, stock } = req.body;
    try {
        await pool.query(
            'UPDATE products SET name = ?, description = ?, price = ?, image_url = ?, stock = ? WHERE id = ?',
            [name, description, price, image_url, stock, req.params.id]
        );
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).send('Error updating product.');
    }
});

// POST /admin/products/delete/:id - Delete a product
router.post('/delete/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).send('Error deleting product.');
    }
});

module.exports = router;
