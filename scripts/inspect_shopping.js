const http = require('http');
const BASE = { hostname: 'localhost', port: 3000 };
function request(path){return new Promise((resolve)=>{const req = http.request(Object.assign({}, BASE,{path,method:'GET'}),(res)=>{let c=[];res.on('data',d=>c.push(d));res.on('end',()=>resolve(Buffer.concat(c).toString()));});req.end();});}
(async()=>{
  const b = await request('/shopping');
  let idx=0; let found=false;
  const regex = /(\d+)\s+in stock/gi;
  let m; while((m=regex.exec(b))!==null){
    found=true; const i=m.index; const start=Math.max(0,i-200); const end=Math.min(b.length,i+200);
    console.log('--- match qty=',m[1],'at',i,'---');
    console.log(b.slice(start,end));
  }
  if(!found) console.log('No "in stock" matches found.');
})();