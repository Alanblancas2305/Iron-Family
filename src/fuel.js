import './fuel.css';

const shakes = [
  { name: 'Chocolate', note: 'Intenso. Cremoso. Un clásico.', color: '#c39069', bg: '#35211d' },
  { name: 'Fresa', note: 'Una pausa con mucho sabor.', color: '#ffafb7', bg: '#482229' },
  { name: 'Vainilla', note: 'Suave desde el primer sorbo.', color: '#ebd6a3', bg: '#383326' },
  { name: 'Galleta', note: 'El final que estabas esperando.', color: '#d3c4b7', bg: '#2e2929' },
  { name: 'Capuchino', note: 'Un sabor que se vuelve ritual.', color: '#d5a274', bg: '#39281e' }
];
const pres = [
  { name: 'RYSE', flavor: 'Sour Green Apple', file: 'ryse', color: '#c6e54b', bg: '#203327' },
  { name: 'KAIOKEN', flavor: 'Citrus Dragon', file: 'kaioken', color: '#ffc914', bg: '#45211e' },
  { name: 'ESSENTIAL', flavor: 'Chamoy Mango', file: 'essential', color: '#ffa54b', bg: '#432c20' },
  { name: 'PSYCHOTIC', flavor: 'Grape', file: 'psychotic', color: '#c597e9', bg: '#32253e' }
];
const $ = s => document.querySelector(s);
const fuel = $('#fuel'), pre = $('#preentrenos');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };
const num = n => String(n + 1).padStart(2, '0');
let flavor = -1, product = -1, frame = 0;
let manualFlavor = 0, manualProduct = 0;
const scenes = $('#fuel-scenes');
scenes.innerHTML = shakes.map((s, i) => `<div class="fuel-scene" style="--sprite-x:${i * 25}%;--flavor:${s.color}" aria-hidden="true"><span class="fuel-ghost">${s.name}</span><div class="fuel-composition"><div class="shake-layer layer-splash"></div><div class="shake-layer layer-cup"></div><div class="shake-layer layer-ingredients"></div><div class="shake-layer layer-detail"></div></div><span class="fuel-shadow"></span></div>`).join('');
$('.fuel-selector').innerHTML = shakes.map((s, i) => `<button data-flavor="${i}" aria-label="Malteada de ${s.name}" aria-pressed="${i === 0}"><span>${num(i)}</span><b>${s.name}</b></button>`).join('');
$('.pre-track').innerHTML = pres.map((p, i) => `<article class="pre-slide" style="--pre-color:${p.color};--pre-bg:${p.bg}" aria-label="${p.name}, ${p.flavor}"><span class="pre-number" aria-hidden="true">${num(i)}</span><div class="pre-description"><p class="fuel-kicker">TU SIGUIENTE RITUAL</p><h3>${p.name}</h3><p>${p.flavor}</p></div><div class="pre-product"><div class="pre-ring"></div><i class="pre-ice ice-one"></i><i class="pre-ice ice-two"></i><i class="pre-ice ice-three"></i><img src="/assets/fuel/${p.file}.png" alt="Envase de ${p.name}, ${p.flavor}" width="600" height="600" loading="lazy"></div></article>`).join('');
const sceneNodes = [...document.querySelectorAll('.fuel-scene')];
const productNodes = [...document.querySelectorAll('.pre-slide')];

function selectedFlavor(index) {
  if (flavor === index) return;
  flavor = index;
  const s = shakes[index];
  fuel.style.setProperty('--flavor', s.color);
  fuel.style.setProperty('--scene-bg', s.bg);
  $('#flavor-name').textContent = s.name;
  $('#flavor-note').textContent = s.note;
  $('#flavor-count').textContent = `${num(index)} / 05`;
  scenes.setAttribute('aria-label', `Malteada de ${s.name.toLowerCase()}, presentación ilustrativa`);
  document.querySelectorAll('[data-flavor]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.flavor === index));
}
function selectedProduct(index) {
  if (product === index) return;
  product = index;
  $('#pre-count').textContent = `${num(index)} / 04`;
  $('#pre-prev').disabled = index === 0;
  $('#pre-next').disabled = index === pres.length - 1;
  productNodes.forEach((el, i) => el.setAttribute('aria-hidden', i !== index));
}
// Native document scrolling supplies the timeline. No wheel/touch interception.
function progress(el, count) {
  const r = el.getBoundingClientRect();
  const pin = el.firstElementChild;
  const top = parseFloat(getComputedStyle(pin).top) || 0;
  return clamp((top - r.top) / Math.max(1, el.offsetHeight - pin.offsetHeight)) * (count - .001);
}
function renderShakes(position, still = false) {
  const index = Math.min(4, Math.floor(position));
  selectedFlavor(index);
  sceneNodes.forEach((el, i) => {
    const t = position - i;
    const visible = t >= 0 && t <= 1;
    el.style.visibility = visible ? 'visible' : 'hidden';
    if (!visible) return;
    const assemble = still ? 1 : smooth(t / .48);
    const leave = still || i === shakes.length - 1 ? 0 : smooth((t - .78) / .22);
    el.style.opacity = still ? 1 : smooth(t / .12) * (1 - leave);
    el.style.transform = `translateY(${-leave * 100}px)`;
    el.style.setProperty('--cup-y', `${(1 - assemble) * 115}px`);
    el.style.setProperty('--cup-turn', `${(1 - assemble) * -16 - 8}deg`);
    el.style.setProperty('--splash-scale', .3 + assemble * .7);
    el.style.setProperty('--splash-y', `${(1 - assemble) * -110}px`);
    el.style.setProperty('--ingredient-y', `${(1 - assemble) * -150}px`);
    el.style.setProperty('--ingredient-turn', `${(1 - assemble) * 55 + 15}deg`);
    el.style.setProperty('--detail-x', `${(1 - assemble) * -150}px`);
    el.style.setProperty('--layer-opacity', .15 + assemble * .85);
  });
}
function renderPres(position, still = false) {
  const x = clamp(position - .45, 0, 3);
  const index = Math.round(x);
  selectedProduct(index);
  $('.pre-track').style.transform = `translate3d(${-x * 25}%,0,0)`;
  productNodes.forEach((el, i) => {
    const distance = still ? 0 : clamp(Math.abs(x - i));
    el.style.setProperty('--product-y', `${distance * 90}px`);
    el.style.setProperty('--product-turn', `${(x - i) * -14}deg`);
    el.style.setProperty('--ice-distance', `${distance * 95}px`);
    el.style.setProperty('--ring-scale', 1 - distance * .4);
  });
}
function render() {
  frame = 0;
  if (motion.matches) {
    renderShakes(manualFlavor + .55, true);
    renderPres(manualProduct + .45, true);
  } else {
    renderShakes(progress(fuel, 5));
    renderPres(progress(pre, 4));
  }
}
function schedule() { if (!frame) frame = requestAnimationFrame(render); }
function jump(el, index, count, settle) {
  if (motion.matches) {
    if (el === fuel) manualFlavor = index; else manualProduct = index;
    schedule();
    return;
  }
  const pin = el.firstElementChild, top = parseFloat(getComputedStyle(pin).top) || 0;
  const y = scrollY + el.getBoundingClientRect().top - top + (index + settle) / (count - .001) * (el.offsetHeight - pin.offsetHeight);
  // Direct navigation avoids flying through intervening flavors on a selector click.
  window.scrollTo({ top: y, behavior: 'instant' });
  schedule();
}
$('.fuel-selector').addEventListener('click', e => {
  const b = e.target.closest('[data-flavor]');
  if (b) jump(fuel, +b.dataset.flavor, 5, .55);
});
$('.fuel-selector').addEventListener('keydown', e => {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? 4 : clamp(flavor + (e.key === 'ArrowDown' ? 1 : -1), 0, 4);
  jump(fuel, next, 5, .55);
  document.querySelector(`[data-flavor="${next}"]`).focus({ preventScroll: true });
});
$('#pre-prev').onclick = () => jump(pre, clamp(product - 1, 0, 3), 4, .45);
$('#pre-next').onclick = () => jump(pre, clamp(product + 1, 0, 3), 4, .45);
$('.pre-window').addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  e.preventDefault(); jump(pre, clamp(product + (e.key === 'ArrowRight' ? 1 : -1), 0, 3), 4, .45);
});
let touch;
$('.pre-window').addEventListener('touchstart', e => { touch = [e.changedTouches[0].clientX, e.changedTouches[0].clientY]; }, { passive: true });
$('.pre-window').addEventListener('touchend', e => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch[0], dy = e.changedTouches[0].clientY - touch[1];
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) jump(pre, clamp(product + (dx < 0 ? 1 : -1), 0, 3), 4, .45);
  touch = null;
}, { passive: true });
document.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-size]').forEach(other => other.setAttribute('aria-pressed', other === b));
}));
window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', schedule, { passive: true });
motion.addEventListener('change', schedule);
document.fonts.ready.then(schedule);
fuel.classList.add('fuel-ready'); pre.classList.add('fuel-ready');
render();
