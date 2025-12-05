const mysql = require('mysql2');
const http = require('http');
const querystring = require('querystring');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

function request(path, method='GET', headers={}, body=null){
  return new Promise((resolve) => {
    const opts = { hostname: 'localhost', port: 3000, path, method, headers };
    const req = http.request(opts, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  db.query('SELECT id, productName, quantity FROM products WHERE quantity > 0 LIMIT 1', async (err, rows) => {
    if (err) return console.error('DB query error', err);
    if (!rows || rows.length === 0) return console.log('No product with stock > 0 found.');
    const p = rows[0];
    console.log('Chosen product:', p);

    const ts = Date.now();
    const email = `stocktest_${ts}@example.com`;
    const password = 'Test1234!';
    const username = `stocktest_${ts}`;
    const regForm = querystring.stringify({ username, email, password, address: '1', contact: '1', role: 'user' });

    // register
    const reg = await request('/register', 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(regForm) }, regForm);
    console.log('register status', reg.statusCode);

    // login
    const loginForm = querystring.stringify({ email, password });
    const loginRes = await request('/login', 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(loginForm) }, loginForm);
    const cookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'].map(c=>c.split(';')[0]).join('; ') : '';
    console.log('login status', loginRes.statusCode, 'cookie', !!cookie);

    // get product qty before
    db.query('SELECT quantity FROM products WHERE id = ?', [p.id], async (qe, qr) => {
      if (qe) return console.error('error selecting product', qe);
      const before = Number(qr[0].quantity);
      console.log('quantity before:', before);

      // add to cart 1
      const addForm = querystring.stringify({ quantity: 1 });
      const addRes = await request(`/add-to-cart/${p.id}`, 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(addForm), 'Cookie': cookie }, addForm);
      console.log('add-to-cart status', addRes.statusCode);

      // checkout
      const co = await request('/checkout', 'POST', { 'Cookie': cookie });
      console.log('checkout status', co.statusCode);

      // get product qty after
      db.query('SELECT quantity FROM products WHERE id = ?', [p.id], (qe2, qr2) => {
        if (qe2) return console.error('error selecting product after', qe2);
        const after = Number(qr2[0].quantity);
        console.log('quantity after:', after);
        console.log('decremented by', before - after);
        db.end();
      });
    });
  });
})();
