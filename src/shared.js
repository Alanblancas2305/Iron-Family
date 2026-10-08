export const areaName = a => a === 'cf' ? 'Iron Cross' : 'Iron Gym';
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function addMonths(start, months) {
  const [y, m, d] = start.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + Number(months), 1));
  t.setUTCDate(Math.min(d, new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate()));
  return t.toISOString().slice(0, 10);
}
export const daysBetween = (from, to) => Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);
export function membership(m, on = today()) {
  const end = m.paid_until || addMonths(m.start, m.months), days = daysBetween(on, end), pending = on < m.start;
  const state = pending ? 'pending' : days < 0 ? 'expired' : days <= 7 ? 'soon' : 'active';
  return { end, days, state, label: { pending: 'Por iniciar', expired: 'Vencida', soon: 'Por vencer', active: 'Activa' }[state], progress: pending ? 100 : Math.max(0, Math.min(100, days / daysBetween(m.start, end) * 100)) };
}
export const dateLabel = s => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(s + 'T12:00:00Z'));
export const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function validateMember(m) {
  if (typeof m.name !== 'string' || m.name.trim().length < 3 || m.name.length > 100) throw new Error('Escribe un nombre de 3 a 100 caracteres.');
  if (!Number.isInteger(Number(m.age)) || Number(m.age) < 12 || Number(m.age) > 100) throw new Error('La edad debe estar entre 12 y 100 años.');
  if (!['gym', 'cf'].includes(m.area)) throw new Error('Selecciona una modalidad.');
  if (![1, 3, 6, 12].includes(Number(m.months))) throw new Error('Selecciona una duración válida.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.start) || !Number.isFinite(Date.parse(m.start)) || new Date(m.start).toISOString().slice(0,10) !== m.start || m.start < '2000-01-01' || m.start > '2100-12-31') throw new Error('Selecciona una fecha válida.');
  return { name: m.name.trim(), age: Number(m.age), area: m.area, start: m.start, months: Number(m.months) };
}

export const normalizeName = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
export function remainingLabel(end, on = today()) {
  if (end <= on) return '';
  let months = (Number(end.slice(0,4))-Number(on.slice(0,4)))*12 + Number(end.slice(5,7))-Number(on.slice(5,7));
  if (addMonths(on, months) > end) months--;
  const days = daysBetween(addMonths(on, months), end);
  return [months ? `${months} ${months === 1 ? 'mes' : 'meses'}` : '', days ? `${days} ${days === 1 ? 'día' : 'días'}` : ''].filter(Boolean).join(' y ');
}
export function validateComment(data) {
  if (typeof data.message !== 'string' || data.message.trim().length < 10 || data.message.length > 2000) throw new Error('Escribe un comentario de 10 a 2000 caracteres.');
  if (typeof data.name !== 'string' || data.name.length > 100) throw new Error('El nombre debe tener hasta 100 caracteres.');
  return {name: data.name.trim(), message: data.message.trim()};
}

export function validatePayment(data) {
 const id=String(data.id||'');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Identificador de pago inválido.');
 const member_id=Number(data.member_id), amount=Number(data.amount), months=Number(data.months), start=String(data.start||''), method=data.method;
 if(!Number.isSafeInteger(member_id)||member_id<=0) throw new Error('Selecciona un socio.');
 if(!Number.isFinite(amount)||amount<=0||amount>1000000||Math.abs(amount*100-Math.round(amount*100))>0.00001) throw new Error('Escribe un importe válido con hasta dos decimales.');
 validateMember({name:'Validación',age:18,area:'gym',start,months});
 if(!['Efectivo','Tarjeta','Transferencia'].includes(method)) throw new Error('Selecciona la forma de pago.');
 return {id,member_id,amount,method,start,months};
}
