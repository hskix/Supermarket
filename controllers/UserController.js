const db = require('../db');
const User = require('../models/User');

// Render register page
exports.renderRegister = (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
};

// Handle user registration
exports.register = (req, res) => {
    const { username, email, password, address, contact, role } = req.body;

    const userData = {
        username: username,
        email: email,
        password: password,
        address: address,
        contact: contact,
        role: role
    };

    User.create(userData, (err, result) => {
        if (err) {
            console.error('Registration error:', err);
            req.flash('error', 'Registration failed. Please try again.');
            return res.redirect('/register');
        }
        console.log('User registered:', result);
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
};

// Render login page
exports.renderLogin = (req, res) => {
    res.render('login', { messages: req.flash('success'), errors: req.flash('error') });
};

// Handle user login
exports.login = (req, res) => {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    User.verifyLogin(email, password, (err, results) => {
        if (err) {
            console.error('Login error:', err);
            req.flash('error', 'Login failed. Please try again.');
            return res.redirect('/login');
        }

        if (results.length > 0) {
            // Successful login
            req.session.user = results[0];
            req.flash('success', 'Login successful!');
            if (req.session.user.role === 'user') {
                res.redirect('/shopping');
            } else {
                res.redirect('/inventory');
            }
        } else {
            // Invalid credentials
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
};

// Handle user logout
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
};

// Get all users (admin)
exports.getAllUsers = (req, res) => {
    User.getAll((error, users) => {
        if (error) {
            console.error('Error fetching users:', error);
            return res.status(500).send('Error fetching users');
        }
        console.log('All users fetched:', users);
        res.render('users', { users: users, user: req.session.user });
    });
};

// Delete user (admin)
exports.deleteUser = (req, res) => {
    const userId = req.params.id;
    
    // First check if the user exists and their role
    User.getById(userId, (error, results) => {
        if (error) {
            console.error('Error fetching user:', error);
            return res.status(500).send('Error deleting user');
        }
        
        if (results.length === 0) {
            req.flash('error', 'User not found');
            return res.redirect('/users');
        }
        
        const userToDelete = results[0];
        
        // Prevent deleting admins
        if (userToDelete.role === 'admin') {
            req.flash('error', 'Cannot delete admin users');
            return res.redirect('/users');
        }
        
        // Prevent deleting yourself
        if (userId == req.session.user.id) {
            req.flash('error', 'Cannot delete your own account');
            return res.redirect('/users');
        }
        
        User.delete(userId, (error, results) => {
            if (error) {
                console.error('Error deleting user:', error);
                return res.status(500).send('Error deleting user');
            }
            req.flash('success', 'User deleted successfully');
            res.redirect('/users');
        });
    });
};