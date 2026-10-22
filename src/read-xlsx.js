// Reads ordinary .xlsx worksheets only. Macros, formulas and encrypted files are rejected.
const MAX_XML = 12 * 1024 * 1024;
const decoder = new TextDecoder();
export async function unzipXML(buffer) {
  const bytes = new Uint8Array(buffer), view = new DataView(buffer), files = new Map();
  let end = -1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--) if(view.getUint32(i,true)===0x06054b50){end=i;break;}
  if(end<0) throw new Error('No es un Excel .xlsx válido. Guarda el archivo como Libro de Excel (.xlsx).');
  if(view.getUint16(end+4,true) || view.getUint16(end+6,true)) throw new Error('Archivo dividido no compatible.');
  let offset=view.getUint32(end+16,true), total=0;
  const count=view.getUint16(end+10,true);
  if(count>2000) throw new Error('El archivo contiene demasiados elementos. Usa la plantilla.');
  for(let i=0;i<count;i++) {
    if(view.getUint32(offset,true)!==0x02014b50) throw new Error('Archivo Excel dañado.');
    const flags=view.getUint16(offset+8,true),method=view.getUint16(offset+10,true),size=view.getUint32(offset+20,true),rawSize=view.getUint32(offset+24,true);
    const nameLength=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
    const name=decoder.decode(bytes.subarray(offset+46,offset+46+nameLength));
    offset+=46+nameLength+extra+comment;
    if(!name.startsWith('xl/') || !/\.(xml|rels)$/.test(name)) continue;
    total+=rawSize;
    if(total>MAX_XML || flags&1 || ![0,8].includes(method)) throw new Error('Excel demasiado grande, protegido o no compatible. Usa la plantilla.');
    const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
    if(start+size>bytes.length) throw new Error('Archivo Excel incompleto.');
    let content=bytes.subarray(start,start+size);
    if(method===8) {
      const reader=new Blob([content]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
      const chunks=[];let length=0;
      try {for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>rawSize || length>MAX_XML)throw new Error('Excel demasiado grande.');chunks.push(value);}}
      finally {await reader.cancel();}
      content=new Uint8Array(length);let at=0;for(const chunk of chunks){content.set(chunk,at);at+=chunk.length;}
    }
    if(content.length!==rawSize) throw new Error('Archivo Excel dañado.');
    files.set(name,decoder.decode(content));
  }
  return files;
}
function xml(text) {
  if(!text || /<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('Estructura de Excel no compatible.');
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.getElementsByTagName('parsererror').length) throw new Error('Excel dañado: XML inválido.');
  return doc;
}
const tags=(node,name)=>Array.from(node.getElementsByTagNameNS('*',name));
export async function readXlsx(file) {
  if(!/\.xlsx$/i.test(file.name)) throw new Error('Selecciona un archivo .xlsx. Guarda los archivos .xls como .xlsx primero.');
  if(file.size>5*1024*1024) throw new Error('El Excel debe pesar menos de 5 MB.');
  const files=await unzipXML(await file.arrayBuffer());
  const book=xml(files.get('xl/workbook.xml')),rels=xml(files.get('xl/_rels/workbook.xml.rels'));
  const sheet=tags(book,'sheet').find(s=>s.getAttribute('name')==='Carga masiva') || tags(book,'sheet')[0];
  if(!sheet) throw new Error('El archivo no tiene hojas.');
  const id=sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
  const rel=tags(rels,'Relationship').find(r=>r.getAttribute('Id')===id);
  if(!rel || rel.getAttribute('TargetMode')==='External') throw new Error('Hoja no compatible.');
  const target=rel.getAttribute('Target');
  const path=new URL(target,'https://xlsx.local/xl/').pathname.slice(1);
  const doc=xml(files.get(path));
  const strings=files.has('xl/sharedStrings.xml')?tags(xml(files.get('xl/sharedStrings.xml')),'si').map(si=>tags(si,'t').map(t=>t.textContent).join('')):[];
  const matrix=[];
  for(const row of tags(doc,'row')) {
    const index=Number(row.getAttribute('r'))-1;
    if(!Number.isInteger(index)||index<0||index>10000) throw new Error('Demasiadas filas. Usa la plantilla de hasta 500 miembros.');
    const values=[];
    for(const cell of tags(row,'c')) {
      if(tags(cell,'f').length) throw new Error(`Fila ${index+1}: reemplaza las fórmulas por valores antes de importar.`);
      const letters=(cell.getAttribute('r')||'').match(/^[A-Z]+/)?.[0];
      if(!letters) throw new Error('Referencia de celda inválida.');
      const col=[...letters].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
      if(col>100) throw new Error('Demasiadas columnas. Usa la plantilla.');
      const type=cell.getAttribute('t'),value=tags(cell,'v')[0]?.textContent ?? '';
      values[col]=type==='s'?strings[Number(value)]:type==='inlineStr'?tags(cell,'t').map(t=>t.textContent).join(''):(!type||type==='n')&&value!==''?Number(value):value;
      if(type==='e') throw new Error(`Fila ${index+1}: una celda contiene un error de Excel.`);
    }
    matrix[index]=values;
  }
  return {matrix:Array.from(matrix,row=>row||[]),date1904:['1','true'].includes(tags(book,'workbookPr')[0]?.getAttribute('date1904'))};
}
