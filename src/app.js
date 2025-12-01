const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const session = require('express-session');
const bcrypt = require('bcrypt');
const pool = require('./db');

// Routers
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');
const marketplaceRoutes = require('./routes/marketplace');
const chatRoutes = require('./routes/chat');
const ejsLayouts = require('express-ejs-layouts');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

// View Engine Setup
app.set('view engine', 'ejs');
app.use(ejsLayouts);

app.set('views', path.join(__dirname, '..', 'views'));

// Middleware
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));
const sessionMiddleware = session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
});
app.use(sessionMiddleware);

// Share session with socket.io
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});


app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.currentPath = req.path; // Make current path available to templates
    next();
});

// Middleware to fetch site settings
app.use(async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM settings');
        res.locals.settings = rows.reduce((acc, row) => {
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, {});
        // Specifically for the banner, to be used in the header partial
        res.locals.promo_banner_text = res.locals.settings.promo_banner_text;
        res.locals.promo_banner_active = res.locals.settings.promo_banner_active === 'true';
    } catch (error) {
        console.error('Error fetching settings for middleware:', error);
        // Even if settings fail, continue rendering the site
        res.locals.settings = {};
        res.locals.promo_banner_active = false;
    }
    next();
});

// --- Custom Middleware ---
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).send('Access Denied: Admins only.');
    }
    next();
};

const checkForceChange = (req, res, next) => {
    if (req.session.mustChangePassword && req.path !== '/force-change') {
        return res.redirect('/force-change');
    }
    next();
};

// --- Routes ---

// Unprotected routes
app.get('/tos', (req, res) => {
    res.render('tos', { selectedTag: '' });
});

app.get('/', checkForceChange, async (req, res) => {
    try {
        const [products] = await pool.query('SELECT * FROM products');
        res.render('index', { products, selectedTag: '' });
    } catch (error) {
        console.error('Error fetching products for homepage:', error);
        res.status(500).send('Error fetching products.');
    }
});

app.get('/login', (req, res) => {
    const errorMessage = req.session.error;
    delete req.session.error; // Clear the error after displaying
    res.render('login', { errorMessage, selectedTag: '' });
});

app.get('/register', (req, res) => {
    res.render('register', { selectedTag: '' });
});

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        res.redirect('/login');
    } catch (error) {
        console.error('Registration error:', error);
        req.session.error = 'Error registering user. The username or email may already be taken.';
        res.redirect('/register');
    }
});

app.post('/login', async (req, res) => {
    const { loginIdentifier, password } = req.body; // 'loginIdentifier' can be email or username
    try {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [loginIdentifier, loginIdentifier]
        );

        if (rows.length === 0) {
            req.session.error = 'Invalid email/username or password.';
            return res.redirect('/login');
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.email = user.email;
            req.session.role = user.role;
            req.session.mustChangePassword = user.must_change_password;
            res.redirect('/');
        } else {
            req.session.error = 'Invalid email/username or password.';
            res.redirect('/login');
        }
    } catch (error) {
        console.error('Login error:', error);
        req.session.error = 'An error occurred during login.';
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out.');
        }
        res.redirect('/');
    });
});

// Routes for forced credential change
app.get('/force-change', requireLogin, (req, res) => {
    if (!req.session.mustChangePassword) {
        return res.redirect('/');
    }
    res.render('force-change', { selectedTag: '' });
});

app.post('/force-change', requireLogin, async (req, res) => {
    const { username, email, password } = req.body;
    const userId = req.session.userId;

    if (!req.session.mustChangePassword) {
        return res.redirect('/');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'UPDATE users SET username = ?, email = ?, password = ?, must_change_password = FALSE WHERE id = ?',
            [username, email, hashedPassword, userId]
        );

        // Update session
        req.session.mustChangePassword = false;
        req.session.username = username;
        req.session.email = email;

        res.redirect('/');
    } catch (error) {
        console.error('Error updating credentials:', error);
        res.status(500).send('Error updating credentials. The username or email may already be taken.');
    }
});


// Protected routes that require login and password change check
app.use(requireLogin, checkForceChange);

app.use('/products', productRoutes);
app.use('/cart', requireLogin, cartRoutes);
app.use('/marketplace', marketplaceRoutes);
app.use('/chat', chatRoutes);


// Admin routes
app.use('/admin', requireLogin, requireAdmin, checkForceChange, adminRoutes);

app.get('/account', requireLogin, (req, res) => { // Protect account route
    res.render('account', { selectedTag: '' });
});

app.get('/account/orders', requireLogin, async (req, res) => {
    try {
        const [orders] = await pool.query(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
            [req.session.userId]
        );
        res.render('account/orders', { orders, selectedTag: '' });
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).send('Error fetching orders.');
    }
});

// GET route to show the edit account form
app.get('/account/edit', requireLogin, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT username, email FROM users WHERE id = ?', [req.session.userId]);
        if (rows.length === 0) {
            return res.status(404).send('User not found.');
        }
        res.render('account/edit', { user: rows[0], errorMessage: '', selectedTag: '' });
    } catch (error) {
        console.error('Error fetching user for edit:', error);
        res.status(500).send('Error loading edit page.');
    }
});

// POST route to update user account information
app.post('/account/edit', requireLogin, async (req, res) => {
    const { username, email, password, new_password } = req.body;
    const userId = req.session.userId;

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        const user = rows[0];

        // Verify current password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.render('account/edit', { user, errorMessage: 'Incorrect current password.', selectedTag: '' });
        }

        let updateQuery = 'UPDATE users SET username = ?, email = ?';
        const queryParams = [username, email];

        // If a new password is provided, hash it and add it to the query
        if (new_password) {
            const hashedPassword = await bcrypt.hash(new_password, 10);
            updateQuery += ', password = ?';
            queryParams.push(hashedPassword);
        }

        updateQuery += ' WHERE id = ?';
        queryParams.push(userId);

        await pool.query(updateQuery, queryParams);

        // Update session
        req.session.username = username;
        req.session.email = email;

        res.redirect('/account');

    } catch (error) {
        console.error('Error updating account:', error);
        // Handle potential duplicate username/email
        if (error.code === 'ER_DUP_ENTRY') {
            return res.render('account/edit', { user: { username, email }, errorMessage: 'Username or email already taken.', selectedTag: '' });
        }
        res.status(500).send('Error updating account.');
    }
});


// GET route to show the edit account form
app.get('/account/edit', requireLogin, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT username, email FROM users WHERE id = ?', [req.session.userId]);
        if (rows.length === 0) {
            return res.status(404).send('User not found.');
        }
        res.render('account/edit', { user: rows[0], errorMessage: '', selectedTag: '' });
    } catch (error) {
        console.error('Error fetching user for edit:', error);
        res.status(500).send('Error loading edit page.');
    }
});

// POST route to update user account information
app.post('/account/edit', requireLogin, async (req, res) => {
    const { username, email, password, new_password } = req.body;
    const userId = req.session.userId;

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        const user = rows[0];

        // Verify current password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.render('account/edit', { user, errorMessage: 'Incorrect current password.', selectedTag: '' });
        }

        let updateQuery = 'UPDATE users SET username = ?, email = ?';
        const queryParams = [username, email];

        // If a new password is provided, hash it and add it to the query
        if (new_password) {
            const hashedPassword = await bcrypt.hash(new_password, 10);
            updateQuery += ', password = ?';
            queryParams.push(hashedPassword);
        }

        updateQuery += ' WHERE id = ?';
        queryParams.push(userId);

        await pool.query(updateQuery, queryParams);

        // Update session
        req.session.username = username;
        req.session.email = email;

        res.redirect('/account');

    } catch (error) {
        console.error('Error updating account:', error);
        // Handle potential duplicate username/email
        if (error.code === 'ER_DUP_ENTRY') {
            return res.render('account/edit', { user: { username, email }, errorMessage: 'Username or email already taken.', selectedTag: '' });
        }
        res.status(500).send('Error updating account.');
    }
});


// Socket.IO logic
io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join_chat', (itemId) => {
        socket.join(itemId);
        console.log(`User joined chat for item: ${itemId}`);
    });

    socket.on('send_message', async (data) => {
        const { itemId, message } = data;
        const session = socket.request.session;
        const senderId = session.userId;
        const senderUsername = session.username;


        if (!senderId) {
            // Handle case where user is not logged in
            return;
        }

        try {
            // Save message to the database
            await pool.query(
                'INSERT INTO chat_messages (item_id, sender_id, message) VALUES (?, ?, ?)',
                [itemId, senderId, message]
            );

            // Broadcast the message to everyone in the item's chat room
            io.to(itemId).emit('receive_message', {
                message: message,
                sender_id: senderId,
                username: senderUsername
            });
        } catch (error) {
            console.error('Error saving or broadcasting chat message:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});


server.listen(port, () => {
    console.log(`ClickN'Go server listening at http://localhost:${port}`);
});
