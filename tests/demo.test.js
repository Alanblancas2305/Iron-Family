import test from 'node:test';
import assert from 'node:assert/strict';
import { saveMember,lookup,importMembers,listPayments,listMembers,listComments,deleteComment,deleteMember } from '../src/data.js';
import { addMonths, membership, today } from '../src/shared.js';
test('demo migration preserves edits, adds 60 once and keeps deletions',async()=>{
 const oldFetch=global.fetch, oldStorage=global.localStorage;
 const data=new Map([['iron_family_demo_v1',JSON.stringify([{id:1007,name:'Miembro conservado',access_code:'CUSTOM',start:today(),months:1}])]]);
 global.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 global.fetch=async()=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>({mode:'demo'})});
 try{
  const rows=await listMembers();assert.equal(rows.length,61);assert.equal(rows[0].name,'Miembro conservado');assert.equal(new Set(rows.map(m=>m.id)).size,61);
  for(const state of ['expired','soon','active']) assert(rows.slice(1).some(m=>membership(m).state===state));
  assert.equal((await listMembers()).length,61);await deleteMember(rows[1].id);assert.equal((await listMembers()).length,60);
  const comments=await listComments();assert.equal(comments.length,12);assert(comments.every(c=>c.example));
  await deleteComment(comments[0].id);assert.equal((await listComments()).length,11);
 }finally{global.fetch=oldFetch;global.localStorage=oldStorage;}
});

test('el último perfil conserva los pagos y la consulta por nombre funciona',async()=>{
 const oldFetch=global.fetch, oldStorage=global.localStorage, data=new Map();
 global.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 global.fetch=async()=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>({mode:'demo'})});
 try {
   const start=today(), row={name:'Raúl Gómez',start,paid_until:addMonths(start,1),area:'gym'};
   await importMembers([row]);
   const first=await lookup(row.name);
   await saveMember({...row,name:'RAUL   GOMEZ',months:3});
   assert.equal((await lookup('Raúl Gómez')).months,3);
   await importMembers([row,{...row,area:'cf'}]);
   const latest=await lookup('raul gomez');
   assert.equal(latest.id,first.id);
   assert.equal(latest.area,'cf');
   assert.equal((await listPayments()).filter(p=>p.member_id===first.id).length,1);
 } finally {global.fetch=oldFetch;global.localStorage=oldStorage;}
});
