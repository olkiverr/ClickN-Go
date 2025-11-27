const express = require('express');
const router = express.Router();
const pool = require('../../db');

// GET /admin/users - Display all users
router.get('/', async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, email, role FROM users');
        res.render('admin/users', { users, selectedTag: 'admin' });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Error fetching users.');
    }
});

// GET /admin/users/edit/:id - Display form to edit a user
router.get('/edit/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, username, email, role FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).send('User not found.');
        }
        res.render('admin/edit-user', { user: rows[0], selectedTag: 'admin' });
    } catch (error) {
        console.error('Error fetching user for editing:', error);
        res.status(500).send('Error fetching user.');
    }
});

// POST /admin/users/edit/:id - Update a user's details
router.post('/edit/:id', async (req, res) => {
    const { username, email, role } = req.body;
    try {
        await pool.query(
            'UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?',
            [username, email, role, req.params.id]
        );
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Error updating user.');
    }
});

// POST /admin/users/delete/:id - Delete a user
router.post('/delete/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Error deleting user.');
    }
});

module.exports = router;
