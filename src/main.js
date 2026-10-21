import './hero.js';
import './fuel.js';
import './mobile.css';
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
$('.menu-toggle').addEventListener('click', () => { const open = $('.menu-toggle').getAttribute('aria-expanded') !== 'true'; $('.menu-toggle').setAttribute('aria-expanded', open); $('.menu-toggle').setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú'); $('#mobile-nav').hidden = !open; });
$('#mobile-nav').addEventListener('click', e => { if (e.target.closest('a')) { $('#mobile-nav').hidden = true; $('.menu-toggle').setAttribute('aria-expanded', 'false'); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#mobile-nav').hidden) { $('#mobile-nav').hidden = true; $('.menu-toggle').setAttribute('aria-expanded', 'false'); $('.menu-toggle').focus(); } });
const gallery = $('#gallery-dialog');
const collage = $('#gallery-collage');

const gymPhotos = [
  'principal.jpeg',
  'gym-01.jpeg',
  'gym-02.jpeg',
  'gym-03.jpeg',
  'gym-04.jpeg',
  'gym-05.jpeg',
  'gym-06.jpeg'
];

const areas = {
  gym: {
    title: 'IRON GYM',
    label: 'CONOCE NUESTRAS INSTALACIONES',
    desc:
      'Un espacio para entrenar a tu ritmo, construir fuerza ' +
      'y seguir avanzando. Conoce nuestras instalaciones reales ' +
      'y encuentra tu próximo lugar de entrenamiento.',
    features: [
      'Zona de máquinas y poleas',
      'Mancuernas, barras y peso libre',
      'Entrenamiento a tu propio ritmo'
    ],
    photos: gymPhotos.map((filename, index) => ({
      src: '/images/instalaciones/' + filename,
      alt: index === 0
        ? 'Vista principal de las instalaciones de IRON GYM'
        : 'Instalaciones de IRON GYM, fotografía ' + index
    })),
    note: ''
  },

  cf: {
    title: 'IRON CROSS',
    label: 'LA ENERGÍA SE CONTAGIA',
    desc:
      'Entrenamiento funcional que combina fuerza y movimiento. ' +
      'Comparte el esfuerzo y celebra cada avance en equipo.',
    features: [
      'Fuerza y acondicionamiento',
      'Movimientos funcionales',
      'Sesiones guiadas en comunidad'
    ],
    photos: [
      {
        src: '/assets/cross.jpg',
        alt: 'Imagen ilustrativa de entrenamiento funcional'
      }
    ],
    note:
      'Imagen ilustrativa. Próximamente agregaremos fotografías ' +
      'reales del área de Cross.'
  }
};

document.querySelectorAll('[data-gallery]').forEach(button => {
  button.addEventListener('click', () => {
    const area = areas[button.dataset.gallery];
    if (!area) return;

    collage.replaceChildren();
    collage.classList.toggle(
      'installation-collage--single',
      area.photos.length === 1
    );

    area.photos.forEach((photo, index) => {
      const figure = document.createElement('figure');
      figure.className = index === 0
        ? 'installation-photo installation-photo--main'
        : 'installation-photo';

      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = photo.alt;
      img.loading = index === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';

      figure.append(img);
      collage.append(figure);
    });

    $('#gallery-title').textContent = area.title;
    $('#gallery-eyebrow').textContent = area.label;
    $('#gallery-description').textContent = area.desc;

    const features = $('#gallery-features');
    features.replaceChildren();

    area.features.forEach(text => {
      const item = document.createElement('li');
      item.textContent = text;
      features.append(item);
    });

    const note = $('#gallery-note');
    note.textContent = area.note;
    note.hidden = !area.note;

    gallery.showModal();
    gallery.scrollTop = 0;
    document.body.classList.add('modal-open');
  });
});

gallery.querySelector('.dialog-close').onclick = () => {
  gallery.close();
};

gallery.addEventListener('click', event => {
  if (event.target !== gallery) return;

  const rect = gallery.getBoundingClientRect();
  const outside =
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom;

  if (outside) gallery.close();
});

gallery.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
});

$('#gallery-membership').onclick = () => {
  gallery.close();

  $('#membresia').scrollIntoView({
    behavior: reduceMotion ? 'instant' : 'smooth'
  });

  $('#member-name').focus({ preventScroll: true });
};

getConfig().then(c => { $('#demo-hint').hidden = c.mode !== 'demo'; }).catch(() => {});
$('#membership-form').addEventListener('submit', async e => {
  e.preventDefault(); const button = e.target.querySelector('[type=submit]'); button.disabled = true; button.textContent = 'Consultando…'; $('#membership-error').textContent = '';
  try {
    const member = await lookup($('#member-name').value), m = membership(member);
    const main = m.state === 'pending' ? 'PRÓXIMO INICIO' : m.days < 0 ? 'VENCIÓ HACE' : m.days === 0 ? 'VENCE' : 'TE QUEDAN';
    $('#membership-result').innerHTML = `<div class="result-card"><span class="badge ${m.state}">${m.label}</span><p class="result-name">${esc(member.name)}</p><p class="eyebrow" style="margin:20px 0 0">${main}</p><div class="result-days">${m.state === 'pending' ? dateLabel(member.start) : m.days === 0 ? 'Hoy' : Math.abs(m.days)}${m.days !== 0 && m.state !== 'pending' ? '<small>días</small>' : ''}</div><p class="remaining-months">${m.state === 'pending' ? member.months + (member.months === 1 ? ' mes contratado' : ' meses contratados') : m.days > 0 ? remainingLabel(m.end) : ''}</p><div class="progress"><span style="width:${m.progress}%"></span></div><dl class="result-facts"><div><dt>MODALIDAD</dt><dd>${areaName(member.area)}</dd></div><div><dt>MIEMBRO</dt><dd>#${member.id}</dd></div><div><dt>INICIO</dt><dd>${dateLabel(member.start)}</dd></div><div><dt>VENCIMIENTO</dt><dd>${dateLabel(m.end)}</dd></div></dl><p class="result-note">${m.state === 'expired' || m.state === 'soon' ? 'Renueva en recepción y sigue entrenando con la familia.' : m.state === 'pending' ? 'Tu membresía estará lista en la fecha de inicio.' : 'Todo listo. Nos vemos en tu próximo entrenamiento.'}</p><button class="button secondary full" id="new-query">Nueva consulta</button></div>`;
    e.target.hidden = true; $('#membership-result').hidden = false;
    $('#new-query').onclick = () => { $('#membership-result').hidden = true; $('#membership-result').replaceChildren(); e.target.hidden = false;  $('#member-name').focus(); };
    $('#new-query').focus({ preventScroll: true });
  } catch (err) { $('#membership-error').textContent = err.name === 'TimeoutError' ? 'La consulta tardó demasiado. Inténtalo de nuevo.' : err.message; }
  finally { button.disabled = false; button.textContent = 'Consultar mi membresía'; }
});
