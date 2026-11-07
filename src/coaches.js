import './coaches.css';

const lineup = document.querySelector('.coach-lineup');
if (lineup) {
  const coaches = [...lineup.querySelectorAll('.coach-portrait')];
  let selected = coaches[1];
  const illuminate = coach => {
    coaches.forEach(item => {
      const active = item === coach;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
  };
  coaches.forEach(coach => {
    coach.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') illuminate(coach);
    });
    coach.addEventListener('click', () => {
      selected = coach;
      illuminate(coach);
    });
    coach.addEventListener('focus', () => illuminate(coach));
  });
  lineup.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') illuminate(selected);
  });
  lineup.addEventListener('focusout', event => {
    if (!lineup.contains(event.relatedTarget)) illuminate(selected);
  });
}
