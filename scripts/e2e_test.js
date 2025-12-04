const http = require('http');
const querystring = require('querystring');
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
  console.log('E2E TEST: 1) GET /');
  const root = await request('/');
  if (!root || root.error) { console.error('GET / failed', root && root.error); return; }
  console.log('GET / ->', root.statusCode);

  const ts = Date.now();
  const username = `e2e_user_${ts}`;
  const email = `e2e_${ts}@example.com`;
  const password = 'Test1234!';

  // Register
  const form = querystring.stringify({ username, email, password, address: '123 E2E St', contact: '1234567890', role: 'user' });
  console.log('\nE2E TEST: 2) POST /register');
  const reg = await request('/register', 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) }, form);
  console.log('register ->', reg.statusCode, (reg.headers && reg.headers.location) ? ('redirect->' + reg.headers.location) : '');

  // Login
  console.log('\nE2E TEST: 3) POST /login');
  const loginForm = querystring.stringify({ email, password });
  const loginRes = await request('/login', 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(loginForm) }, loginForm);
  if (loginRes.error) { console.error('Login error', loginRes.error); return; }
  console.log('login status', loginRes.statusCode);
  const setCookie = loginRes.headers['set-cookie'];
  console.log('set-cookie', setCookie ? setCookie.join('; ') : 'none');
  const cookieHeader = setCookie ? setCookie.map(c=>c.split(';')[0]).join('; ') : '';

  // GET shopping
  console.log('\nE2E TEST: 4) GET /shopping');
  const shop = await request('/shopping', 'GET', cookieHeader ? { 'Cookie': cookieHeader } : {});
  if (shop.error) { console.error('Shopping error', shop.error); return; }
  console.log('shopping', shop.statusCode, 'len', shop.body.length);

  // Find first add-to-cart endpoint
  const match = shop.body.match(/action="\/add-to-cart\/(\d+)"/i);
  if (!match) { console.error('No add-to-cart form found on shopping page'); return; }
  const productId = match[1];
  console.log('Found product id to add:', productId);

  // POST add-to-cart
  const addForm = querystring.stringify({ quantity: 1 });
  console.log('\nE2E TEST: 5) POST /add-to-cart/' + productId);
  const addRes = await request(`/add-to-cart/${productId}`, 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(addForm), 'Cookie': cookieHeader }, addForm);
  console.log('add-to-cart status', addRes.statusCode, (addRes.headers && addRes.headers.location) ? ('redirect->' + addRes.headers.location) : '');

  // GET /cart
  console.log('\nE2E TEST: 6) GET /cart');
  const cart = await request('/cart', 'GET', cookieHeader ? { 'Cookie': cookieHeader } : {});
  if (cart.error) { console.error('Cart error', cart.error); return; }
  console.log('cart status', cart.statusCode, 'len', cart.body.length);
  if (cart.body.includes('Proceed to Checkout') || cart.body.includes('Shopping Cart')) console.log('Cart page looks OK');
  if (!cart.body || cart.body.includes('Your cart is empty')) { console.error('Cart appears empty after adding item'); return; }

  // POST /checkout
  console.log('\nE2E TEST: 7) POST /checkout');
  const checkoutRes = await request('/checkout', 'POST', { 'Cookie': cookieHeader });
  if (checkoutRes.error) { console.error('Checkout error', checkoutRes.error); return; }
  console.log('checkout status', checkoutRes.statusCode);
  if (checkoutRes.body && checkoutRes.body.toLowerCase().includes('checkout successful')) console.log('Checkout success page detected');
  else if (checkoutRes.headers && (checkoutRes.headers.location || checkoutRes.statusCode===302)) console.log('Checkout redirected to', checkoutRes.headers.location || 'redirect');
  else console.log('Checkout response length', checkoutRes.body ? checkoutRes.body.length : 0);

  console.log('\nE2E TEST COMPLETE. Test user:', email, 'password:', password);
})();
