const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const db = require('../db');

// Get cart
exports.getCart = (req, res) => {
    const userId = req.session.user.id;
    Cart.getCart(userId, (error, results) => {
        if (error) {
            console.error('Error fetching cart:', error);
            return res.status(500).send('Error fetching cart');
        }
        res.render('cart', { cart: results, user: req.session.user });
    });
};

// Add product to cart
exports.addToCart = (req, res) => {
    const userId = req.session.user.id;
    const productId = parseInt(req.params.id);
    const quantity = parseInt(req.body.quantity) || 1;

    Product.getById(productId, (error, results) => {
        if (error) {
            console.error('Error fetching product:', error);
            return res.status(500).send('Error fetching product');
        }

        if (results.length > 0) {
            const product = results[0];

            // Check existing quantity in cart for this user/product
            const sql = 'SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?';
            db.query(sql, [userId, productId], (checkErr, checkRes) => {
                if (checkErr) {
                    console.error('Error checking cart quantity:', checkErr);
                    return res.status(500).send('Error adding to cart');
                }

                const existingQty = (checkRes && checkRes.length > 0) ? Number(checkRes[0].quantity) : 0;
                const newQty = existingQty + quantity;

                // Check if stock is available for the total quantity
                if (product.quantity < newQty) {
                    req.flash('error', `Not enough stock! Only ${product.quantity} item(s) available. You already have ${existingQty} in your cart.`);
                    return res.redirect('/shopping');
                }

                Cart.addItem(userId, productId, quantity, product.price, (err, result) => {
                    if (err) {
                        console.error('Error adding to cart:', err);
                        return res.status(500).send('Error adding to cart');
                    }
                    req.flash('success', `${product.productName} added to cart!`);
                    res.redirect('/cart');
                });
            });
        } else {
            res.status(404).send("Product not found");
        }
    });
};

// Remove item from cart
exports.removeFromCart = (req, res) => {
    const userId = req.session.user.id;
    const productId = parseInt(req.params.id);

    Cart.removeItem(userId, productId, (error, results) => {
        if (error) {
            console.error('Error removing from cart:', error);
            return res.status(500).send('Error removing from cart');
        }
        res.redirect('/cart');
    });
};

// Update cart item quantity
exports.updateQuantity = (req, res) => {
    const userId = req.session.user.id;
    const productId = parseInt(req.params.id);
    const quantity = parseInt(req.body.quantity);

    // First check if product has enough stock
    Product.getById(productId, (error, results) => {
        if (error) {
            console.error('Error fetching product:', error);
            return res.status(500).send('Error fetching product');
        }

        if (results.length > 0) {
            const product = results[0];
            
            // Check if stock is available for the new quantity
            if (product.quantity < quantity) {
                req.flash('error', `Not enough stock! Only ${product.quantity} item(s) available.`);
                return res.redirect('/cart');
            }

            Cart.updateQuantity(userId, productId, quantity, (error, results) => {
                if (error) {
                    console.error('Error updating quantity:', error);
                    return res.status(500).send('Error updating quantity');
                }
                res.redirect('/cart');
            });
        } else {
            res.status(404).send("Product not found");
        }
    });
};

// Clear entire cart
exports.clearCart = (req, res) => {
    const userId = req.session.user.id;
    Cart.clearCart(userId, (error, results) => {
        if (error) {
            console.error('Error clearing cart:', error);
            return res.status(500).send('Error clearing cart');
        }
        res.redirect('/cart');
    });
};

// Get cart total
exports.getCartTotal = (req, res) => {
    const userId = req.session.user.id;
    Cart.getCartTotal(userId, (error, results) => {
        if (error) {
            console.error('Error getting cart total:', error);
            return res.status(500).send('Error getting cart total');
        }
        const total = results[0].total || 0;
        res.json({ total: total.toFixed(2) });
    });
}; 


// Checkout - decrease stock and clear cart
exports.checkout = (req, res) => {
    const userId = req.session.user.id;

    // Step 1: Get all cart items
    Cart.getCart(userId, (error, cartItems) => {
        if (error) {
            console.error('Error fetching cart:', error);
            return res.status(500).send('Error during checkout');
        }

        if (!cartItems || cartItems.length === 0) {
            return res.render('checkout-success', { 
                message: 'Cart was empty',
                orderId: null,
                cartItems: [],
                total: 0,
                user: req.session.user
            });
        }

        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

        // Use DB transaction to ensure atomic checkout and avoid race conditions
        db.beginTransaction((txErr) => {
            if (txErr) {
                console.error('Transaction begin error:', txErr);
                return res.status(500).send('Error during checkout');
            }

            // Insert order
            const insertOrderSql = 'INSERT INTO orders (user_id, total) VALUES (?, ?)';
            db.query(insertOrderSql, [userId, total], (orderErr, orderResult) => {
                if (orderErr) {
                    console.error('Error creating order:', orderErr);
                    return db.rollback(() => res.status(500).send('Error during checkout'));
                }

                const orderId = orderResult.insertId;

                // Prepare order_items bulk insert
                const values = cartItems.map(item => [orderId, item.product_id, item.productName, item.quantity, item.unit_price]);
                const insertItemsSql = 'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES ?';
                db.query(insertItemsSql, [values], (itemsErr) => {
                    if (itemsErr) {
                        console.error('Error inserting order items:', itemsErr);
                        return db.rollback(() => res.status(500).send('Error during checkout'));
                    }

                    // For each cart item, decrement stock only if enough stock remains
                    const updateStockForItem = (item, cb) => {
                        const sql = 'UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?';
                        db.query(sql, [item.quantity, item.product_id, item.quantity], (uErr, uRes) => {
                            if (uErr) return cb(uErr);
                            if (uRes.affectedRows === 0) return cb(new Error('Insufficient stock for product: ' + item.product_id));
                            cb(null);
                        });
                    };

                    // Process stock updates sequentially to simplify error handling
                    (function processNext(i) {
                        if (i >= cartItems.length) {
                            // Clear cart
                            const clearSql = 'DELETE FROM cart_items WHERE user_id = ?';
                            db.query(clearSql, [userId], (clearErr) => {
                                if (clearErr) {
                                    console.error('Error clearing cart:', clearErr);
                                    return db.rollback(() => res.status(500).send('Error during checkout'));
                                }

                                // Commit transaction
                                db.commit((commitErr) => {
                                    if (commitErr) {
                                        console.error('Commit error:', commitErr);
                                        return db.rollback(() => res.status(500).send('Error during checkout'));
                                    }

                                    // Success — render checkout success
                                    res.render('checkout-success', {
                                        message: 'Checkout successful!',
                                        orderId: orderId,
                                        cartItems: cartItems,
                                        total: total.toFixed(2),
                                        user: req.session.user,
                                        orderDate: new Date().toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                    });
                                });
                            });
                            return;
                        }

                        const item = cartItems[i];
                        updateStockForItem(item, (stockErr) => {
                            if (stockErr) {
                                console.error('Stock update error:', stockErr);
                                return db.rollback(() => {
                                    req.flash('error', 'Checkout failed: insufficient stock for one or more items.');
                                    return res.redirect('/cart');
                                });
                            }
                            processNext(i + 1);
                        });
                    })(0);
                });
            });
        });
    });
};

