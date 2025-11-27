const express = require('express');
const router = express.Router();
const pool = require('../db'); // Assuming your database connection pool is here

// GET /chat/:itemId - Renders the chat interface for a specific item
router.get('/:itemId', async (req, res) => {
    const { itemId } = req.params;
    const userId = req.session.userId;

    if (!userId) {
        return res.redirect('/login');
    }

    try {
        // Fetch item details to display in the chat
        const [itemRows] = await pool.query('SELECT * FROM marketplace_items WHERE id = ?', [itemId]);
        if (itemRows.length === 0) {
            return res.status(404).send('Item not found.');
        }
        const item = itemRows[0];

        // Fetch existing chat messages for this item
        const [messageRows] = await pool.query(
            `SELECT cm.*, u.username 
             FROM chat_messages cm
             JOIN users u ON cm.sender_id = u.id
             WHERE cm.item_id = ? 
             ORDER BY cm.created_at ASC`,
            [itemId]
        );

        // Render the chat view
        res.render('chat', {
            item: item,
            messages: messageRows,
            userId: userId,
            selectedTag: 'marketplace' // To highlight the correct nav item
        });

    } catch (error) {
        console.error('Error fetching chat data:', error);
        res.status(500).send('Error loading chat.');
    }
});

module.exports = router;
