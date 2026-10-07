import './hero.css';

const story = document.querySelector('.panther-story');
if (story) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = story.querySelector('.panther-stage');
  let frame = 0;
  const draw = () => {
    frame = 0;
    const top = innerWidth <= 800 ? 80 : 96;
    const rect = story.getBoundingClientRect();
    const distance = Math.max(1, story.offsetHeight - stage.offsetHeight);
    const progress = reduced.matches ? 0 : Math.min(1, Math.max(0, (top - rect.top) / distance));
    stage.style.setProperty('--travel', progress.toFixed(4));
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
  const configure = () => {
    story.classList.toggle('panther-animated', !reduced.matches);
    schedule();
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  reduced.addEventListener('change', configure);
  configure();
}
