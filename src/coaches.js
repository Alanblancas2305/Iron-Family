import './coaches.css';

const carousel = document.querySelector('.coach-carousel');
if (carousel) {
  const lineup = carousel.querySelector('.coach-lineup');
  const coaches = [...carousel.querySelectorAll('.coach-portrait')];
  const dots = [...carousel.querySelectorAll('.coach-dots button')];
  const prev = carousel.querySelector('.coach-prev');
  const next = carousel.querySelector('.coach-next');
  const status = carousel.querySelector('.coach-status');
  let selected = 0;
  let firstVisible = 0;

  const illuminate = index => {
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
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === selected)));
    prev.disabled = selected === 0;
    next.disabled = selected === coaches.length - 1;
    status.textContent = coaches[selected].querySelector('img').alt + ' seleccionado';
  };
  prev.addEventListener('click', () => select(selected - 1));
  next.addEventListener('click', () => select(selected + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => select(i)));
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
    dots[selected].focus({ preventScroll: true });
  });
  select(0);
}
