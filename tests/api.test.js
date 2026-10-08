import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/family.js';
const keys=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ADMIN_USER','ADMIN_PASSWORD','SESSION_SECRET'];
const backup=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
function env(cloud=true){for(const k of keys)delete process.env[k];if(cloud)Object.assign(process.env,{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-server-key',ADMIN_USER:'test-admin',ADMIN_PASSWORD:'test-only-password-123',SESSION_SECRET:'test-only-session-secret-at-least-32-characters'});}
async function call(action,{method='GET',body,headers={}}={}){const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};await handler({method,query:{action},body,headers:{host:'localhost','content-type':'application/json',...headers},socket:{remoteAddress:'127.0.0.1'}},res);return res;}
test('API: aislamiento, sesión, validación, CRUD y consulta mínima',async()=>{
  const oldFetch=global.fetch;let stored=[],next=1001,seenHeaders;
  global.fetch=async(url,opt)=>{seenHeaders=opt.headers;const u=new URL(url),b=opt.body?JSON.parse(opt.body):{};let value;
    if(u.pathname.endsWith('iron_take_budget'))value=true;
    else if(u.pathname.endsWith('iron_lookup_name'))value=stored.filter(x=>x.name===b.p_name).map(({id,name,area,start,months})=>({id,name,area,start,months}));
    else if(opt.method==='POST'){const row={id:next++,...b};stored.push(row);value=[row];}
    else if(opt.method==='PATCH'){const id=Number(u.searchParams.get('id').slice(3));const row=stored.find(x=>x.id===id);Object.assign(row,b);value=[row];}
    else if(opt.method==='DELETE'){const id=Number(u.searchParams.get('id').slice(3));value=stored.filter(x=>x.id===id);stored=stored.filter(x=>x.id!==id);}
    else {value=stored.filter(x=>(!u.searchParams.has('id')||x.id===Number(u.searchParams.get('id').slice(3)))&&(!u.searchParams.has('access_code')||x.access_code===u.searchParams.get('access_code').slice(3)));if(u.searchParams.get('select')!=='*')value=value.map(({id,name,area,start,months})=>({id,name,area,start,months}));}
    return {ok:true,text:async()=>JSON.stringify(value)};
  };
  try{
    env(false);assert.equal((await call('config')).body.mode,'demo');
    process.env.SUPABASE_URL='https://example.supabase.co';assert.equal((await call('config')).code,503);
    env();assert.equal((await call('config')).body.mode,'cloud');
    assert.equal((await call('members')).code,401);
    assert.equal((await call('login',{method:'POST',body:{user:'test-admin',password:'bad'}})).code,401);
    const login=await call('login',{method:'POST',body:{user:'test-admin',password:'test-only-password-123'}});assert.equal(login.code,200);
    const cookie=login.headers['Set-Cookie'].split(';')[0],headers={cookie};
    assert.match(login.headers['Set-Cookie'],/HttpOnly/);
    assert.equal((await call('session',{headers})).body.authenticated,true);
    assert.equal((await call('session',{headers:{cookie:cookie+'x'}})).body.authenticated,false);
    assert.equal((await call('members',{method:'POST',body:{},headers:{...headers,origin:'https://attacker.example'}})).code,403);
    const member={name:'Alex Hernández',age:27,area:'gym',start:'2026-10-07',months:1};
    assert.equal((await call('members',{method:'POST',body:{...member,age:0},headers})).code,400);
    const created=await call('members',{method:'POST',body:member,headers});assert.equal(created.code,201);assert.equal(created.body.access_code.length,20);
    assert.equal(seenHeaders.apikey,'test-server-key');
    const list=await call('members',{headers});assert.equal(list.body.length,1);
    const looked=await call('lookup',{method:'POST',body:{name:member.name}});assert.equal(looked.code,200);assert.equal(looked.body.access_code,undefined);assert.equal(looked.body.age,undefined);
    assert.equal((await call('lookup',{method:'POST',body:{name:'Nombre inexistente'}})).code,404);
    assert.equal((await call('comments')).code,401);
    assert.equal((await call('comments',{method:'POST',body:{name:'',message:'Corto'}})).code,400);
    assert.equal((await call('lookup',{method:'POST',body:{name:'A'}})).code,400);
    stored.push({...stored[0],id:1002});
    assert.equal((await call('lookup',{method:'POST',body:{name:member.name}})).code,409);
    stored.pop();
    assert.equal((await call('members',{method:'PATCH',body:{...member,id:1001,months:3},headers})).body.months,3);
    assert.equal((await call('members',{method:'DELETE',body:{id:1001},headers})).code,200);assert.equal(stored.length,0);
    stored.push({id:7001,name:'Ejemplo',message:'Excelente atención.'});
    assert.equal((await call('comments',{method:'DELETE',body:{id:7001}})).code,401);
    assert.equal((await call('comments',{method:'DELETE',body:{id:7001},headers:{...headers,origin:'https://attacker.example'}})).code,403);
    assert.equal((await call('comments',{method:'DELETE',body:{id:'invalid'},headers})).code,400);
    assert.equal((await call('comments',{method:'DELETE',body:{id:7001},headers})).code,200);
    assert.equal(stored.length,0);
    assert.equal((await call('comments',{method:'DELETE',body:{id:7001},headers})).code,404);
    assert.match((await call('logout',{method:'POST',body:{},headers})).headers['Set-Cookie'],/Max-Age=0/);
  }finally{global.fetch=oldFetch;for(const [k,v] of Object.entries(backup)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
