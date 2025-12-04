const http = require('http');
http.get('http://localhost:3000/', (res) => {
  console.log('statusCode', res.statusCode);
  let body = '';
  res.setEncoding('utf8');
  res.on('data', (c) => body += c);
  res.on('end', () => {
    console.log('length', body.length);
    console.log('snippet', body.slice(0,200));
  });
}).on('error', (err) => console.log('error', err.message));
