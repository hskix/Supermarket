const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const db = require('./db');
const ProductController = require('./controllers/ProductController');
const UserController = require('./controllers/UserController');
const CartController = require('./controllers/CartController');
const OrderController = require('./controllers/OrderController');
const ChatController = require('./controllers/ChatController');
const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });

// Set up view engine
app.set('view engine', 'ejs');
//  enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded({
    extended: false
}));

// Parse JSON bodies for AJAX endpoints (chat)
app.use(express.json());

//TO DO: Insert code for Session Middleware below 
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    // Session expires after 1 week of inactivity
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } 
}));

app.use(flash());

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/shopping');
    }
};

// Middleware for form validation
const validateRegistration = (req, res, next) => {
    const { username, email, password, confirmPassword, address, contact, role } = req.body;

    if (!username || !email || !password || !confirmPassword || !address || !contact || !role) {
        req.flash('error', 'All fields are required.');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }

    if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }

    next();
};

// Define routes
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

app.get('/inventory', checkAuthenticated, checkAdmin, ProductController.getInventory);

app.get('/register', UserController.renderRegister);

app.post('/register', validateRegistration, UserController.register);

app.get('/login', UserController.renderLogin);

app.post('/login', UserController.login);

app.get('/shopping', checkAuthenticated, ProductController.getAllProducts);

app.post('/add-to-cart/:id', checkAuthenticated, CartController.addToCart);

app.get('/cart', checkAuthenticated, CartController.getCart);

app.get('/remove-from-cart/:id', checkAuthenticated, CartController.removeFromCart);

app.post('/update-quantity/:id', checkAuthenticated, CartController.updateQuantity);

app.get('/clear-cart', checkAuthenticated, CartController.clearCart);

app.get('/cart-total', checkAuthenticated, CartController.getCartTotal);

app.get('/logout', UserController.logout);

app.get('/product/:id', checkAuthenticated, ProductController.getProductById);

app.get('/addProduct', checkAuthenticated, checkAdmin, ProductController.renderAddProduct);

app.post('/addProduct', upload.single('image'), ProductController.addProduct);

app.get('/updateProduct/:id', checkAuthenticated, checkAdmin, ProductController.renderUpdateProduct);

app.post('/updateProduct/:id', upload.single('image'), ProductController.updateProduct);

app.get('/deleteProduct/:id', ProductController.deleteProduct);

app.post('/checkout', checkAuthenticated, CartController.checkout);

// AI Chat endpoint
app.post('/api/chat', checkAuthenticated, ChatController.chat);

app.get('/order-history', checkAuthenticated, OrderController.getOrderHistory);

app.get('/order-details/:id', checkAuthenticated, OrderController.getOrderDetails);

app.get('/users', checkAuthenticated, checkAdmin, UserController.getAllUsers);

app.get('/delete-user/:id', checkAuthenticated, checkAdmin, UserController.deleteUser);
app.get('/make-admin/:id', checkAuthenticated, checkAdmin, UserController.makeAdmin);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
