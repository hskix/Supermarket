const Product = require('../models/Product');
const Cart = require('../models/Cart');
    
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

        // Use a DB transaction to ensure atomic checkout (lock rows and update stock)
        db.beginTransaction((txErr) => {
            if (txErr) {
                console.error('Error starting transaction:', txErr);
                return res.status(500).send('Error during checkout');
            }

            // Helper to rollback and respond
            const rollbackAndRespond = (errMsg, redirectToCart = false) => {
                return db.rollback(() => {
                    if (redirectToCart) {
                        req.flash('error', errMsg);
                        return res.redirect('/cart');
                    }
                    return res.status(500).send(errMsg);
                });
            };

            // Lock and verify stock for each product using SELECT ... FOR UPDATE
            let checked = 0;
            for (const item of cartItems) {
                db.query('SELECT quantity FROM products WHERE id = ? FOR UPDATE', [item.product_id], (err, rows) => {
                    checked++;
                    if (err) {
                        console.error('Error checking stock during checkout:', err);
                        return rollbackAndRespond('Error during checkout');
                    }
                    const available = (rows && rows[0]) ? rows[0].quantity : 0;
                    if (available < item.quantity) {
                        return rollbackAndRespond(`Not enough stock for ${item.productName}. Available: ${available}`, true);
                    }

                    // when all checks complete, proceed
                    if (checked === cartItems.length) {
                        // Calculate total
                        const total = cartItems.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);

                        // Create order
                        Order.create(userId, total, (orderErr, orderResult) => {
                            if (orderErr) {
                                console.error('Error creating order:', orderErr);
                                return rollbackAndRespond('Error during checkout');
                            }

                            const orderId = orderResult.insertId;
                            const orderItems = cartItems.map(it => ({
                                product_id: it.product_id,
                                product_name: it.productName,
                                quantity: it.quantity,
                                unit_price: it.unit_price
                            }));

                            // Add order items
                            Order.addItems(orderId, orderItems, (itemErr) => {
                                if (itemErr) {
                                    console.error('Error adding items to order:', itemErr);
                                    return rollbackAndRespond('Error during checkout');
                                }

                                // Decrease stock for each product
                                let updated = 0;
                                for (const it of cartItems) {
                                    db.query('UPDATE products SET quantity = quantity - ? WHERE id = ?', [it.quantity, it.product_id], (uErr) => {
                                        if (uErr) {
                                            console.error('Error updating product quantity:', uErr);
                                            return rollbackAndRespond('Error during checkout');
                                        }

                                        updated++;
                                        if (updated === cartItems.length) {
                                            // Clear cart
                                            Cart.clearCart(userId, (clearErr) => {
                                                if (clearErr) {
                                                    console.error('Error clearing cart:', clearErr);
                                                    return rollbackAndRespond('Error clearing cart');
                                                }

                                                // Commit transaction
                                                db.commit((commitErr) => {
                                                    if (commitErr) {
                                                        console.error('Error committing transaction:', commitErr);
                                                        return rollbackAndRespond('Error finalizing checkout');
                                                    }

                                                    // Render success page
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
                                        }
                                    });
                                }
                            });
                        });
                    }
                });
            }
        });
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

        // Verify stock for each cart item before proceeding
        let stockChecks = 0;
        for (const item of cartItems) {
            db.query('SELECT quantity FROM products WHERE id = ?', [item.product_id], (err, rows) => {
                stockChecks++;
                if (err) {
                    console.error('Error checking stock during checkout:', err);
                    return res.status(500).send('Error during checkout');
                }
                const available = (rows && rows[0]) ? rows[0].quantity : 0;
                if (available < item.quantity) {
                    req.flash('error', `Not enough stock for ${item.productName}. Available: ${available}`);
                    return res.redirect('/cart');
                }
                // continue when all checked
                if (stockChecks === cartItems.length) {
                    proceedWithOrder();
                }
            });
        }

        function proceedWithOrder() {
        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

        // Step 2: Create order
        Order.create(userId, total, (orderErr, orderResult) => {
            if (orderErr) {
                console.error('Error creating order:', orderErr);
                return res.status(500).send('Error during checkout');
            }

            const orderId = orderResult.insertId;
            const orderItems = cartItems.map(item => ({
                product_id: item.product_id,
                product_name: item.productName,
                quantity: item.quantity,
                unit_price: item.unit_price
            }));

            // Step 3: Add items to order
            Order.addItems(orderId, orderItems, (itemErr) => {
                if (itemErr) {
                    console.error('Error adding items to order:', itemErr);
                    return res.status(500).send('Error during checkout');
                }

                // Step 4: Decrease stock for each product
                let completed = 0;
                cartItems.forEach((item) => {
                    const sql = 'UPDATE products SET quantity = quantity - ? WHERE id = ?';
                    db.query(sql, [item.quantity, item.product_id], (err) => {
                        if (err) {
                            console.error('Error updating product quantity:', err);
                            return res.status(500).send('Error during checkout');
                        }

                        completed++;

                        // Step 5: Once all products updated, clear cart
                        if (completed === cartItems.length) {
                            Cart.clearCart(userId, (clearErr) => {
                                if (clearErr) {
                                    console.error('Error clearing cart:', clearErr);
                                    return res.status(500).send('Error clearing cart');
                                }
                                // Pass invoice data to checkout-success view
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
                        }
                    });
                });
            });
        });
    });
};

