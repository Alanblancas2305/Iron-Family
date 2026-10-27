import test from 'node:test';
import assert from 'node:assert/strict';
import {periodEnd,addMonths,membership,validateMember,validatePayment,paymentPeriod,durationLabel} from '../src/shared.js';
const member={id:5,name:'Prueba Semanal',age:null,area:'gym',start:'2026-10-27',months:0};
test('seven-day memberships cross month, year and leap-day boundaries',()=>{
 assert.equal(periodEnd('2026-10-27',0),'2026-11-03');
 assert.equal(periodEnd('2026-12-28',0),'2027-01-04');
 assert.equal(periodEnd('2024-02-25',0),'2024-03-03');
 assert.equal(addMonths('2026-10-27',0),'2026-10-27');
 assert.equal(periodEnd('2026-01-31',1),'2026-02-28');
 assert.equal(membership(member,'2026-10-27').end,'2026-11-03');
 assert.equal(validateMember(member).months,0);
 for(const months of [null,undefined,'',-1,7]) assert.throws(()=>validateMember({...member,months}));
 assert.equal(durationLabel(0),'1 semana · 7 días');
});
test('first weekly payment records the registration period; next renewal preserves remaining days',()=>{
 assert.deepEqual(paymentPeriod(member,[],'2026-10-27'),{start:'2026-10-27',months:0});
 const period=paymentPeriod(member,[{member_id:5}],'2026-10-29');
 assert.equal(period.start,'2026-11-03');
 assert.equal(periodEnd(period.start,0),'2026-11-10');
 const payment={id:'11111111-1111-4111-8111-111111111111',member_id:5,amount:150,method:'Efectivo',start:period.start,months:0};
 assert.equal(validatePayment(payment).months,0);
 assert.throws(()=>validatePayment({...payment,months:null}));
});
