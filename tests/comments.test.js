import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/family.js';
const keys=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ADMIN_USER','ADMIN_PASSWORD','SESSION_SECRET'];
async function call(method,body,headers={}) {
 const res={setHeader(){},status(n){this.code=n;return this},json(v){this.body=v;return this}};
 await handler({method,query:{action:'comments'},body,headers:{host:'localhost','content-type':'application/json',...headers},socket:{remoteAddress:'127.0.0.1'}},res);return res;
}
test('buzón público permite enviar pero no leer, valida y limita solicitudes',async()=>{
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]])),original=global.fetch;
 Object.assign(process.env,{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test',ADMIN_USER:'test',ADMIN_PASSWORD:'test-only-password-123',SESSION_SECRET:'test-only-session-secret-at-least-32-characters'});
 let allowed=true,comments=[];
 global.fetch=async(url,options)=>({ok:true,text:async()=>JSON.stringify(url.endsWith('iron_take_budget') ? allowed : (comments.push(JSON.parse(options.body)),[]))});
 try {
  assert.equal((await call('GET')).code,401);
  assert.equal((await call('PATCH',{id:1})).code,401);
  assert.equal((await call('POST',{name:'',message:'corto'})).code,400);
  assert.equal((await call('POST',{name:'',message:'Una sugerencia de prueba.'})).code,201);
  assert.deepEqual(comments,[{name:'',message:'Una sugerencia de prueba.'}]);
  assert.equal((await call('POST',{name:'',message:'x'.repeat(2001)})).code,400);
  allowed=false;assert.equal((await call('POST',{name:'',message:'Otra sugerencia de prueba.'})).code,429);
  assert.equal(comments.length,1);
 }finally{global.fetch=original;for(const [k,v] of Object.entries(saved))v===undefined?delete process.env[k]:process.env[k]=v;}
});
