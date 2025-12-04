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
  console.log('1) GET /');
  const root = await request('/');
  console.log('GET / ->', root);
  if (!root || root.error) { console.log('GET / failed, aborting further tests'); return; }


  const ts = Date.now();
  const username = `testuser_${ts}`;
  const email = `test_${ts}@example.com`;
  const password = 'Test1234';
  const form = querystring.stringify({ username, email, password, address: '123 Test St', contact: '1234567890', role: 'user' });

  console.log('\n2) POST /register');
  const reg = await request('/register', 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) }, form);
  console.log('register ->', reg);
  if (!reg || reg.error) { console.log('Registration ERROR, aborting tests'); return; }

  // If server responded with 302/301 expect redirect
  if (reg.statusCode === 302 || reg.statusCode === 301) console.log('Registration redirected to', reg.headers.location);
  else console.log('Registration response snippet:', reg.body ? reg.body.slice(0,400) : '<empty>');

  console.log('\n3) GET /login');
  const loginPage = await request('/login');
  console.log(loginPage.error ? `ERROR: ${loginPage.error}` : `status ${loginPage.statusCode} len ${loginPage.body.length}`);

  console.log('\n4) POST /login');
  const loginForm = querystring.stringify({ email, password });
  const loginRes = await request('/login', 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(loginForm) }, loginForm);
  if (loginRes.error) { console.log('Login ERROR:', loginRes.error); return; }
  console.log('login status', loginRes.statusCode);
  const setCookie = loginRes.headers['set-cookie'];
  console.log('set-cookie', setCookie ? setCookie.join('; ') : 'none');

  // Access protected page /shopping with cookie if present
  console.log('\n5) GET /shopping (protected)');
  const headers = {};
  if (setCookie) headers['Cookie'] = setCookie.map(c=>c.split(';')[0]).join('; ');
  const shop = await request('/shopping', 'GET', headers);
  if (shop.error) { console.log('Shopping ERROR:', shop.error); return; }
  console.log('shopping status', shop.statusCode, 'len', shop.body.length);
  if (shop.body && shop.body.includes('Shop')) console.log('Shopping page content check: OK');

  console.log('\nFunctional test complete. NOTE: test user created in DB:', email);
})();
