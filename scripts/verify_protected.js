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
  const ts = Date.now();
  const username = `admin_e2e_${ts}`;
  const email = `admin_${ts}@example.com`;
  const password = 'AdminPass123!';
  const form = querystring.stringify({ username, email, password, address: '1 Admin St', contact: '000', role: 'admin' });

  console.log('Registering admin:', email);
  const reg = await request('/register', 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) }, form);
  console.log('register status', reg.statusCode);

  console.log('Logging in as admin');
  const loginForm = querystring.stringify({ email, password });
  const loginRes = await request('/login', 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(loginForm) }, loginForm);
  console.log('login status', loginRes.statusCode);
  const setCookie = loginRes.headers['set-cookie'];
  const cookieHeader = setCookie ? setCookie.map(c=>c.split(';')[0]).join('; ') : '';

  const pages = ['/inventory','/addProduct','/users','/order-history','/shopping','/cart'];
  for (const p of pages) {
    const res = await request(p, 'GET', cookieHeader ? { 'Cookie': cookieHeader } : {});
    console.log(`${p} => ${res.error ? 'ERROR: '+res.error : res.statusCode}`);
  }

  console.log('Done');
})();
