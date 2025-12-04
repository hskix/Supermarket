const Order = require('../models/Order');

// Get all orders for user
exports.getOrderHistory = (req, res) => {
    const userId = req.session.user.id;
    console.log('Fetching orders for user:', userId);

    Order.getUserOrders(userId, (error, orders) => {
        if (error) {
            console.error('Error fetching orders:', error);
            return res.status(500).send('Error fetching orders: ' + error.message);
        }
        console.log('Orders retrieved:', orders);
        res.render('order-history', { orders: orders, user: req.session.user });
    });
};

// Get order details
exports.getOrderDetails = (req, res) => {
    const userId = req.session.user.id;
    const orderId = req.params.id;

    Order.getOrder(orderId, userId, (error, orderResults) => {
        if (error || !orderResults || orderResults.length === 0) {
            return res.status(404).send('Order not found');
        }

        Order.getOrderDetails(orderId, userId, (error, items) => {
            if (error) {
                return res.status(500).send('Error fetching order details');
            }
            res.render('order-details', { order: orderResults[0], items: items, user: req.session.user });
        });
    });
};
