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
  console.log('ADMIN TEST: 1) GET /');
  const root = await request('/');
  if (!root || root.error) { console.error('GET / failed', root && root.error); return; }
  console.log('GET / ->', root.statusCode);

  const ts = Date.now();
  const username = `admin_e2e_${ts}`;
  const email = `admin_${ts}@example.com`;
  const password = 'AdminTest123!';

  // Register admin
  const form = querystring.stringify({ username, email, password, address: '1 Admin St', contact: '555', role: 'admin' });
  console.log('\nADMIN TEST: 2) POST /register (admin)');
  const reg = await request('/register', 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) }, form);
  console.log('register ->', reg.statusCode, reg.headers && reg.headers.location ? ('redirect->'+reg.headers.location) : '');

  // Login as admin
  console.log('\nADMIN TEST: 3) POST /login');
  const loginForm = querystring.stringify({ email, password });
  const loginRes = await request('/login', 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(loginForm) }, loginForm);
  if (loginRes.error) { console.error('Login error', loginRes.error); return; }
  console.log('login status', loginRes.statusCode);
  const setCookie = loginRes.headers['set-cookie'];
  const cookieHeader = setCookie ? setCookie.map(c=>c.split(';')[0]).join('; ') : '';
  console.log('cookie:', cookieHeader || '<none>');

  // GET /inventory
  console.log('\nADMIN TEST: 4) GET /inventory');
  const inv = await request('/inventory', 'GET', cookieHeader ? { 'Cookie': cookieHeader } : {});
  console.log('/inventory ->', inv.statusCode, 'len', inv.body ? inv.body.length : 0);

  // GET addProduct
  console.log('\nADMIN TEST: 5) GET /addProduct');
  const addPage = await request('/addProduct', 'GET', cookieHeader ? { 'Cookie': cookieHeader } : {});
  console.log('/addProduct ->', addPage.statusCode);

  // POST addProduct (no image) - use urlencoded
  console.log('\nADMIN TEST: 6) POST /addProduct');
  const newProduct = querystring.stringify({ name: 'AdminTestProduct_'+ts, quantity: 5, price: 2.50 });
  const addRes = await request('/addProduct', 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(newProduct), 'Cookie': cookieHeader }, newProduct);
  console.log('addProduct ->', addRes.statusCode, addRes.headers && addRes.headers.location ? ('redirect->'+addRes.headers.location) : '');

  // GET inventory again to find product id
  const inv2 = await request('/inventory', 'GET', cookieHeader ? { 'Cookie': cookieHeader } : {});
  console.log('/inventory (post-add) ->', inv2.statusCode, 'len', inv2.body ? inv2.body.length : 0);
  const match = inv2.body.match(/updateProduct\/(\d+)/i) || inv2.body.match(/deleteProduct\/(\d+)/i) || inv2.body.match(/updateProduct%2F(\d+)/i);
  let pid = null;
  if (match) pid = match[1];
  console.log('found product id:', pid);

  if (pid) {
    // GET updateProduct page
    console.log('\nADMIN TEST: 7) GET /updateProduct/'+pid);
    const upPage = await request('/updateProduct/'+pid, 'GET', cookieHeader ? { 'Cookie': cookieHeader } : {});
    console.log('updateProduct GET ->', upPage.statusCode);

    // POST updateProduct (change price)
    console.log('\nADMIN TEST: 8) POST /updateProduct/'+pid);
    const updForm = querystring.stringify({ name: 'AdminTestProduct_'+ts+'_v2', quantity: 3, price: 3.75, currentImage: '' });
    const updRes = await request('/updateProduct/'+pid, 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(updForm), 'Cookie': cookieHeader }, updForm);
    console.log('updateProduct POST ->', updRes.statusCode);

    // GET users
    console.log('\nADMIN TEST: 9) GET /users');
    const users = await request('/users', 'GET', cookieHeader ? { 'Cookie': cookieHeader } : {});
    console.log('/users ->', users.statusCode, 'len', users.body ? users.body.length : 0);

    // find admin user id to delete test user (but don't delete ourselves)
    const userMatch = users.body.match(/delete-user\/(\d+)/i);
    let uid = userMatch ? userMatch[1] : null;
    console.log('found some user id (for delete test):', uid);

    if (uid && uid !== '1') {
      console.log('\nADMIN TEST: 10) GET /delete-user/'+uid);
      const delUser = await request('/delete-user/'+uid, 'GET', cookieHeader ? { 'Cookie': cookieHeader } : {});
      console.log('delete-user ->', delUser.statusCode);
    }

    // Delete product
    console.log('\nADMIN TEST: 11) GET /deleteProduct/'+pid);
    const delProd = await request('/deleteProduct/'+pid, 'GET', cookieHeader ? { 'Cookie': cookieHeader } : {});
    console.log('deleteProduct ->', delProd.statusCode);
  }

  console.log('\nADMIN TEST COMPLETE');
})();
