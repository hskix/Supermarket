const http = require('http');
const querystring = require('querystring');
const db = require('../db');
const BASE = { hostname: 'localhost', port: 3000 };

function request(path, method='GET', headers={}, body=null){
  return new Promise((resolve) => {
    const opts = Object.assign({}, BASE, { path, method, headers });
    const req = http.request(opts, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const b = Buffer.concat(chunks).toString('utf8');
        resolve({ statusCode: res.statusCode, headers: res.headers, body: b });
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  console.log('Starting stock flow test');
  // create product directly in DB
  const productData = { name: 'E2E Test Product', quantity: 5, price: 9.99, image: 'test.png' };
  const insertSql = 'INSERT INTO products (productName, quantity, price, image) VALUES (?, ?, ?, ?)';
  const [insertResult] = await new Promise((res, rej) => db.query(insertSql, [productData.name, productData.quantity, productData.price, productData.image], (err, r) => err ? rej(err) : res([r])) );
  const productId = insertResult.insertId;
  console.log('Inserted product id', productId, 'stock', productData.quantity);

  const ts = Date.now();
  const username = `stock_user_${ts}`;
  const email = `stock_${ts}@example.com`;
  const password = 'StockPass123!';
  const regForm = querystring.stringify({ username, email, password, address: '1 Test St', contact: '000', role: 'user' });

  // register
  const reg = await request('/register', 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(regForm) }, regForm);
  console.log('register status', reg.statusCode);

  // login
  const loginForm = querystring.stringify({ email, password });
  const loginRes = await request('/login', 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(loginForm) }, loginForm);
  console.log('login status', loginRes.statusCode);
  const setCookie = loginRes.headers['set-cookie'];
  const cookieHeader = setCookie ? setCookie.map(c=>c.split(';')[0]).join('; ') : '';

  // attempt to add more than stock
  const overQty = productData.quantity + 2;
  console.log('Attempting to add over-quantity', overQty);
  const overForm = querystring.stringify({ quantity: overQty });
  const addRes = await request(`/add-to-cart/${productId}`, 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(overForm), 'Cookie': cookieHeader }, overForm);
  console.log('add over status', addRes.statusCode, 'redirect->', addRes.headers && addRes.headers.location);

  // find user id in DB
  const [userRows] = await new Promise((res, rej) => db.query('SELECT id FROM users WHERE email = ?', [email], (err, r) => err ? rej(err) : res([r])));
  const userId = userRows[0].id;
  console.log('User id', userId);

  // check cart items in DB
  const [cartRows] = await new Promise((res, rej) => db.query('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId], (err, r) => err ? rej(err) : res([r])));
  console.log('cart items after over-add (should be none):', cartRows.length);

  // now add valid quantity 2
  const validForm = querystring.stringify({ quantity: 2 });
  const addOk = await request(`/add-to-cart/${productId}`, 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(validForm), 'Cookie': cookieHeader }, validForm);
  console.log('add valid status', addOk.statusCode);

  // perform checkout
  const checkout = await request('/checkout', 'POST', { 'Cookie': cookieHeader });
  console.log('checkout status', checkout.statusCode);

  // check product quantity in DB
  const [prodAfter] = await new Promise((res, rej) => db.query('SELECT quantity FROM products WHERE id = ?', [productId], (err, r) => err ? rej(err) : res([r])));
  console.log('product stock after checkout (expected', productData.quantity - 2, '):', prodAfter[0].quantity);

  // cleanup: remove product and any cart/orders
  await new Promise((res, rej) => db.query('DELETE FROM products WHERE id = ?', [productId], (err) => err ? rej(err) : res()));
  await new Promise((res, rej) => db.query('DELETE FROM users WHERE id = ?', [userId], (err) => err ? rej(err) : res()));
  await new Promise((res, rej) => db.query('DELETE FROM cart_items WHERE user_id = ?', [userId], (err) => err ? rej(err) : res()));

  console.log('Test complete, cleanup done.');
  process.exit(0);
})().catch(err => { console.error('Test error', err); process.exit(1); });
