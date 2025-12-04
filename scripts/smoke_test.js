const http = require('http');
const urls = [
  'http://localhost:3000/',
  'http://localhost:3000/shopping',
  'http://localhost:3000/cart',
  'http://localhost:3000/login',
  'http://localhost:3000/register',
  'http://localhost:3000/inventory',
  'http://localhost:3000/order-history',
  'http://localhost:3000/users',
  'http://localhost:3000/addProduct',
  'http://localhost:3000/Checkout'
];

function fetch(url){
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; if (data.length>20000) data = data.slice(0,20000); });
      res.on('end', () => {
        resolve({ url, statusCode: res.statusCode, length: data.length, snippet: data.slice(0,200) });
      });
    });
    req.on('error', (err) => {
      resolve({ url, error: err.message });
    });
    req.setTimeout(5000, () => { req.abort(); resolve({ url, error: 'timeout' }); });
  });
}

(async () => {
  for (const u of urls) {
    const r = await fetch(u);
    if (r.error) console.log(`${u} => ERROR: ${r.error}`);
    else console.log(`${u} => ${r.statusCode} | length:${r.length} | snippet:${JSON.stringify(r.snippet)}`);
  }
})();
