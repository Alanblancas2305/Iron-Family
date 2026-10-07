import { getConfig, lookup } from './data.js';
import { membership, dateLabel, escapeHTML as esc, areaName } from './shared.js';
const $ = s => document.querySelector(s);
$('#year').textContent = new Date().getFullYear();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion && 'IntersectionObserver' in window) {
  document.body.classList.add('motion');
  const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }), { threshold: .08 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
$('.menu-toggle').addEventListener('click', () => { const open = $('.menu-toggle').getAttribute('aria-expanded') !== 'true'; $('.menu-toggle').setAttribute('aria-expanded', open); $('.menu-toggle').setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú'); $('#mobile-nav').hidden = !open; });
$('#mobile-nav').addEventListener('click', e => { if (e.target.closest('a')) { $('#mobile-nav').hidden = true; $('.menu-toggle').setAttribute('aria-expanded', 'false'); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#mobile-nav').hidden) { $('#mobile-nav').hidden = true; $('.menu-toggle').setAttribute('aria-expanded', 'false'); $('.menu-toggle').focus(); } });
const gallery = $('#gallery-dialog');
const areas = {
  gym: { title: 'IRON GYM', label: 'FUERZA A TU RITMO', img: 'gym.jpg', desc: 'Tu espacio para construir fuerza, dominar la técnica y avanzar a tu manera. Cada repetición cuenta.', features: ['Zona de máquinas y poleas', 'Mancuernas, barras y peso libre', 'Entrenamiento a tu propio ritmo'] },
  cf: { title: 'IRON CROSS', label: 'LA ENERGÍA SE CONTAGIA', img: 'cross.jpg', desc: 'Entrenamiento funcional que combina fuerza y movimiento. Comparte el esfuerzo y celebra cada avance en equipo.', features: ['Fuerza y acondicionamiento', 'Movimientos funcionales', 'Sesiones guiadas en comunidad'] }
};
document.querySelectorAll('[data-gallery]').forEach(button => button.addEventListener('click', () => {
  const a = areas[button.dataset.gallery]; $('#gallery-photo').src = '/assets/' + a.img; $('#gallery-photo').alt = a.title + ', fotografía ilustrativa'; $('#gallery-title').textContent = a.title; $('#gallery-eyebrow').textContent = a.label; $('#gallery-description').textContent = a.desc; $('#gallery-features').innerHTML = a.features.map(f => `<li>${f}</li>`).join(''); gallery.showModal(); document.body.classList.add('modal-open');
}));
gallery.querySelector('.dialog-close').onclick = () => gallery.close();
gallery.addEventListener('click', e => { if (e.target === gallery) { const r = gallery.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) gallery.close(); } });
gallery.addEventListener('close', () => document.body.classList.remove('modal-open'));
$('#gallery-membership').onclick = () => { gallery.close(); $('#membresia').scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth' }); $('#member-id').focus({ preventScroll: true }); };
const flavors = [
  ['Chocolate', 'Un clásico que siempre se antoja.'], ['Fresa', 'Tu pausa más fresca.'], ['Vainilla', 'Suave, cremosa y a tu ritmo.'], ['Galleta', 'Tu sabor favorito, después del esfuerzo.'], ['Capuchino', 'El sabor que le va a tu ritual.']
];
let current = 0, timer;
$('.flavor-tabs').innerHTML = flavors.map(([name], i) => `<button data-flavor="${i}" aria-pressed="${i === 0}">${name}</button>`).join('');
function setFlavor(index) {
  current = (index + flavors.length) % flavors.length;
  const [name, note] = flavors[current];
  $('#flavor-name').textContent = name; $('#flavor-note').textContent = note; $('#flavor-count').textContent = `0${current + 1} / 05`;
  document.querySelectorAll('[data-flavor]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.flavor === current));
  $('#shake-photo').setAttribute('aria-label', `Malteada de ${name.toLowerCase()}, imagen ilustrativa`);
  clearTimeout(timer); $('#shake-photo').classList.add('changing');
  timer = setTimeout(() => { $('#shake-photo').style.backgroundPosition = (current * 25) + '% 50%'; $('#shake-photo').classList.remove('changing'); }, reduceMotion ? 0 : 160);
}
$('#shake-prev').onclick = () => setFlavor(current - 1); $('#shake-next').onclick = () => setFlavor(current + 1);
$('.flavor-tabs').addEventListener('click', e => { const b = e.target.closest('[data-flavor]'); if (b) setFlavor(+b.dataset.flavor); });
$('.shake-carousel').addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setFlavor(current + (e.key === 'ArrowRight' ? 1 : -1)); } });
let touchX, touchY;
$('.shake-stage').addEventListener('touchstart', e => { touchX = e.changedTouches[0].clientX; touchY = e.changedTouches[0].clientY; }, { passive: true });
$('.shake-stage').addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) setFlavor(current + (dx < 0 ? 1 : -1)); }, { passive: true });
document.querySelectorAll('[data-size]').forEach(button => button.onclick = () => { document.querySelectorAll('[data-size]').forEach(b => { const selected = b === button; b.classList.toggle('active', selected); b.setAttribute('aria-pressed', selected); }); $('#shake-price').innerHTML = (button.dataset.size === 'small' ? '$25' : '$35') + '<small>MXN</small>'; });
$('.show-password').onclick = () => { const input = $('#member-code'), show = input.type === 'password'; input.type = show ? 'text' : 'password'; $('.show-password').textContent = show ? 'Ocultar' : 'Ver'; $('.show-password').setAttribute('aria-label', show ? 'Ocultar código' : 'Mostrar código'); };
getConfig().then(c => { $('#demo-hint').hidden = c.mode !== 'demo'; }).catch(() => {});
$('#membership-form').addEventListener('submit', async e => {
  e.preventDefault(); const button = e.target.querySelector('[type=submit]'); button.disabled = true; button.textContent = 'Consultando…'; $('#membership-error').textContent = '';
  try {
    const member = await lookup($('#member-id').value, $('#member-code').value), m = membership(member);
    const main = m.state === 'pending' ? 'PRÓXIMO INICIO' : m.days < 0 ? 'VENCIÓ HACE' : m.days === 0 ? 'VENCE' : 'TE QUEDAN';
    $('#membership-result').innerHTML = `<div class="result-card"><span class="badge ${m.state}">${m.label}</span><p class="result-name">${esc(member.name)}</p><p class="eyebrow" style="margin:20px 0 0">${main}</p><div class="result-days">${m.state === 'pending' ? dateLabel(member.start) : m.days === 0 ? 'Hoy' : Math.abs(m.days)}${m.days !== 0 && m.state !== 'pending' ? '<small>días</small>' : ''}</div><div class="progress"><span style="width:${m.progress}%"></span></div><dl class="result-facts"><div><dt>MODALIDAD</dt><dd>${areaName(member.area)}</dd></div><div><dt>SOCIO</dt><dd>#${member.id}</dd></div><div><dt>INICIO</dt><dd>${dateLabel(member.start)}</dd></div><div><dt>VENCIMIENTO</dt><dd>${dateLabel(m.end)}</dd></div></dl><p class="result-note">${m.state === 'expired' || m.state === 'soon' ? 'Renueva en recepción y sigue entrenando con la familia.' : m.state === 'pending' ? 'Tu membresía estará lista en la fecha de inicio.' : 'Todo listo. Nos vemos en tu próximo entrenamiento.'}</p><button class="button secondary full" id="new-query">Nueva consulta</button></div>`;
    e.target.hidden = true; $('#membership-result').hidden = false;
    $('#new-query').onclick = () => { $('#membership-result').hidden = true; $('#membership-result').replaceChildren(); e.target.hidden = false; $('#member-code').value = ''; $('#member-id').focus(); };
    $('#new-query').focus({ preventScroll: true });
  } catch (err) { $('#membership-error').textContent = err.name === 'TimeoutError' ? 'La consulta tardó demasiado. Inténtalo de nuevo.' : err.message; }
  finally { button.disabled = false; button.textContent = 'Consultar mi membresía'; }
});
