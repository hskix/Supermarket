const db = require('../db');

const Cart = {
    // Add item to cart
    addItem: (userId, productId, quantity, unitPrice, callback) => {
        const sql = 'INSERT INTO cart_items (user_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?';
        db.query(sql, [userId, productId, quantity, unitPrice, quantity], callback);
    },

    // Get user's cart items
    getCart: (userId, callback) => {
        const sql = `SELECT ci.id, ci.product_id, ci.quantity, ci.unit_price, p.productName, p.image 
                     FROM cart_items ci 
                     JOIN products p ON ci.product_id = p.id 
                     WHERE ci.user_id = ?`;
        db.query(sql, [userId], callback);
    },

    // Remove item from cart
    removeItem: (userId, productId, callback) => {
        const sql = 'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?';
        db.query(sql, [userId, productId], callback);
    },

    // Update item quantity
    updateQuantity: (userId, productId, quantity, callback) => {
        if (quantity <= 0) {
            return Cart.removeItem(userId, productId, callback);
        }
        const sql = 'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?';
        db.query(sql, [quantity, userId, productId], callback);
    },

    // Clear entire cart for user
    clearCart: (userId, callback) => {
        const sql = 'DELETE FROM cart_items WHERE user_id = ?';
        db.query(sql, [userId], callback);
    },

    // Get cart total
    getCartTotal: (userId, callback) => {
        const sql = 'SELECT SUM(quantity * unit_price) as total FROM cart_items WHERE user_id = ?';
        db.query(sql, [userId], callback);
    }
};

module.exports = Cart;
