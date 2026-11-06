import './plans.css';

const dialog = document.querySelector('#plans-dialog');
const plans = [
  { name: 'General', price: '550', unit: 'por mes', note: 'Tu constancia empieza aquí.', details: ['Mensualidad individual', 'Mismo precio para Gym y CrossFit'], featured: true },
  { name: 'Estudiantes', price: '500', unit: 'por mes', note: 'También entrena por tus metas.', details: ['Tarifa para estudiantes', 'Mismo precio para Gym y CrossFit'] },
  { name: 'En pareja', price: '1,000', unit: 'por mes · total por 2 personas', note: 'Compartan el esfuerzo.', details: ['Mensualidad para 2 personas', 'Equivale a $500 por persona'] },
  { name: 'Grupal', price: '470', unit: 'por persona / mes', note: 'La fuerza se comparte.', details: ['Desde 3 personas en adelante', 'Mismo precio para Gym y CrossFit'] },
  { name: 'Semana', price: '150', unit: 'por semana', note: 'Una semana para darlo todo.', details: ['Plan semanal', 'Mismo precio para Gym y CrossFit'] },
  { name: '3 visitas', price: '130', unit: 'por paquete', note: 'Tres oportunidades de avanzar.', details: ['Incluye 3 visitas', 'Úsalas en la misma semana'] },
  { name: 'Visita', price: '50', unit: 'por visita', note: 'Tu siguiente paso empieza hoy.', details: ['Una visita', 'Mismo precio para Gym y CrossFit'] },
];

plans.forEach((plan, index) => {
  const card = document.createElement('article');
  card.className = `plan-card${plan.featured ? ' plan-card-featured' : ''}`;
  card.innerHTML = `<span class="plan-number" aria-hidden="true">${String(index < 4 ? index + 1 : index - 3).padStart(2, '0')} / IRON</span>
    <h3>${plan.name}</h3><p class="plan-note">${plan.note}</p>
    <p class="plan-price">$${plan.price}</p><p class="plan-unit">${plan.unit}</p>
    <ul>${plan.details.map(detail => `<li>${detail}</li>`).join('')}</ul>`;
  document.querySelector(index < 4 ? '#monthly-plans' : '#visits-plans').append(card);
});

const tabs = [...dialog.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  tabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + 1) % tabs.length];
    selectTab(next);
    next.focus();
  });
});

let opener;
document.querySelectorAll('[data-open-plans]').forEach(button => {
  button.addEventListener('click', () => {
    opener = button;
    selectTab(tabs[0]);
    dialog.showModal();
    dialog.scrollTop = 0;
    document.body.classList.add('modal-open');
  });
});
dialog.querySelector('.plans-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  opener?.focus({ preventScroll: true });
});
