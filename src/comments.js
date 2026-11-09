import { getConfig, sendComment } from './data.js';
const form = document.querySelector('#comment-form');
getConfig().then(c => { document.querySelector('#comment-demo').hidden = c.mode !== 'demo'; }).catch(() => {});
let errorTimer;
const error = document.querySelector('#comment-error');
function showError(message) {
  clearTimeout(errorTimer);
  error.textContent = message;
  errorTimer = setTimeout(() => { error.textContent = ''; }, 5000);
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button'), status = document.querySelector('#comment-status');
  clearTimeout(errorTimer);
  error.textContent = ''; status.textContent = '';
  if (form.message.value.trim().length < 10) { showError('10 caracteres minimo'); return; }
  if (form.message.value.length > 2000) { showError('2000 caracteres máximo'); return; }
  button.disabled = true; button.textContent = 'Enviando…';
  try {
    await sendComment({name:form.elements.name.value, message:form.message.value});
    status.textContent = (await getConfig()).mode === 'demo' ? 'Comentario de prueba guardado en este navegador.' : 'Gracias. Tu comentario llegó al equipo de Iron Panthers.';
    form.reset(); status.focus({preventScroll:true});
  } catch (err) { showError(err.message); }
  finally { button.disabled = false; button.textContent = 'Enviar comentario'; }
});
