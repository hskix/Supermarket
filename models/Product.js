const db = require('../db');

// Product model
const Product = {
    // Get all products
    getAll: (callback) => {
        db.query('SELECT * FROM products', callback);
    },

    // Get product by ID
    getById: (id, callback) => {
        db.query('SELECT * FROM products WHERE id = ?', [id], callback);
    },

    // Create a new product
    create: (productData, callback) => {
        const sql = 'INSERT INTO products (productName, quantity, price, image) VALUES (?, ?, ?, ?)';
        db.query(sql, [productData.productName, productData.quantity, productData.price, productData.image], callback);
    },

    // Update product
    update: (id, productData, callback) => {
        const sql = 'UPDATE products SET productName = ?, quantity = ?, price = ?, image = ? WHERE id = ?';
        db.query(sql, [productData.productName, productData.quantity, productData.price, productData.image, id], callback);
    },

    // Delete product
    delete: (id, callback) => {
        db.query('DELETE FROM products WHERE id = ?', [id], callback);
    },

    // Search products by name
    search: (searchTerm, callback) => {
        const sql = 'SELECT * FROM products WHERE productName LIKE ?';
        db.query(sql, [`%${searchTerm}%`], callback);
    },

    // Get products with low quantity
    getLowStock: (threshold, callback) => {
        db.query('SELECT * FROM products WHERE quantity <= ?', [threshold], callback);
    }
};

module.exports = Product;
