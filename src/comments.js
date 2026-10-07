import { getConfig, sendComment } from './data.js';
const form = document.querySelector('#comment-form');
getConfig().then(c => { document.querySelector('#comment-demo').hidden = c.mode !== 'demo'; }).catch(() => {});
form.message.addEventListener('input', () => { document.querySelector('#comment-count').textContent = `${form.message.value.length} / 2000`; });
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button'), error = document.querySelector('#comment-error'), status = document.querySelector('#comment-status');
  error.textContent = ''; status.textContent = ''; button.disabled = true; button.textContent = 'Enviando…';
  try {
    await sendComment({name:form.elements.name.value, message:form.message.value});
    status.textContent = (await getConfig()).mode === 'demo' ? 'Comentario de prueba guardado en este navegador.' : 'Gracias. Tu comentario llegó al equipo de Iron Panthers.';
    form.reset(); document.querySelector('#comment-count').textContent = '0 / 2000'; status.focus({preventScroll:true});
  } catch (err) { error.textContent = err.message; }
  finally { button.disabled = false; button.textContent = 'Enviar comentario'; }
});
