const db = require('../db');

const Order = {
    // Create a new order
    create: (userId, total, callback) => {
        const sql = 'INSERT INTO orders (user_id, total) VALUES (?, ?)';
        db.query(sql, [userId, total], callback);
    },

    // Add items to order
    addItems: (orderId, items, callback) => {
        if (!items || items.length === 0) return callback(null, { affectedRows: 0 });
        
        const values = items.map(item => [
            orderId,
            item.product_id,
            item.product_name,
            item.quantity,
            item.unit_price
        ]);
        
        const sql = 'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES ?';
        db.query(sql, [values], callback);
    },

    // Get all orders for a user
    getUserOrders: (userId, callback) => {
        const sql = `SELECT o.id, o.total, o.created_at, COUNT(oi.id) as item_count
                     FROM orders o
                     LEFT JOIN order_items oi ON o.id = oi.order_id
                     WHERE o.user_id = ?
                     GROUP BY o.id
                     ORDER BY o.created_at DESC`;
        db.query(sql, [userId], callback);
    },

    // Get order details with items
    getOrderDetails: (orderId, userId, callback) => {
        const sql = `SELECT oi.* FROM order_items oi
                     JOIN orders o ON oi.order_id = o.id
                     WHERE o.id = ? AND o.user_id = ?`;
        db.query(sql, [orderId, userId], callback);
    },

    // Get single order info
    getOrder: (orderId, userId, callback) => {
        const sql = 'SELECT * FROM orders WHERE id = ? AND user_id = ?';
        db.query(sql, [orderId, userId], callback);
    }
};

module.exports = Order;
