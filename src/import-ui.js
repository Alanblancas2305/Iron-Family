import { listMembers, importMembers } from './data.js';
import { readXlsx } from './read-xlsx.js';
import { previewImport } from './import-validation.js';
import { createWorkbook } from './excel.js';
import { escapeHTML as esc, areaName } from './shared.js';

export function templateWorkbook() {
  return createWorkbook([['Carga masiva',[
    ['Nombre','Inicio','Vencimiento','Pago','Edad','Modalidad','Forma de pago'],
    ...[['Citzi',11],['Nancy',11],['Omar',11],['Jesús',14],['Ofir',14],['Dennise',7]].map(([name,day])=>[name,`${String(day).padStart(2,'0')}/10/2026`,`${String(day).padStart(2,'0')}/11/2026`,600,'','',''])
  ]]]);
}
export function openImportDialog({openDialog,dialog,onDone}) {
  openDialog(`<p class="eyebrow">CARGA MASIVA</p><h2>Importar miembros</h2>
    <p>Una fila por persona: <strong>Nombre, Inicio y Vencimiento</strong>. Usa fechas con año (11/10/2026). La edad es opcional; Pago vacío = $600.</p>
    <p>Solo se agregan miembros nuevos con su pago inicial. Los nombres existentes o repetidos se omiten; para renovar utiliza Registrar pago.</p>
    <button type="button" class="button secondary small" id="import-template">Descargar plantilla con ejemplos</button>
    <p class="renew-note">La plantilla incluye tus seis nombres y fechas de 2026. Verifica el año y la modalidad antes de confirmar.</p>
    <label for="import-area">Modalidad cuando la celda esté vacía</label><select id="import-area"><option value="gym">Iron Gym</option><option value="cf">Iron Cross</option></select>
    <p class="renew-note">Forma de pago vacía = Efectivo. Puedes escribir Tarjeta o Transferencia en el Excel.</p>
    <label for="import-file">Archivo Excel (.xlsx, máximo 500 miembros y 5 MB)</label><input id="import-file" type="file" accept=".xlsx">
    <p id="import-error" class="form-error" role="alert"></p><div id="import-preview" aria-live="polite"></div>
    <div class="form-actions"><button type="button" class="button secondary" id="import-cancel">Cancelar</button><button type="button" class="button" id="import-confirm" disabled>Confirmar importación</button></div>`);
  const $=s=>dialog.querySelector(s); let parsed=null, preview=[],busy=false,version=0;
  $('#import-template').onclick=()=>{
    const url=URL.createObjectURL(templateWorkbook()),a=document.createElement('a');a.href=url;a.download='IRON-PANTHERS-plantilla-carga.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  };
  $('#import-cancel').onclick=()=>dialog.close();
  async function showPreview() {
    const token=++version;$('#import-confirm').disabled=true;$('#import-error').textContent='';$('#import-preview').textContent='Revisando registros…';
    try {
      const existing=await listMembers();if(token!==version || !dialog.open)return;
      preview=previewImport(parsed.matrix,existing,$('#import-area').value,parsed.date1904);
      const ready=preview.filter(r=>r.status==='ready'),errors=preview.filter(r=>r.status==='error'),duplicates=preview.filter(r=>r.status==='duplicate');
      const total=ready.reduce((n,r)=>n+r.fields.amount,0);
      $('#import-preview').innerHTML=`<p><strong>${ready.length} nuevos</strong> · ${duplicates.length} omitidos · ${errors.length} errores</p><p>Pagos a registrar: <strong>${new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(total)}</strong></p>
      <div class="import-preview-table table-scroll"><table><thead><tr><th>Fila / Nombre</th><th>Periodo</th><th>Pago / Modalidad</th><th>Resultado</th></tr></thead><tbody>${preview.map(r=>`<tr><td>${r.line} · ${esc(r.fields.name)}</td><td>${esc(r.fields.start)}<br>${esc(r.fields.paid_until)}</td><td>${esc(r.fields.amount || '')}<br>${esc(['gym','cf'].includes(r.fields.area)?areaName(r.fields.area):r.fields.area)}</td><td class="${r.status==='error'?'form-error':''}">${esc(r.message)}</td></tr>`).join('')}</tbody></table></div>`;
      $('#import-confirm').disabled=errors.length>0 || !ready.length;
      if(errors.length)$('#import-error').textContent='Corrige los errores en Excel y vuelve a seleccionarlo. No se ha guardado nada.';
    }catch(e){if(token===version){$('#import-error').textContent=e.message;$('#import-preview').textContent='';}}
  }
  $('#import-area').onchange=()=>{if(parsed)showPreview();};
  $('#import-file').onchange=async e=>{
    const file=e.target.files[0];parsed=null;preview=[];const token=++version;$('#import-confirm').disabled=true;$('#import-error').textContent='';$('#import-preview').textContent='';
    if(!file)return;
    try{const result=await readXlsx(file);if(token!==version || !dialog.open)return;parsed=result;await showPreview();}
    catch(err){if(token===version)$('#import-error').textContent=err.message || 'No se pudo leer el Excel.';}
  };
  const preventClose=e=>{if(busy)e.preventDefault();};dialog.addEventListener('cancel',preventClose);
  dialog.addEventListener('close',()=>{version++;dialog.removeEventListener('cancel',preventClose);},{once:true});
  $('#import-confirm').onclick=async()=>{
    if(busy)return;busy=true;const controls=[...dialog.querySelectorAll('button,input,select')];controls.forEach(c=>c.disabled=true);$('#import-error').textContent='';
    try {
      const result=await importMembers(preview.filter(r=>r.status==='ready').map(r=>r.fields));
      $('#import-preview').textContent=`Importación completada: ${result.imported} miembros y pagos guardados; ${result.skipped} omitidos por coincidencia de nombre. Los omitidos en la vista previa no se enviaron.`;
      parsed=null;preview=[];$('#import-confirm').textContent='Importación completada';$('#import-cancel').textContent='Cerrar';
      try{await onDone();}catch{ $('#import-error').textContent='Los registros se guardaron, pero no se pudo refrescar la lista. Recarga el panel.'; }
    }catch(e){$('#import-error').textContent=e.message;controls.forEach(c=>c.disabled=false);}
    finally{busy=false;$('#import-cancel').disabled=false;}
  };
}
