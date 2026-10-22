import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { unzipXML } from '../src/read-xlsx.js';
import { templateWorkbook } from '../src/import-ui.js';
import { createRegisterWorkbook } from '../src/excel.js';
test('template is readable, preserves six names, dates and optional blanks',async()=>{
  const files=await unzipXML(await templateWorkbook().arrayBuffer());
  const sheet=files.get('xl/worksheets/sheet1.xml');
  for(const name of ['Citzi','Nancy','Omar','Jesús','Ofir','Dennise']) assert(sheet.includes(name));
  assert.equal((sheet.match(/<row /g)||[]).length,7);
  assert.equal((sheet.match(/<v>600<\/v>/g)||[]).length,6);
  assert(sheet.includes('07/10/2026'));assert(sheet.includes('07/11/2026'));
  assert(files.get('xl/_rels/workbook.xml.rels').includes('Id="rId2"'));
});
test('compressed Excel XML is decoded and oversized entries are rejected',async()=>{
  const name=Buffer.from('xl/workbook.xml'),raw=Buffer.from('<workbook>Jesús</workbook>'),compressed=deflateRawSync(raw);
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(8,8);local.writeUInt16LE(name.length,26);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(8,10);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(raw.length,24);central.writeUInt16LE(name.length,28);
  const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,10);end.writeUInt32LE(local.length+name.length+compressed.length,16);
  const bytes=()=>{const b=Buffer.concat([local,name,compressed,central,name,end]);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
  assert.equal((await unzipXML(bytes())).get('xl/workbook.xml'),raw.toString());
  central.writeUInt32LE(20*1024*1024,24);await assert.rejects(()=>unzipXML(bytes()),/demasiado grande/);
  await assert.rejects(()=>unzipXML(new ArrayBuffer(0)),/válido/);
});
test('existing full export still has three sheets with blank ages',async()=>{
  const files=await unzipXML(await createRegisterWorkbook([{id:1,name:'Citzi',age:null,area:'gym',start:'2026-10-11',months:1}],[],[]).arrayBuffer());
  assert.equal([...files.keys()].filter(k=>k.startsWith('xl/worksheets/')).length,3);
  assert(!files.get('xl/worksheets/sheet1.xml').includes('null'));
});
