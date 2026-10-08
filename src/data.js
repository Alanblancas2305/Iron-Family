import { addMonths, membership, today, validateMember, normalizeName, validateComment, validatePayment } from './shared.js';
const KEY = 'iron_family_demo_v1';
let config;
export async function api(action, data, method = data ? 'POST' : 'GET') {
  let response;
  try { response = await fetch('/api/family?action=' + action, {
    method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
    ...(data ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(15000)
  }); } catch (error) { throw new Error(error.name === 'TimeoutError' ? 'La conexión tardó demasiado. Inténtalo de nuevo.' : 'No se pudo conectar. Revisa tu conexión a internet e inténtalo de nuevo.'); }
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('Abre el proyecto con npm run dev o en Vercel.');
  const result = await response.json();
  if (!response.ok) { const error = new Error(result.error || 'No se pudo completar la solicitud.'); error.status = response.status; throw error; }
  return result;
}
export async function getConfig() { return config ||= await api('config'); }
function seed() {
  const now = today(), prior = addMonths(now, -1);
  return [
    { id: 1001, name: 'Alex Hernández', age: 27, area: 'gym', start: now, months: 1, access_code: 'IRON2010' },
    { id: 1002, name: 'Mariana López', age: 24, area: 'cf', start: now, months: 3, access_code: 'CROSS2026' },
    { id: 1003, name: 'Daniel Torres', age: 31, area: 'gym', start: addMonths(now, -2), months: 1, access_code: 'FAMILY03' },
    { id: 1004, name: 'Andrea García', age: 29, area: 'cf', start: prior, months: 1, access_code: 'FAMILY04' },
    { id: 1005, name: 'Luis Ramírez', age: 35, area: 'gym', start: now, months: 6, access_code: 'FAMILY05' },
    { id: 1006, name: 'Sofía Martínez', age: 26, area: 'cf', start: now, months: 12, access_code: 'FAMILY06' }
  ];
}
function read() {
  try { const value = localStorage.getItem(KEY); if (value) { const parsed = JSON.parse(value); if (!Array.isArray(parsed)) throw new Error(); return parsed; } const initial = seed(); write(initial); return initial; }
  catch { throw new Error('No pudimos leer los datos de prueba. Habilita el almacenamiento del navegador o restáuralos desde Configuración.'); }
}
function write(rows) { try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch { throw new Error('No se pudieron guardar los cambios en este navegador.'); } }
export async function listMembers() { return (await getConfig()).mode === 'cloud' ? api('members') : read(); }
export async function saveMember(data) {
  const fields = validateMember(data);
  if ((await getConfig()).mode === 'cloud') return api('members', { ...fields, ...(data.id ? { id: Number(data.id) } : {}) }, data.id ? 'PATCH' : 'POST');
  const rows = read();
  if (data.id) {
    const index = rows.findIndex(r => r.id === Number(data.id));
    if (index < 0) throw new Error('Este miembro ya no existe. Actualiza la lista.');
    rows[index] = { ...rows[index], ...fields, paid_until: rows[index].start===fields.start && rows[index].months===fields.months ? rows[index].paid_until : null }; write(rows); return rows[index];
  }
  const member = { ...fields, id: Math.max(1000, ...rows.map(r => r.id)) + 1, access_code: crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase() };
  rows.push(member); write(rows); return member;
}
export async function deleteMember(id) { if ((await getConfig()).mode === 'cloud') return api('members', { id }, 'DELETE'); write(read().filter(m => m.id !== Number(id))); }
export async function lookup(name) {
  name = name.trim();
  if (name.length < 3 || name.length > 100) throw new Error('Escribe tu nombre completo.');
  if ((await getConfig()).mode === 'cloud') return api('lookup', { name });
  const matches = read().filter(m => normalizeName(m.name) === normalizeName(name));
  if (!matches.length) throw new Error('No encontramos tu membresía. Escribe tu nombre completo como lo registraste en recepción.');
  if (matches.length > 1) throw new Error('Hay más de un registro con ese nombre. Acércate a recepción para identificar tu membresía.');
  const {id, name: fullName, area, start, months, paid_until} = matches[0];
  return {id, name: fullName, area, start, months, paid_until};
}
const COMMENTS_KEY = 'iron_family_comments_v1';
function readComments() { return JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]'); }
export async function sendComment(data) {
  const fields = validateComment(data);
  if ((await getConfig()).mode === 'cloud') return api('comments', fields);
  const rows = readComments();
  rows.unshift({...fields, id: crypto.randomUUID(), created_at: new Date().toISOString(), reviewed: false});
  try { localStorage.setItem(COMMENTS_KEY, JSON.stringify(rows)); } catch { throw new Error('No se pudo guardar tu comentario. Intenta de nuevo.'); }
  return {ok:true};
}
export async function listComments() { return (await getConfig()).mode === 'cloud' ? api('comments') : readComments(); }
export async function reviewComment(id) {
  if ((await getConfig()).mode === 'cloud') return api('comments', {id}, 'PATCH');
  const rows = readComments(); const row = rows.find(x => x.id === id);
  if (row) row.reviewed = true;
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(rows));
}
export async function resetDemo() { if ((await getConfig()).mode !== 'demo') throw new Error('Esta opción solo existe en la demostración.'); write(seed()); }

export async function listPayments() { return (await getConfig()).mode==='cloud' ? api('payments') : JSON.parse(localStorage.getItem('iron_payments_demo')||'[]'); }
export async function recordPayment(data) {
 const fields=validatePayment(data);
 if((await getConfig()).mode==='cloud') return api('payments',fields);
 const payments=await listPayments();
 if(payments.some(p=>p.id===fields.id)) return payments.find(p=>p.id===fields.id);
 const member=read().find(m=>m.id===fields.member_id);
 if(!member) throw new Error('Este miembro ya no existe.');
 const rows=read(), index=rows.findIndex(x=>x.id===member.id);
 rows[index]={...member,start:fields.start===membership(member).end?member.start:fields.start,months:fields.months,paid_until:addMonths(fields.start,fields.months)};write(rows);
 const payment={...fields,member_name:member.name,created_at:new Date().toISOString()};
 localStorage.setItem('iron_payments_demo',JSON.stringify([payment,...payments]));return payment;
}
