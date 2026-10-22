import test from 'node:test';
import assert from 'node:assert/strict';
import { previewImport, parseImportDate, validateImportBatch, isStale } from '../src/import-validation.js';
import { validateMember, validatePayment, today } from '../src/shared.js';
import handler from '../api/family.js';
const row={name:'Citzi',start:'2026-10-11',paid_until:'2026-11-11',area:'gym',age:''};
test('edad opcional, importe predeterminado y fechas españolas/Excel',()=>{
  assert.equal(validateMember({...row,months:1}).age,null);
  assert.equal(validateMember({...row,age:null,months:1}).age,null);
  assert.equal(validateImportBatch([row],'2026-10-21')[0].amount,600);
  assert.equal(parseImportDate('7/10/2026'),'2026-10-07');
  assert.equal(parseImportDate(46306),'2026-10-11');
  assert.equal(parseImportDate(46306-1462,true),'2026-10-11');
  for(const date of ['31/02/2026','11/10','10/11/26','2026-13-01'])assert.throws(()=>parseImportDate(date));
  assert.throws(()=>validateImportBatch([{...row,amount:0}],'2026-10-21'));
  assert.throws(()=>validateImportBatch([{...row,age:11}],'2026-10-21'));
  assert.throws(()=>validateImportBatch([{...row,paid_until:'2026-10-10'}],'2026-10-21'));
  assert.throws(()=>validateImportBatch(Array(501).fill(row),'2026-10-21'));
});
test('preview distinguishes duplicates, errors, modality and totals',()=>{
  const matrix=[['Nombre','Inicio','Vencimiento','Pago','Edad','Modalidad'],['Citzi','11/10/2026','11/11/2026','','',''],[' CÍTZI ','11/10/2026','11/11/2026',600,'',''],['Nancy','11/10/2026','11/11/2026',650,25,'Cross'],['Omar','31/02/2026','31/03/2026',600,'','']];
  const result=previewImport(matrix,[{name:'Nancy'}],'gym',false,'2026-10-21');
  assert.deepEqual(result.map(r=>r.status),['ready','duplicate','duplicate','error']);
  assert.equal(result[0].fields.amount,600);assert.equal(result[0].fields.age,null);
  assert.equal(result[2].fields.area,'cf');assert.equal(result[2].fields.amount,650);
});
test('cleanup uses strictly more than three calendar months after expiry',()=>{
  const m={start:'2026-06-30',months:1,paid_until:'2026-07-31'};
  assert.equal(isStale(m,'2026-10-31'),false);assert.equal(isStale(m,'2026-11-01'),true);
  assert.equal(isStale({...m,paid_until:'2026-11-30'},'2026-11-01'),false);
  assert.equal(isStale({start:'2025-10-30',months:1},'2026-02-28'),false);
  assert.equal(isStale({start:'2025-10-30',months:1},'2026-03-01'),true);
});
test('import API requires auth and rejects whole invalid batches before the transaction',async()=>{
  const keys=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ADMIN_USER','ADMIN_PASSWORD','SESSION_SECRET'];
  const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]])),original=global.fetch;let imports=0;
  Object.assign(process.env,{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test',ADMIN_USER:'test',ADMIN_PASSWORD:'test-password-long',SESSION_SECRET:'test-secret-at-least-thirty-two-characters'});
  global.fetch=async(url,options)=>{if(url.endsWith('iron_import_members')){imports++;const body=JSON.parse(options.body);assert.equal(body.p_rows[0].age,null);assert.equal(body.p_rows[0].amount,600);return {ok:true,text:async()=>JSON.stringify({imported:1,skipped:0})};}return {ok:true,text:async()=>JSON.stringify(true)};};
  const call=async(action,body={},headers={},method='POST')=>{const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(value){this.body=value;return this;}};await handler({method,query:{action},body,headers:{host:'localhost','content-type':'application/json',...headers},socket:{remoteAddress:'127.0.0.1'}},res);return res;};
  try{
    assert.equal((await call('import',{rows:[row]})).code,401);
    const login=await call('login',{user:'test',password:'test-password-long'}),headers={cookie:login.headers['Set-Cookie'].split(';')[0]};
    assert.equal((await call('import',{rows:[row]},{...headers,origin:'https://other.example'})).code,403);
    assert.equal((await call('import',{rows:[row,{...row,name:'X'}]},headers)).code,400);assert.equal(imports,0);
    const future={...row,start:'2099-10-11',paid_until:'2099-11-11'};
    assert.equal((await call('import',{rows:[future]},headers)).code,200);assert.equal(imports,1);
    assert.equal((await call('import',{},headers,'GET')).code,405);
  }finally{global.fetch=original;for(const[k,v]of Object.entries(prior)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
