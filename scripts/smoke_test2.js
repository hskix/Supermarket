const http = require('http');
const https = require('https');
const { URL } = require('url');
const urls = [
  '/', '/shopping', '/cart', '/login', '/register', '/inventory', '/order-history', '/users', '/addProduct', '/Checkout'
].map(p => `http://localhost:3000${p}`);

function fetch(url){
  return new Promise((resolve) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(u, { method: 'GET' }, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({ url, statusCode: res.statusCode, length: Buffer.byteLength(body), snippet: body.slice(0,200) });
      });
    });
    req.on('error', (err) => resolve({ url, error: err.message }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ url, error: 'timeout' }); });
    req.end();
  });
}

(async () => {
  for (const u of urls) {
    const r = await fetch(u);
    if (r.error) console.log(`${u} => ERROR: ${r.error}`);
    else console.log(`${u} => ${r.statusCode} | length:${r.length} | snippet:${JSON.stringify(r.snippet)}`);
  }
})();
