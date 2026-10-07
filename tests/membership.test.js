import test from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, membership, validateMember } from '../src/shared.js';
test('vencimientos al final del mes y año bisiesto',()=>{
  assert.equal(addMonths('2026-01-31',1),'2026-02-28');
  assert.equal(addMonths('2024-01-31',1),'2024-02-29');
  assert.equal(addMonths('2024-02-29',12),'2025-02-28');
  assert.equal(addMonths('2026-10-07',3),'2027-01-07');
});
test('estados de vigencia incluyen último día y fechas futuras',()=>{
  const m={start:'2026-10-07',months:1};
  assert.equal(membership(m,'2026-10-06').state,'pending');
  assert.equal(membership(m,'2026-10-10').state,'active');
  assert.equal(membership(m,'2026-10-31').state,'soon');
  assert.equal(membership(m,'2026-11-07').days,0);
  assert.equal(membership(m,'2026-11-07').state,'soon');
  assert.equal(membership(m,'2026-11-08').state,'expired');
});
test('fechas imposibles y campos fuera de rango se rechazan',()=>{
  const m={name:'Alex Hernández',age:27,area:'gym',start:'2026-10-07',months:1};
  assert.equal(validateMember(m).name,m.name);
  for(const patch of [{start:'2026-02-30'},{age:0},{months:2},{area:'admin'},{name:'A'}])assert.throws(()=>validateMember({...m,...patch}));
});
