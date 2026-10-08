import test from 'node:test';
import assert from 'node:assert/strict';
import {membership,validatePayment,addMonths,today} from '../src/shared.js';
import {createHmac} from 'node:crypto';
import handler from '../api/family.js';
test('renovar conserva vigencia actual y valida importes',()=>{
 const current={start:'2026-10-01',months:1,paid_until:'2026-12-01'};
 assert.equal(membership(current,'2026-10-07').state,'active');
 assert.equal(membership(current,'2026-10-07').days,55);
 assert.equal(membership(current,'2026-12-02').state,'expired');
 const valid={id:'11111111-1111-4111-8111-111111111111',member_id:1001,amount:'500.50',method:'Efectivo',start:'2026-10-01',months:1};
 assert.equal(validatePayment(valid).amount,500.5);
 for(const amount of [0,-5,1.005,'oops',1000001])assert.throws(()=>validatePayment({...valid,amount}));
 assert.throws(()=>validatePayment({...valid,start:'2026-02-30'}));
});
test('pagos privados: exige sesión y usa una operación transaccional',async()=>{
 const keys=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ADMIN_USER','ADMIN_PASSWORD','SESSION_SECRET'];
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]])), oldFetch=global.fetch;
 Object.assign(process.env,{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test',ADMIN_USER:'test',ADMIN_PASSWORD:'test-only-password',SESSION_SECRET:'a'.repeat(40)});
 const payload=Buffer.from(JSON.stringify({user:'test',exp:Date.now()+3600000})).toString('base64url');
 const cookie='iron_session='+payload+'.'+createHmac('sha256',process.env.SESSION_SECRET).update(payload).digest('base64url');
 let calls=[];global.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body||'null')});return {ok:true,text:async()=>JSON.stringify({ok:true})};};
 const call=async(method,body,auth=false)=>{const res={setHeader(){},status(n){this.code=n;return this;},json(x){this.body=x;return this;}};await handler({method,query:{action:'payments'},body,headers:{host:'localhost','content-type':'application/json',...(auth?{cookie}:{})}},res);return res;};
 try{
 assert.equal((await call('GET')).code,401);
 const data={id:'11111111-1111-4111-8111-111111111111',member_id:1001,amount:500,method:'Efectivo',start:'2026-10-01',months:1};
 assert.equal((await call('POST',data)).code,401);
 assert.equal((await call('POST',{...data,amount:-1},true)).code,400);
 assert.equal(calls.length,0);
 assert.equal((await call('POST',data,true)).code,200);
 assert.equal(calls.length,1);assert.ok(calls[0].url.endsWith('/rpc/iron_record_payment'));
 assert.equal(calls[0].body.p_id,data.id);
 }finally{global.fetch=oldFetch;for(const [k,v] of Object.entries(saved))v===undefined?delete process.env[k]:process.env[k]=v;}
});
