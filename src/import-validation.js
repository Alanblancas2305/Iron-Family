import { addMonths, today, normalizeName, validateMember, validatePayment, membership } from './shared.js';

export const IMPORT_LIMIT = 500;
export function isStale(member, on = today()) {
  return addMonths(membership(member, on).end, 3) < on;
}
export function parseImportDate(value, date1904 = false) {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) throw new Error('La fecha debe tener solo día, mes y año.');
    value = new Date(Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 30) + value * 86400000).toISOString().slice(0,10);
  }
  let text = String(value ?? '').trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) text = `${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString().slice(0,10) !== text || text < '2000-01-01' || text > '2100-12-31') throw new Error('Usa una fecha válida con año: DD/MM/AAAA.');
  return text;
}
export function validateImportRow(row, on = today()) {
  const start = parseImportDate(row.start), end = parseImportDate(row.paid_until);
  const months = [1,3,6,12].find(n => addMonths(start,n) === end);
  if (!months) throw new Error('El vencimiento debe ser 1, 3, 6 o 12 meses después del inicio.');
  const fields = validateMember({...row,start,months});
  const amount = validatePayment({id:'00000000-0000-4000-8000-000000000000',member_id:1,amount:row.amount,method:row.method || 'Efectivo',start,months}).amount;
  if (isStale({...fields,paid_until:end},on)) throw new Error('Lleva más de tres meses vencida; registra una renovación antes de importarla.');
  return {...fields,paid_until:end,amount,method:row.method || 'Efectivo'};
}
export function validateImportBatch(rows, on = today()) {
  if (!Array.isArray(rows) || !rows.length || rows.length > IMPORT_LIMIT) throw new Error(`Selecciona entre 1 y ${IMPORT_LIMIT} registros.`);
  return rows.map((row,i)=>{try{return validateImportRow(row,on);}catch(e){throw new Error(`Fila ${i+2}: ${e.message}`);}});
}
export function previewImport(matrix, existing, defaultArea = 'gym', date1904 = false, on = today()) {
  const headers = (matrix[0] || []).map(normalizeName);
  const column = (names) => headers.findIndex(h=>names.includes(h));
  const cols = {name:column(['nombre','nombre completo']),start:column(['inicio','fecha de pago']),paid_until:column(['vencimiento']),age:column(['edad']),amount:column(['pago','importe mxn']),area:column(['modalidad']),method:column(['forma de pago'])};
  if ([cols.name,cols.start,cols.paid_until].some(i=>i<0)) throw new Error('Faltan columnas: Nombre, Inicio y Vencimiento. Descarga la plantilla.');
  const rows = matrix.slice(1).map((cells,i)=>({cells,line:i+2})).filter(({cells})=>cells.some(v=>String(v??'').trim()));
  if (!rows.length || rows.length > IMPORT_LIMIT) throw new Error(`El archivo debe contener entre 1 y ${IMPORT_LIMIT} filas de datos.`);
  const seen = new Set(existing.map(m=>normalizeName(m.name)));
  return rows.map(({cells,line})=>{
    const raw = Object.fromEntries(Object.entries(cols).map(([key,i])=>[key,i<0?'':cells[i] ?? '']));
    try {
      raw.start=parseImportDate(raw.start,date1904);raw.paid_until=parseImportDate(raw.paid_until,date1904);
      const area=normalizeName(raw.area);
      raw.area=area ? ({gym:'gym','iron gym':'gym',cross:'cf',crossfit:'cf',cf:'cf','iron cross':'cf'}[area] || area) : defaultArea;
      if(raw.method) raw.method=({efectivo:'Efectivo',tarjeta:'Tarjeta',transferencia:'Transferencia'}[normalizeName(raw.method)] || raw.method);
      const fields=validateImportRow(raw,on), key=normalizeName(fields.name);
      if (seen.has(key)) return {line,fields,status:'duplicate',message:'Nombre ya registrado o repetido; se omitirá.'};
      seen.add(key);return {line,fields,status:'ready',message:'Listo para importar'};
    } catch(e) {return {line,fields:raw,status:'error',message:e.message};}
  });
}
