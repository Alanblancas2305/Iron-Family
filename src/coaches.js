import './coaches.css';

const carousel = document.querySelector('.coach-carousel');
if (carousel) {
  const lineup = carousel.querySelector('.coach-lineup');
  const coaches = [...carousel.querySelectorAll('.coach-portrait')];
  const namePanel = carousel.querySelector('.coach-name');
  const names = ['Edgar', 'Valeria', 'Joshua', 'Carla'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let shownName = '';
  let nameAnimation;
  const prev = carousel.querySelector('.coach-prev');
  const next = carousel.querySelector('.coach-next');
  const status = carousel.querySelector('.coach-status');
  let selected = 0;
  let firstVisible = 0;

  const illuminate = index => {
    const name = names[index];
    if (shownName !== name) {
      shownName = name;
      namePanel.textContent = name.toUpperCase();
      nameAnimation?.cancel();
      if (!reduced.matches) nameAnimation = namePanel.animate([
        { opacity: 0, transform: 'translateY(22px)', filter: 'blur(5px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }
      ], { duration: 550, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    coaches.forEach((coach, i) => {
      coach.classList.toggle('is-active', i === index);
      coach.setAttribute('aria-pressed', String(i === index));
    });
  };
  const select = (index, move = true) => {
    selected = Math.max(0, Math.min(coaches.length - 1, index));
    if (move) firstVisible = Math.min(selected, coaches.length - 2);
    lineup.style.transform = `translateX(-${firstVisible * 50}%)`;
    coaches.forEach((coach, i) => {
      coach.inert = i < firstVisible || i > firstVisible + 1;
    });
    illuminate(selected);
    prev.disabled = selected === 0;
    next.disabled = selected === coaches.length - 1;
    status.textContent = coaches[selected].querySelector('img').alt + ' seleccionado';
  };
  prev.addEventListener('click', () => select(selected - 1));
  next.addEventListener('click', () => select(selected + 1));
  coaches.forEach((coach, i) => {
    coach.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') illuminate(i);
    });
    coach.addEventListener('click', () => select(i, false));
    coach.addEventListener('focus', () => illuminate(i));
  });
  lineup.addEventListener('pointerleave', () => illuminate(selected));
  lineup.addEventListener('focusout', event => {
    if (!lineup.contains(event.relatedTarget)) illuminate(selected);
  });
  carousel.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    select(selected + (event.key === 'ArrowRight' ? 1 : -1));
    coaches[selected].focus({ preventScroll: true });
  });
  select(0);
}
