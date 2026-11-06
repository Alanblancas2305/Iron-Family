export const REST_DELAY_MS = 5 * 60 * 1000;
export function shouldEnterRest({ now, lastActivity, eligible, visible, active }) {
  return !active && visible && eligible && now - lastActivity >= REST_DELAY_MS;
}

export function installScreensaver({ canShow, root }) {
  let lastActivity = Date.now(), active = false, previousFocus = null, suppressClickUntil = 0;
  const screen = document.createElement('section');
  screen.id = 'iron-rest';
  screen.hidden = true;
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-label', 'Iron Panthers. Pantalla de reposo. Pulsa cualquier tecla para volver.');
  screen.tabIndex = -1;
  const letters = (word, side) => [...word].map((letter, i) => `<span style="--letter:${i};--side:${side}">${letter}</span>`).join('');
  screen.innerHTML = `<div class="rest-grain" aria-hidden="true"></div><div class="rest-stage" aria-hidden="true"><div class="rest-glow"></div><div class="rest-words"><div class="rest-iron">${letters('IRON', -1)}</div><div class="rest-panthers">${letters('PANTHERS', 1)}</div></div><svg class="rest-claws" viewBox="0 0 600 600" fill="none"><path style="--slash:0" d="M190 90L355 487L329 315Z"/><path style="--slash:1" d="M286 65L431 489L413 303Z"/><path style="--slash:2" d="M378 92L505 453L483 280Z"/></svg><div class="rest-emblem"><div class="rest-ring"></div><img src="/assets/iron-panthers-logo.png" alt="" width="640" height="640"><div class="rest-eye"></div></div><div class="rest-caption"><span>DESDE 2010</span><strong>EL INSTINTO NO DESCANSA.</strong><i></i></div></div><button class="rest-wake" type="button">Mueve el mouse, toca o pulsa una tecla para volver <span aria-hidden="true">↗</span></button>`;
  document.body.append(screen);
  function hide() {
    if (!active) return;
    active = false;
    screen.hidden = true;
    screen.classList.remove('is-running');
    root.inert = false;
    document.body.classList.remove('iron-resting');
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    lastActivity = Date.now();
  }
  function show() {
    if (active || !canShow() || document.visibilityState !== 'visible') return false;
    previousFocus = document.activeElement;
    active = true;
    root.inert = true;
    screen.hidden = false;
    screen.classList.add('is-running');
    document.body.classList.add('iron-resting');
    screen.focus({ preventScroll: true });
    return true;
  }
  function activity(event) {
    lastActivity = Date.now();
    if (event.type === 'click' && lastActivity < suppressClickUntil) {
      event.preventDefault(); event.stopImmediatePropagation(); return;
    }
    if (!active) return;
    if (event.type === 'pointerdown') suppressClickUntil = lastActivity + 600;
    // The wake gesture must not register, delete, or activate a control underneath.
    if (event.type !== 'pointermove') {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    hide();
  }
  for (const name of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'click']) {
    document.addEventListener(name, activity, { capture: true, passive: false });
  }
  document.addEventListener('visibilitychange', () => { hide(); lastActivity = Date.now(); });
  setInterval(() => {
    const eligible = canShow();
    if (active && !eligible) hide();
    if (!eligible) lastActivity = Date.now();
    if (shouldEnterRest({ now: Date.now(), lastActivity, eligible, visible: document.visibilityState === 'visible', active })) show();
  }, 1000);
  return { show, hide };
}
