const db = require('../db');
const Product = require('../models/Product');

// Get all products for shopping page
exports.getAllProducts = (req, res, next) => {
    Product.getAll((error, results) => {
        if (error) {
            console.error('Error fetching products:', error);
            return res.status(500).send('Error fetching products');
        }
        res.render('shopping', { user: req.session.user, products: results });
    });
};

// Get product by ID
exports.getProductById = (req, res, next) => {
    const productId = req.params.id;
    Product.getById(productId, (error, results) => {
        if (error) {
            console.error('Error fetching product:', error);
            return res.status(500).send('Error fetching product');
        }
        if (results.length > 0) {
            res.render('product', { product: results[0], user: req.session.user });
        } else {
            res.status(404).send('Product not found');
        }
    });
};

// Render add product page
exports.renderAddProduct = (req, res) => {
    res.render('addProduct', { user: req.session.user });
};

// Add product
exports.addProduct = (req, res, next) => {
    const { name, quantity, price } = req.body;
    let image = null;
    if (req.file) {
        image = req.file.filename;
    }

    const productData = {
        productName: name,
        quantity: quantity,
        price: price,
        image: image
    };

    Product.create(productData, (error, results) => {
        if (error) {
            console.error('Error adding product:', error);
            return res.status(500).send('Error adding product');
        }
        res.redirect('/inventory');
    });
};

// Render update product page
exports.renderUpdateProduct = (req, res, next) => {
    const productId = req.params.id;

    Product.getById(productId, (error, results) => {
        if (error) {
            console.error('Error fetching product:', error);
            return res.status(500).send('Error fetching product');
        }

        if (results.length > 0) {
            res.render('updateProduct', { product: results[0] });
        } else {
            res.status(404).send('Product not found');
        }
    });
};

// Update product
exports.updateProduct = (req, res, next) => {
    const productId = req.params.id;
    const { name, quantity, price } = req.body;
    let image = req.body.currentImage;
    if (req.file) {
        image = req.file.filename;
    }

    const productData = {
        productName: name,
        quantity: quantity,
        price: price,
        image: image
    };

    Product.update(productId, productData, (error, results) => {
        if (error) {
            console.error('Error updating product:', error);
            return res.status(500).send('Error updating product');
        }
        res.redirect('/inventory');
    });
};

// Delete product
exports.deleteProduct = (req, res, next) => {
    const productId = req.params.id;
    Product.delete(productId, (error, results) => {
        if (error) {
            console.error('Error deleting product:', error);
            return res.status(500).send('Error deleting product');
        }
        res.redirect('/inventory');
    });
};

// Get all inventory (admin)
exports.getInventory = (req, res, next) => {
    Product.getAll((error, results) => {
        if (error) {
            console.error('Error fetching inventory:', error);
            return res.status(500).send('Error fetching inventory');
        }
        res.render('inventory', { products: results, user: req.session.user });
    });
};

// Add product to cart
exports.addToCart = (req, res) => {
    const productId = parseInt(req.params.id);
    const quantity = parseInt(req.body.quantity) || 1;

    Product.getById(productId, (error, results) => {
        if (error) {
            console.error('Error fetching product:', error);
            return res.status(500).send('Error fetching product');
        }

        if (results.length > 0) {
            const product = results[0];

            // Initialize cart in session if not exists
            if (!req.session.cart) {
                req.session.cart = [];
            }

            // Check if product already in cart
            const existingItem = req.session.cart.find(item => item.productId === productId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                req.session.cart.push({
                    id: product.id,
                    productName: product.productName,
                    price: product.price,
                    quantity: quantity,
                    image: product.image
                });
            }

            res.redirect('/cart');
        } else {
            res.status(404).send("Product not found");
        }
    });
};

// Get cart
exports.getCart = (req, res) => {
    const cart = req.session.cart || [];
    res.render('cart', { cart, user: req.session.user });
};

// Remove item from cart
exports.removeFromCart = (req, res) => {
    const productId = parseInt(req.params.id);

    if (req.session.cart) {
        req.session.cart = req.session.cart.filter(item => item.id !== productId);
    }

    res.redirect('/cart');
};
