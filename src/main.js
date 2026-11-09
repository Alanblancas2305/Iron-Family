import './hero.js';
import './fuel.js';
import './mobile.css';
import './coaches.js';
import './plans.js';
import './comments.js';
import { getConfig, lookup } from './data.js';
import { membership, dateLabel, escapeHTML as esc, areaName, remainingLabel } from './shared.js';
const $ = s => document.querySelector(s);
$('#year').textContent = new Date().getFullYear();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion && 'IntersectionObserver' in window) {
  document.body.classList.add('motion');
  const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }), { threshold: .08 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
const menuToggle = $('.menu-toggle');
const mobileNav = $('#mobile-nav');
function setMenuOpen(open) {
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  mobileNav.hidden = !open;
}
menuToggle.addEventListener('click', () => setMenuOpen(mobileNav.hidden));
mobileNav.addEventListener('click', e => { if (e.target.closest('a')) setMenuOpen(false); });
document.addEventListener('click', e => {
  if (!mobileNav.hidden && !mobileNav.contains(e.target) && !menuToggle.contains(e.target)) setMenuOpen(false);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !mobileNav.hidden) { setMenuOpen(false); menuToggle.focus(); }
});
import './installations.js';

getConfig().then(c => { $('#demo-hint').hidden = c.mode !== 'demo'; }).catch(() => {});
$('#membership-form').addEventListener('submit', async e => {
  e.preventDefault(); const button = e.target.querySelector('[type=submit]'); button.disabled = true; button.textContent = 'Consultando…'; $('#membership-error').textContent = '';
  try {
    const member = await lookup($('#member-name').value), m = membership(member);
    const main = m.state === 'pending' ? 'PRÓXIMO INICIO' : m.days < 0 ? 'VENCIÓ HACE' : m.days === 0 ? 'VENCE' : 'TE QUEDAN';
    $('#membership-result').innerHTML = `<div class="result-card"><span class="badge ${m.state}">${m.label}</span><p class="result-name">${esc(member.name)}</p><p class="eyebrow" style="margin:20px 0 0">${main}</p><div class="result-days">${m.state === 'pending' ? dateLabel(member.start) : m.days === 0 ? 'Hoy' : Math.abs(m.days)}${m.days !== 0 && m.state !== 'pending' ? '<small>días</small>' : ''}</div><p class="remaining-months">${m.state === 'pending' ? member.months + (member.months === 1 ? ' mes contratado' : ' meses contratados') : m.days > 0 ? remainingLabel(m.end) : ''}</p><div class="progress"><span style="width:${m.progress}%"></span></div><dl class="result-facts"><div><dt>MODALIDAD</dt><dd>${areaName(member.area)}</dd></div><div><dt>MIEMBRO</dt><dd>#${member.id}</dd></div><div><dt>INICIO</dt><dd>${dateLabel(member.start)}</dd></div><div><dt>VENCIMIENTO</dt><dd>${dateLabel(m.end)}</dd></div></dl><p class="result-note">${m.state === 'expired' || m.state === 'soon' ? 'Renueva en recepción y sigue entrenando con la familia.' : m.state === 'pending' ? 'Tu membresía estará lista en la fecha de inicio.' : 'Todo listo. Nos vemos en tu próximo entrenamiento.'}</p><button class="button secondary full" id="new-query">Nueva consulta</button></div>`;
    e.target.hidden = true; $('#membership-result').hidden = false;
    $('#new-query').onclick = () => { $('#membership-result').hidden = true; $('#membership-result').replaceChildren(); e.target.reset(); $('#member-name').value = ''; $('#membership-error').textContent = ''; e.target.hidden = false; $('#member-name').focus(); };
    $('#new-query').focus({ preventScroll: true });
  } catch (err) { $('#membership-error').textContent = err.name === 'TimeoutError' ? 'La consulta tardó demasiado. Inténtalo de nuevo.' : err.message; }
  finally { button.disabled = false; button.textContent = 'Consultar mi membresía'; }
});

import './public-theme.css';
