import { installScreensaver } from './screensaver.js';
import './screensaver.css';
import { openImportDialog } from './import-ui.js';
import { downloadRegister } from './excel.js';
import { api, getConfig, listMembers, saveMember, deleteMember, resetDemo, listComments, reviewComment, deleteComment, listPayments, recordPayment } from './data.js';
import { today, periodEnd, durationLabel, membership, paymentPeriod, dateLabel, escapeHTML as esc, areaName } from './shared.js';
const $ = s => document.querySelector(s), root = $('#admin-root'), dialog = $('#admin-dialog');
let config, members = [], view = 'dashboard', filter = 'all', areaFilter = 'all', query = '', toastTimer;
const restScreen = installScreensaver({ root, canShow: () => view === 'dashboard' && !!$('#admin-main') && !dialog.open && !document.body.classList.contains('sidebar-open') });
const icons = { dashboard: '▦', clients: '☷', new: '+', subscriptions: '◷', gym: '▰', cf: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 1v22M1 12h22M4 4l16 16M4 20L20 4"/></svg>', payments: '$', comments: '□', settings: '⚙' };
const mark = `<img class="brand-logo" src="/assets/iron-panthers-logo.png" alt="" width="54" height="54"><span>IRON PANTHERS<small>ADMINISTRACIÓN</small></span>`;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 4200); }
function badge(m) { const status = membership(m); return `<span class="badge ${status.state}">${status.label}</span>`; }
function login(error = '') {
  root.innerHTML = `<main class="login-page"><a class="brand" href="/">${mark}</a><div class="login-panel"><p class="eyebrow">TU FAMILIA. TU ESPACIO.</p><h1 class="rough">TODO BAJO<br><span class="red">CONTROL.</span></h1><p>Clientes, modalidades y membresías.<br>El día a día de Iron Panthers, en un solo lugar.</p>${config?.mode === 'demo' ? `<div class="admin-demo-note"><strong>Demostración</strong><p>Los registros son de ejemplo y se guardan solo en este navegador. Usa datos ficticios para explorar.</p></div><button class="button full" id="enter-demo">Explorar administración</button>` : `<form id="login-form"><label for="user">Usuario</label><input id="user" name="user" autocomplete="username" required><label for="password">Contraseña</label><input id="password" name="password" type="password" autocomplete="current-password" required><p class="form-error" id="login-error" role="alert">${esc(error)}</p><button class="button full">Entrar al panel</button></form>`}<a href="/" class="back-to-site">Volver al portal de miembros</a></div><div class="login-year" aria-hidden="true">2010</div></main>`;
  if (config?.mode === 'demo') $('#enter-demo').onclick = async () => { sessionStorage.setItem('iron_demo_entered', '1'); await openApp(); };
  else $('#login-form').onsubmit = async e => { e.preventDefault(); const button = e.target.querySelector('button'); button.disabled = true; $('#login-error').textContent = ''; try { await api('login', { user: $('#user').value, password: $('#password').value }); await openApp(); } catch (err) { $('#login-error').textContent = err.message; } finally { button.disabled = false; } };
}
async function refresh() { members = await listMembers(); }
async function openApp() { try { await refresh(); shell(); render(); } catch (e) { if (e.status === 401) login('Tu sesión terminó. Vuelve a entrar.'); else root.innerHTML = `<main class="loading-screen"><h1>No pudimos cargar el panel</h1><p>${esc(e.message)}</p><button class="button" id="retry">Intentar de nuevo</button><a href="/">Volver al portal</a></main>`; $('#retry')?.addEventListener('click', openApp); } }
function shell() {
  const nav = [['dashboard', 'Inicio'], ['clients', 'Miembros'], ['payments', 'Pagos y renovaciones'], ['comments', 'Comentarios']];
  root.innerHTML = `<aside class="admin-sidebar" id="admin-sidebar"><a class="brand" href="/">${mark}</a><p class="nav-label">TU ESPACIO</p><nav aria-label="Administración">${nav.map(([key, label]) => `<button data-nav="${key}"><span aria-hidden="true">${icons[key]}</span>${label}</button>`).join('')}</nav><div class="sidebar-bottom"><a href="/">Ver portal de miembros</a><button class="subtle" id="help-panel">Ayuda y conexión</button><p>ORIGINALES DESDE 2010</p></div></aside><div class="admin-page"><header class="admin-header"><div><button id="sidebar-toggle" class="icon-button" aria-label="Abrir navegación" aria-controls="admin-sidebar" aria-expanded="false">☰</button><span id="breadcrumb">Administración / Resumen</span></div><div class="admin-user"><span class="mode-label">${config.mode === 'demo' ? 'DEMOSTRACIÓN' : 'EN LÍNEA'}</span><button id="logout">Salir</button><span class="admin-avatar" aria-hidden="true">IP</span></div></header><main id="admin-main"></main></div>`;
  root.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => { const next = b.dataset.nav; areaFilter = ['gym','cf'].includes(next) ? next : 'all'; filter = 'all'; view = next === 'gym' || next === 'cf' ? 'clients' : next; query = ''; document.body.classList.remove('sidebar-open'); $('#sidebar-toggle').setAttribute('aria-expanded','false'); render(); window.scrollTo(0,0); });
  $('#help-panel').onclick=()=>{view='settings';render();};
  $('#sidebar-toggle').onclick = () => { const open = document.body.classList.toggle('sidebar-open'); $('#sidebar-toggle').setAttribute('aria-expanded', open); };
  $('#logout').onclick = async () => { try { if (config.mode === 'cloud') await api('logout', {}); sessionStorage.removeItem('iron_demo_entered'); members = []; login(); } catch (e) { toast(e.message); } };
}
const activeCount = () => members.filter(m => ['active','soon'].includes(membership(m).state)).length;
function expiryPanel(state, title, subtitle) {
  const list = members.filter(m => membership(m).state === state && matchesQuery(m)).sort((a,b) => state === 'expired' ? membership(b).days - membership(a).days : membership(a).days - membership(b).days);
  return `<section class="expiry-panel ${state}"><div class="expiry-heading"><div><p>${subtitle}</p><h2>${title}</h2></div><strong>${list.length}</strong></div><div class="expiry-list" data-expiry-list="${state}" tabindex="0" aria-label="${title}">${list.length ? list.map(m => {const status=membership(m), days=Math.abs(status.days); return `<article class="expiry-member"><div class="expiry-person"><button data-view="${m.id}">${esc(m.name)}</button><span class="expiry-time">${state==='expired' ? `Venció hace ${days} ${days===1?'día':'días'}` : status.days===0 ? 'Vence hoy' : `Vence en ${days} ${days===1?'día':'días'}`}</span><small>${dateLabel(status.end)}</small></div>${state==='expired'?`<button class="renew-button" data-renew="${m.id}" aria-label="Renovar membresía de ${esc(m.name)}">Renovar <span aria-hidden="true">↗</span></button>`: ""}</article>`;}).join('') : `<div class="empty"><span aria-hidden="true">✓</span><h3>${state==='expired'?'Sin membresías vencidas':'Todo al día'}</h3><p>${state==='expired'?'Las membresías vencidas aparecerán aquí.':'No hay vencimientos en los próximos 7 días.'}</p></div>`}</div><button class="expiry-footer" data-status="${state}">Ver en miembros <span aria-hidden="true">→</span></button></section>`;
}
function stats(keys=['all','current','soon','expired']) {
 const values={all:[members.length,'Miembros registrados','◎'],current:[activeCount(),'Membresías vigentes','✓'],soon:[members.filter(m=>membership(m).state==='soon').length,'Por vencer · 7 días','◷'],expired:[members.filter(m=>membership(m).state==='expired').length,'Membresías vencidas','!']};
 return `<div class="stats-grid reception-stats">${keys.map(key=>{const [n,label,icon]=values[key];return `<button class="stat-card ${key}" data-status="${key}"><div><span>${label}</span><span aria-hidden="true">${icon}</span></div><strong>${n}</strong><small>Ver miembros <span aria-hidden="true">↗</span></small></button>`;}).join('')}</div>`;
}
function receptionResults(){return query.trim()?`<section class="admin-card client-list reception-matches"><div id="members-table">${rows()}</div></section>`:expiryPanel('soon','Por vencer','SEGUIMIENTO · PRÓXIMOS 7 DÍAS')+expiryPanel('expired','Membresías vencidas','RENOVACIONES PENDIENTES');}
function dashboard() {
 return `<div class="reception-overview"><div><div class="admin-title reception-title"><div><p class="eyebrow">CENTRO DE RECEPCIÓN</p><h1>Todo listo para <span class="red">recibirlos.</span></h1><p>${dateLabel(today())} · Vigencias y renovaciones a la vista.</p></div></div>${stats(['soon','expired'])}</div><button class="button register-cta reception-register" data-create><span aria-hidden="true">＋</span><span>Registrar miembro</span></button></div><div class="reception-search"><label class="search-label" for="reception-search"><span aria-hidden="true">⌕</span><input id="reception-search" type="search" placeholder="Buscar por nombre o número" value="${esc(query)}"></label><button class="button secondary" id="refresh-reception">Actualizar</button></div><div class="reception-toolbar"><div><span class="live-dot" aria-hidden="true"></span><span id="reception-update" role="status">Vigencias actualizadas · Actualización automática cada minuto</span></div><button class="subtle" id="preview-rest">Ver animación de reposo</button></div><div class="expiry-board ${query.trim()?'searching':''}" id="reception-results">${receptionResults()}</div><div class="reception-bottom"><section class="admin-card" id="comment-summary" aria-live="polite">Consultando comentarios…</section><button class="reception-payment" data-payment><span class="quick-icon" aria-hidden="true">$</span><span><strong>Registrar pago y renovar</strong><small>Actualiza la vigencia y conserva el historial</small></span><span aria-hidden="true">↗</span></button></div>`;
}
async function refreshReception() {
  if(view!=='dashboard'||dialog.open||!$('#admin-main'))return;
  const button=$('#refresh-reception');if(button?.disabled)return;if(button)button.disabled=true;
  const scrolls=[...document.querySelectorAll('[data-expiry-list]')].map(el=>[el.dataset.expiryList,el.scrollTop]);
  try { await refresh(); if(view==='dashboard'&&!dialog.open&&$('#admin-main')){render();for(const [key,top] of scrolls){const el=document.querySelector(`[data-expiry-list="${key}"]`);if(el)el.scrollTop=top;}} }
  catch(e){if($('#reception-update'))$('#reception-update').textContent='No se pudo actualizar. Mostrando la última consulta.';if(e.status===401)handleError(e);}
  finally{if(button?.isConnected)button.disabled=false;}
}
function initials(name) { return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function matchesQuery(m){const normalize=x=>String(x).toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g,'');return normalize(m.name+' '+m.id).includes(normalize(query.trim()));}
function filtered() { const q = query.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g,''); return members.filter(m => (areaFilter==='all'||m.area===areaFilter) && (filter==='all' || (filter==='current' && ['active','soon'].includes(membership(m).state)) || membership(m).state===filter) && (!q || (m.name.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g,'')+' '+m.id).includes(q))); }
function rows() {
  const list = filtered();

  if (!list.length) {
    return `<div class="empty">
      <span>◎</span>
      <h3>${members.length ? 'Sin coincidencias' : 'Tu familia empieza aquí'}</h3>
      <p>${members.length ? 'Prueba otro nombre, número o filtro.' : 'Registra al primer miembro para comenzar.'}</p>
      ${!members.length ? '<button class="button" data-create>Registrar miembro</button>' : ''}
    </div>`;
  }

  return `<div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th>Miembro</th>
          <th>Modalidad</th>
          <th>Vencimiento</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(m => `<tr>
          <td>
            <div class="table-person">
              <div>
                <button class="member-name-button" data-view="${m.id}" aria-label="Ver ficha de ${esc(m.name)}">
                  <strong>${esc(m.name)}</strong>
                </button>
                <small>No. ${m.id} · Edad: ${m.age == null ? 'Sin registrar' : esc(m.age) + ' años'}</small>
              </div>
            </div>
          </td>
          <td data-label="Modalidad"><span class="area-label ${m.area}">${areaName(m.area)}</span></td>
          <td data-label="Vencimiento">
            ${dateLabel(membership(m).end)}
            <small>${membership(m).days < 0 ? 'Vencida' : membership(m).days + ' días restantes'}</small>
          </td>
          <td data-label="Estado">${badge(m)}</td>
          <td data-label="Acciones">
            <div class="row-actions"><button class="renew-action" data-renew="${m.id}" aria-label="Renovar a ${esc(m.name)}">Renovar</button>
              <button data-edit="${m.id}" aria-label="Editar a ${esc(m.name)}">Editar</button>
              <button class="delete-action" data-delete="${m.id}" aria-label="Eliminar a ${esc(m.name)}">Eliminar</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="table-bottom">${list.length} de ${members.length} miembros</div>`;
}
function clients() {
  return `<div class="admin-title">
    <div>
      <p class="eyebrow">RECEPCIÓN</p>
      <h1>Miembros</h1>
      <p>${members.length} miembros registrados · Busca por nombre</p>
    </div>
    <div class="excel-actions"><button class="button export-register" id="export-register">Descargar Excel completo</button><button class="subtle import-trigger" id="import-register">Importar Excel</button></div>
  </div>
  
  ${stats()}
  <section class="admin-card client-list">
    <div class="list-toolbar">
      <label class="search-label" for="search">
        <span aria-hidden="true">⌕</span>
        <input id="search" type="search" placeholder="Buscar por nombre o número" value="${esc(query)}">
      </label>
      <button class="button secondary" id="refresh">Actualizar lista</button>
    </div>
    <div class="member-filters">
      <fieldset>
        <legend>Modalidad</legend>
        <div>${[['all','Todas'],['gym','Iron Gym'],['cf','Iron Cross']]
          .map(([key,label]) => `<button data-area-choice="${key}" aria-pressed="${areaFilter === key}">${label}</button>`).join('')}
        </div>
      </fieldset>
      <fieldset>
        <legend>Vigencia</legend>
        <div>${[['all','Todas'],['current','Vigentes'],['soon','Por vencer'],['expired','Vencidas']]
          .map(([key,label]) => `<button data-filter="${key}" aria-pressed="${filter === key}">${label}</button>`).join('')}
        </div>
      </fieldset>
      <p>“Vigentes” también incluye membresías que vencen en los próximos 7 días.</p>
    </div>
    <div id="members-table" aria-live="polite">${rows()}</div>
  </section>`;
}
function form(member = {}) {
 if(!member.id)return `<form id="member-form" class="member-form registration-simple"><label for="name">Nombre completo</label><input id="name" name="name" minlength="3" maxlength="100" autocomplete="name" required><div class="registration-personal"><div><label for="age">Edad (opcional)</label><input id="age" name="age" type="number" min="12" max="100"></div><fieldset class="payment-area"><legend class="sr-only">Modalidad</legend><label><input type="radio" name="area" value="gym" checked><span>Iron Gym</span></label><label><input type="radio" name="area" value="cf"><span>Iron Cross</span></label></fieldset></div><label class="registration-duration" for="months">Duración</label><select id="months" name="months">${[0,1,3,6,12].map(n=>`<option value="${n}" ${n===1?'selected':''}>${durationLabel(n)}</option>`).join('')}</select><div class="registration-start"><label for="start">Fecha de inicio</label><input id="start" name="start" type="date" value="${today()}" min="2000-01-01" max="2100-12-31" required></div><div class="form-preview" id="form-preview" aria-live="polite"></div><p id="save-error" class="form-error" role="alert"></p><div class="form-actions"><button type="button" class="button secondary" data-cancel>Cancelar</button><button type="submit" class="button">＋ Registrar miembro</button></div></form>`;
 return `<form id="member-form" class="member-form"><div class="form-section-label">01 / DATOS DEL MIEMBRO</div><div class="form-grid"><div class="wide"><label for="name">Nombre completo</label><input id="name" name="name" value="${esc(member.name||'')}" minlength="3" maxlength="100" autocomplete="name" required></div><div><label for="age">Edad (opcional)</label><input id="age" name="age" type="number" min="12" max="100" value="${member.age||''}"></div><div><label for="area">Modalidad</label><select id="area" name="area"><option value="gym" ${member.area==='gym'?'selected':''}>Iron Gym</option><option value="cf" ${member.area==='cf'?'selected':''}>Iron Cross</option></select></div></div><div class="form-section-label">02 / MEMBRESÍA</div><div class="form-grid"><div><label for="start">Fecha de inicio</label><input id="start" name="start" type="date" value="${member.start||today()}" min="2000-01-01" max="2100-12-31" required></div><div><label for="months">Duración</label><select id="months" name="months">${[0,1,3,6,12].map(n=>`<option value="${n}" ${(member.months??1)===n?'selected':''}>${durationLabel(n)}</option>`).join('')}</select></div></div>${member.paid_until?`<p class="renew-note">Vigencia pagada hasta ${dateLabel(member.paid_until)}. Cambiar inicio o duración sustituye esta vigencia; para sumar tiempo usa Registrar pago.</p>`:""}<div class="form-preview" id="form-preview"></div><p id="save-error" class="form-error" role="alert"></p><div class="form-actions"><button type="button" class="button secondary" data-cancel>Cancelar</button><button type="submit" class="button">${member.id?'Guardar cambios':'＋ Registrar miembro'}</button></div></form>`; }
function settings() { return `<div class="admin-title"><div><p class="eyebrow">ASÍ FUNCIONA TU ESPACIO</p><h1>Configuración</h1></div></div><section class="admin-card settings-card"><h2>${config.mode==='demo'?'Demostración local':'Datos compartidos en línea'}</h2><p>${config.mode==='demo'?'Los cambios se guardan en este navegador. En otro celular o computadora verás sus propios datos de prueba. Usa únicamente información ficticia.':'Los registros se comparten entre administración y el portal. Cada miembro consulta su vigencia escribiendo su nombre completo. Los comentarios llegan al buzón privado del panel.'}</p>${config.mode==='demo'?'<p>Para usar registros reales, sigue la sección «Activar membresías en línea» de LEEME.md incluida en el proyecto.</p><hr><h3>Restaurar ejemplos</h3><p>Reemplaza los registros de prueba de este navegador por los 66 miembros de ejemplo.</p><button class="button secondary" id="reset-demo">Restaurar demostración</button>':'<p>La sesión administrativa dura ocho horas. Las credenciales se administran desde las variables de entorno de Vercel.</p>'}</section>`; }
function render() {
  const title = { dashboard:'Inicio',payments:'Pagos y renovaciones',clients:'Miembros',new:'Registrar miembro',subscriptions:'Membresías',comments:'Comentarios',settings:'Configuración' }[view]; $('#breadcrumb').textContent = 'Administración / ' + title;
  root.querySelectorAll('[data-nav]').forEach(b => { const selected = b.dataset.nav === view; b.classList.toggle('selected',selected); selected ? b.setAttribute('aria-current','page') : b.removeAttribute('aria-current'); });
  $('#admin-main').innerHTML = view==='payments'?paymentsPage():view==='comments'?'<div class="admin-title"><div><p class="eyebrow">LA VOZ DE LA FAMILIA</p><h1>Buzón de comentarios</h1><p>Mensajes privados para el equipo de administración.</p></div><button class="button secondary" id="refresh-comments">Actualizar</button></div><div id="comments-inbox" aria-live="polite">Cargando comentarios…</div>':view==='dashboard'?dashboard():view==='clients'||view==='subscriptions'?clients(view==='subscriptions'):view==='new'?`<div class="admin-title"><div><p class="eyebrow">BIENVENIDO A LA FAMILIA</p><h1>Registrar miembro</h1><p>Todo listo para su próximo entrenamiento.</p></div></div><section class="admin-card registration-card">${form()}</section>`:settings();
  wireActions($('#admin-main'));
  if(view==='payments') { loadPayments(); $('#new-payment').onclick=()=>paymentDialog(); }
  if(view==='dashboard') {$('#preview-rest').onclick=()=>restScreen.show();loadCommentSummary(); $('#refresh-reception').onclick=refreshReception;$('#reception-search').oninput=e=>{query=e.target.value;const results=$('#reception-results');results.classList.toggle('searching',!!query.trim());results.innerHTML=receptionResults();wireActions(results);};}
  if(view==='comments') { loadInbox(); $('#refresh-comments').onclick=loadInbox; }
  if(view==='new') wireForm($('#admin-main'),{},false);
  $('#search')?.addEventListener('input',e=>{query=e.target.value;$('#members-table').innerHTML=rows();wireActions($('#members-table'));});
  document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#members-table').innerHTML=rows();wireActions($('#members-table'));});
  document.querySelectorAll('[data-area-choice]').forEach(b=>b.onclick=()=>{areaFilter=b.dataset.areaChoice;document.querySelectorAll('[data-area-choice]').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#members-table').innerHTML=rows();wireActions($('#members-table'));});
  $('#import-register')?.addEventListener('click',()=>openImportDialog({openDialog,dialog,onDone:async()=>{await refresh();render();}}));
  $('#export-register')?.addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Preparando Excel…';try{const [all,payments,comments]=await Promise.all([listMembers(),listPayments(),listComments()]);downloadRegister(all,payments,comments);toast('Excel completo descargado.');}catch(err){handleError(err);}finally{if(b.isConnected){b.disabled=false;b.textContent='Descargar Excel completo';}}});
  $('#refresh')?.addEventListener('click',async e=>{e.target.disabled=true;try{await refresh();render();toast('Lista actualizada.');}catch(err){handleError(err);}finally{e.target.disabled=false;}});
  $('#reset-demo')?.addEventListener('click',()=>confirmAction('¿Restaurar la demostración?','Se reemplazarán los registros de prueba de este navegador.',async()=>{await resetDemo();await refresh();render();toast('Demostración restaurada.');}));
}
function wireActions(scope) {
  scope.querySelectorAll('[data-renew]').forEach(b=>b.onclick=()=>paymentDialog(Number(b.dataset.renew)));
  scope.querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>{view='clients';areaFilter='all';filter=b.dataset.status;query='';render();});
  scope.querySelectorAll('[data-payment]').forEach(b=>b.onclick=()=>paymentDialog());
  scope.querySelectorAll('[data-create]').forEach(b=>b.onclick=()=>{openDialog(`<p class="eyebrow">NUEVO MIEMBRO</p><h2>Registrar miembro</h2>${form()}`);dialog.classList.add('registration-dialog');wireForm(dialog,{},true);});
  scope.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>details(Number(b.dataset.view)));
  scope.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(Number(b.dataset.edit)));
  scope.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{const m=members.find(x=>x.id===+b.dataset.delete);confirmAction('¿Eliminar miembro?',`Se eliminará el registro de ${m.name}. Esta acción no se puede deshacer.`,async()=>{await deleteMember(m.id);await refresh();render();toast('Miembro eliminado.');});});
  scope.querySelectorAll('[data-area-filter]').forEach(b=>b.onclick=()=>{view='clients';areaFilter=b.dataset.areaFilter;filter='all';render();});
  scope.querySelector('[data-go-subs]')?.addEventListener('click',()=>{view='subscriptions';filter='soon';render();});
}
function openDialog(html) { dialog.classList.remove('payment-simple','registration-dialog'); dialog.innerHTML=`<button class="dialog-close icon-button" aria-label="Cerrar">×</button>${html}`; if(!dialog.open)dialog.showModal();document.body.classList.add('modal-open');dialog.querySelector('.dialog-close').onclick=()=>dialog.close(); }
dialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));
function edit(id, renew=false) { const m=members.find(x=>x.id===id);openDialog(`<p class="eyebrow">MIEMBRO #${m.id}</p><h2>${renew?'Renovar membresía':'Editar miembro'}</h2>${renew?'<p class="renew-note">Inicia un nuevo periodo desde la fecha elegida. Se reemplazará el periodo anterior.</p>':''}${form(renew?{...m,start:today(),months:1}:m)}`);wireForm(dialog,m,true); }
function wireForm(scope,member,isDialog) {
  const f=scope.querySelector('#member-form');
  function preview(){const start=f.elements.start.value,months=Number(f.elements.months.value);if(!start)return;try{scope.querySelector('#form-preview').innerHTML=`<span>VENCIMIENTO PREVISTO</span><strong>${dateLabel(member.paid_until && start===member.start && months===member.months ? member.paid_until : periodEnd(start,months))}</strong>`;}catch{scope.querySelector('#form-preview').textContent='Revisa la fecha.';}}
  f.elements.start.onchange=preview;f.elements.months.onchange=preview;preview();
  f.querySelector('[data-cancel]').onclick=()=>{if(isDialog)dialog.close();else{view='dashboard';render();}};
  f.onsubmit=async e=>{e.preventDefault();const button=f.querySelector('[type=submit]');button.disabled=true;scope.querySelector('#save-error').textContent='';try{const data=Object.fromEntries(new FormData(f));if(member.id)data.id=member.id;const saved=await saveMember(data);await refresh();if(isDialog)dialog.close();if(!member.id)view='dashboard';filter='all';areaFilter='all';query='';render();toast(member.id?'Cambios guardados.':'Miembro registrado. Ya puede consultar con su nombre completo.');}catch(err){scope.querySelector('#save-error').textContent=err.message;}finally{button.disabled=false;}};
}
function details(id) { const m=members.find(x=>x.id===id),s=membership(m);openDialog(`<p class="eyebrow">MIEMBRO #${id}</p><h2>${esc(m.name)}</h2>${badge(m)}<dl class="detail-grid"><div><dt>Modalidad</dt><dd>${areaName(m.area)}</dd></div><div><dt>Edad</dt><dd>${m.age == null ? 'Sin registrar' : esc(m.age) + ' años'}</dd></div><div><dt>Inicio</dt><dd>${dateLabel(m.start)}</dd></div><div><dt>Vencimiento</dt><dd>${dateLabel(s.end)}</dd></div></dl><div class="access-card"><p class="eyebrow">ACCESO PERSONAL AL PORTAL</p><div><strong>${esc(m.name)}</strong><button class="subtle" id="copy-code">Copiar acceso</button></div><small>Consulta con este nombre completo; no se requiere código.</small></div><div class="form-actions"><button class="button secondary" data-delete="${id}">Eliminar miembro</button><button class="button secondary" id="detail-edit">Editar datos</button><button class="button" id="detail-renew">Registrar pago y renovar</button></div>`);wireActions(dialog);$('#detail-edit').onclick=()=>edit(id);$('#detail-renew').onclick=()=>paymentDialog(id);$('#copy-code').onclick=async()=>{try{await navigator.clipboard.writeText(`IRON PANTHERS\nConsulta tu membresía con el nombre: ${m.name}\nPortal: ${location.origin}/#membresia`);toast('Acceso copiado.');}catch{toast('Selecciona y copia el nombre que aparece en pantalla.');}}; }
function confirmAction(title,description,action){openDialog(`<h2>${esc(title)}</h2><p class="confirm-description">${esc(description)}</p><p class="form-error" id="confirm-error" role="alert"></p><div class="form-actions"><button class="button secondary" id="confirm-cancel">Cancelar</button><button class="button" id="confirm-yes">Confirmar</button></div>`);$('#confirm-cancel').onclick=()=>dialog.close();$('#confirm-yes').onclick=async e=>{e.target.disabled=true;try{await action();dialog.close();}catch(err){$('#confirm-error').textContent=err.message;}finally{e.target.disabled=false;}};}
function handleError(e){if(e.status===401)login('Tu sesión terminó. Vuelve a entrar.');else toast(e.message);}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('sidebar-open');$('#sidebar-toggle')?.setAttribute('aria-expanded','false');}});
async function start(){try{config=await getConfig();if(config.mode==='demo'){if(sessionStorage.getItem('iron_demo_entered'))await openApp();else login();}else{const s=await api('session');s.authenticated?await openApp():login();}}catch(e){root.innerHTML=`<main class="loading-screen"><h1>No se pudo conectar</h1><p>${esc(e.message)}</p><button class="button" id="retry-start">Reintentar</button><a href="/">Volver al portal</a></main>`;$('#retry-start').onclick=start;}}
start();

let inboxRequest = 0;
async function loadInbox() {
  const token = ++inboxRequest, container = document.querySelector('#comments-inbox');
  if (!container) return;
  container.textContent = 'Cargando comentarios…';
  try {
    const comments = await listComments();
    if (token !== inboxRequest || !container.isConnected) return;
    container.innerHTML = comments.length ? comments.map(c => `<article class="admin-card inbox-card"><div class="card-heading"><h2>${esc(c.name || 'Anónimo')}</h2><span class="badge ${c.reviewed ? 'active' : 'soon'}">${c.reviewed ? 'Leído' : 'Nuevo'}</span></div><p class="inbox-date">${esc(new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'}).format(new Date(c.created_at)))}</p><p class="inbox-message">${esc(c.message)}</p>${c.example ? '<p class="example-label">Ejemplo ficticio · Demostración</p>' : ''}<div class="inbox-actions">${c.reviewed ? '' : `<button class="button secondary small" data-review="${esc(c.id)}">Marcar como leído</button>`}<button class="button secondary small delete-comment" data-delete-comment="${esc(c.id)}">Eliminar comentario</button></div></article>`).join('') : '<section class="admin-card empty"><h2>Aún no hay comentarios</h2><p>Los mensajes enviados desde el portal aparecerán aquí.</p></section>';
    container.querySelectorAll('[data-delete-comment]').forEach(button => button.onclick = async () => {
      if(!window.confirm('¿Eliminar este comentario? No se puede recuperar.')) return;
      button.disabled=true;
      try { await deleteComment(button.dataset.deleteComment); if(view==='comments') await loadInbox(); toast('Comentario eliminado.'); }
      catch(e) { toast(e.message); button.disabled=false; }
    });
    container.querySelectorAll('[data-review]').forEach(button => button.onclick = async () => {
      button.disabled = true;
      try { await reviewComment(button.dataset.review); if(view === 'comments') await loadInbox(); }
      catch (e) { toast(e.message); button.disabled = false; }
    });
  } catch (e) { container.textContent = e.message; }
}

const money=value=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(value);
function paymentsPage(){return `<div class="admin-title"><div><p class="eyebrow">RECEPCIÓN</p><h1>Pagos y renovaciones</h1><p>Registra el cobro recibido y actualiza la membresía en un solo paso.</p></div><button class="button" id="new-payment">+ Registrar pago</button></div><section class="admin-card"><p class="renew-note">Este registro no realiza cargos bancarios. Conserva aquí el historial de los pagos que recibes.</p><div id="payment-list" aria-live="polite">Cargando historial…</div></section>`;}
async function loadPayments(){const el=$('#payment-list');try{const list=await listPayments();if(!el?.isConnected)return;el.innerHTML=list.length?`<div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Miembro</th><th>Importe</th><th>Forma de pago</th><th>Periodo</th></tr></thead><tbody>${list.map(p=>`<tr><td>${esc(new Intl.DateTimeFormat('es-MX',{dateStyle:'short',timeZone:'America/Mexico_City'}).format(new Date(p.created_at)))}</td><td>${esc(p.member_name)}</td><td>${money(p.amount)}</td><td>${esc(p.method)}</td><td>${dateLabel(p.start)} — ${dateLabel(periodEnd(p.start,p.months))}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><h3>Aún no hay pagos registrados</h3><p>Los pagos nuevos aparecerán aquí. Las membresías anteriores se conservan.</p></div>';}catch(e){if(el?.isConnected)el.textContent=e.message;}}
function paymentDialog(id){
 if(!members.length){toast('Registra primero al miembro.');return;}
 const m=members.find(m=>m.id===id)||members[0],requestId=crypto.randomUUID();
 let busy=false,selectionVersion=0;
 openDialog(`<h2>Pago y renovación</h2><form id="payment-form" class="member-form">${id?`<input type="hidden" name="member_id" value="${m.id}">`:`<label for="pay-member">Seleccionar miembro</label><select id="pay-member" name="member_id">${members.map(x=>`<option value="${x.id}" ${x.id===m.id?'selected':''}>${esc(x.name)} · #${x.id}</option>`).join('')}</select>`}<h3 class="payment-member-name" id="payment-member-name">${esc(m.name)}</h3><fieldset id="payment-controls" disabled><div class="payment-top-row"><div><label for="pay-amount">Importe recibido (MXN)</label><input id="pay-amount" name="amount" type="number" min="0.01" max="1000000" step="0.01" value="600" required></div><fieldset class="payment-area"><legend class="sr-only">Modalidad</legend>${[['gym','Iron Gym'],['cf','Iron Cross']].map(([key,label])=>`<label><input type="radio" name="area" value="${key}" ${m.area===key?'checked':''}><span>${label}</span></label>`).join('')}</fieldset></div><label class="duration-label" for="pay-months">Duración</label><select id="pay-months" name="months">${[0,1,3,6,12].map(n=>`<option value="${n}">${durationLabel(n)}</option>`).join('')}</select><details class="payment-options"><summary>Fecha de inicio y forma de pago</summary><div class="form-grid"><div><label for="pay-start">Inicio del periodo</label><input id="pay-start" name="start" type="date" min="2000-01-01" max="2100-12-31" required></div><div><label for="pay-method">Forma de pago</label><select id="pay-method" name="method"><option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option></select></div></div></details></fieldset><p class="renew-note" id="payment-note">Consultando la vigencia actual…</p><div id="payment-preview" class="form-preview" aria-live="polite">Calculando nuevo vencimiento…</div><p id="payment-error" class="form-error" role="alert"></p><button type="button" class="subtle" id="retry-payment" hidden>Volver a consultar</button><div class="form-actions"><button class="button" type="submit" disabled>Guardar</button></div></form>`);
 dialog.classList.add('payment-simple');
 const f=$('#payment-form'),submit=f.querySelector('[type=submit]'),controls=$('#payment-controls'),error=$('#payment-error');
 const preview=()=>{try{$('#payment-preview').textContent='Nuevo vencimiento: '+dateLabel(periodEnd(f.elements.start.value,Number(f.elements.months.value)));}catch{$('#payment-preview').textContent='Revisa la fecha.';}};
 const setStart=async()=>{const version=++selectionVersion;submit.disabled=true;controls.disabled=true;error.textContent='';$('#retry-payment').hidden=true;try{const member=members.find(x=>x.id===Number(f.elements.member_id.value)),payments=await listPayments(),period=paymentPeriod(member,payments);if(version!==selectionVersion||!f.isConnected)return;$('#payment-member-name').textContent=member.name;f.elements.area.value=member.area;f.elements.start.value=period.start;f.elements.months.value=String(period.months);f.elements.amount.value=period.months===0?'':'600';$('#payment-note').textContent=payments.some(p=>Number(p.member_id)===member.id)?'Si la membresía sigue vigente, el periodo inicia al terminar la vigencia actual para conservar los días pendientes. Puedes cambiar la fecha.':'Primer pago: registra el periodo del alta sin agregar tiempo extra. Puedes ajustar la duración y la fecha.';preview();submit.disabled=false;controls.disabled=false;}catch(e){if(f.isConnected){error.textContent=e.message;$('#retry-payment').hidden=false;}}};
 f.elements.member_id.onchange=setStart;$('#retry-payment').onclick=setStart;f.elements.start.onchange=preview;f.elements.months.onchange=()=>{f.elements.amount.value=Number(f.elements.months.value)===0?'':'600';f.elements.amount.placeholder=Number(f.elements.months.value)===0?'Importe semanal':'';preview();};setStart();
 const preventClose=e=>{if(busy)e.preventDefault();};dialog.addEventListener('cancel',preventClose);dialog.addEventListener('close',()=>dialog.removeEventListener('cancel',preventClose),{once:true});
 f.onsubmit=async e=>{e.preventDefault();if(busy||submit.disabled)return;const data=Object.fromEntries(new FormData(f)),member=members.find(x=>x.id===Number(data.member_id));busy=true;submit.disabled=true;controls.disabled=true;dialog.querySelector('.dialog-close').disabled=true;error.textContent='';submit.textContent='Guardando…';try{if(data.area!==member.area){await saveMember({...member,area:data.area});member.area=data.area;}await recordPayment({...data,id:requestId});busy=false;dialog.close();try{await refresh();render();toast('Pago guardado. Membresía actualizada.');}catch{toast('Pago guardado. Actualiza la lista para consultar la nueva vigencia.');}}catch(e){error.textContent=e.message;}finally{busy=false;if(f.isConnected){submit.disabled=false;controls.disabled=false;dialog.querySelector('.dialog-close').disabled=false;submit.textContent='Guardar';}}};
}
async function loadCommentSummary(){const el=$('#comment-summary');try{const comments=await listComments();if(!el?.isConnected)return;const count=comments.filter(c=>!c.reviewed).length;el.innerHTML=`<div class="card-heading"><h2>Comentarios nuevos</h2><strong>${count}</strong></div><button class="button secondary small" id="open-inbox">Abrir buzón</button>`;$('#open-inbox').onclick=()=>{view='comments';render();};}catch(e){if(el?.isConnected)el.textContent=e.message;}}
 // Actualiza el buzón mientras recepción lo tiene abierto.
setInterval(()=>{if(document.visibilityState==='visible'&&$('#admin-main')&&!dialog.open){if(view==='comments')loadInbox();if(view==='dashboard')refreshReception();}},60000);