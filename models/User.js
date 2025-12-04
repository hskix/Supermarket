const db = require('../db');

// User model
const User = {
    // Get all users
    getAll: (callback) => {
        db.query('SELECT * FROM users', callback);
    },

    // Get user by ID
    getById: (id, callback) => {
        db.query('SELECT * FROM users WHERE id = ?', [id], callback);
    },

    // Get user by email
    getByEmail: (email, callback) => {
        db.query('SELECT * FROM users WHERE email = ?', [email], callback);
    },

    // Create a new user (register)
    create: (userData, callback) => {
        const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
        db.query(sql, [userData.username, userData.email, userData.password, userData.address, userData.contact, userData.role], callback);
    },

    // Verify user login
    verifyLogin: (email, password, callback) => {
        const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
        db.query(sql, [email, password], callback);
    },

    // Update user
    update: (id, userData, callback) => {
        const sql = 'UPDATE users SET username = ?, email = ?, address = ?, contact = ?, role = ? WHERE id = ?';
        db.query(sql, [userData.username, userData.email, userData.address, userData.contact, userData.role, id], callback);
    },

    // Delete user
    delete: (id, callback) => {
        db.query('DELETE FROM users WHERE id = ?', [id], callback);
    },

    // Get users by role
    getByRole: (role, callback) => {
        db.query('SELECT * FROM users WHERE role = ?', [role], callback);
    }
};

module.exports = User;
