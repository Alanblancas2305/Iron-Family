import test from 'node:test';
import assert from 'node:assert/strict';
import { listMembers,listComments,deleteComment,deleteMember } from '../src/data.js';
import { membership } from '../src/shared.js';
test('demo migration preserves edits, adds 60 once and keeps deletions',async()=>{
 const oldFetch=global.fetch, oldStorage=global.localStorage;
 const data=new Map([['iron_family_demo_v1',JSON.stringify([{id:1007,name:'Miembro conservado',access_code:'CUSTOM',start:'2026-01-01',months:1}])]]);
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
