# IRON PANTHERS · Actualización móvil

ZIP con los archivos nuevos o modificados para colocarlos en la raíz de `iron-family`. Conserva las imágenes de la pantera, coaches y productos que ya tienes.

Incluye: fondo negro; títulos grandes en celular; horarios separados; SVG sin emojis; consulta por nombre; buzón privado con bandeja en Administración; pagos debajo de coaches.

Horarios confirmados: lunes a viernes de 7–11 am y 5–9:30 pm; sábado de 7–11 am.

## Instalar en tu Mac

Descarga IRON-PANTHERS-movil.zip en Descargas. En Terminal entra a la carpeta `iron-family` donde ejecutas Git. Primero revisa los cambios pendientes:

```bash
git status
```

Si tienes cambios propios sin guardar, guárdalos antes:

```bash
git add .
git commit -m "Respalda cambios antes de actualizar diseño movil"
```

Después, dentro de `iron-family`:

```bash
unzip -o "$HOME/Downloads/IRON-PANTHERS-movil.zip" -d .
npm ci
npm test
npm run build
```

Si Safari lo descomprime automáticamente, copia el contenido a `iron-family`, combinando las carpetas `src`, `api` y `tests` y reemplazando solo los archivos correspondientes. No borres las carpetas completas.

## Activar funciones en línea

Si ya usas Supabase, abre SQL Editor y ejecuta **ACTUALIZACION-MOVIL.sql** antes del push. Agrega la consulta por nombre y la tabla de comentarios; no elimina socios.

Si todavía no tienes datos en línea, sigue «Activar membresías en línea» en LEEME.md con el database.sql actualizado. Requiere SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_USER, ADMIN_PASSWORD y SESSION_SECRET en Vercel.

**Sin esa configuración, sigue en demostración:** socios y comentarios se guardan solo en el mismo navegador. El formulario lo indica. No aparecen en otro celular.

## Publicar

```bash
git add .
git commit -m "Mejora movil, horarios, consulta por nombre y buzon"
git push origin main
```

Si Vercel está conectado a esa rama, espera a que el despliegue termine y recarga la página en el celular.

## Comprobar

- Menú → Horarios: revisa los dos turnos.
- Mi membresía: escribe el nombre completo registrado. Acepta distintas mayúsculas y sin acentos; no pide código.
- Si dos registros tienen el mismo nombre completo, pide acudir a recepción para evitar mostrar la membresía equivocada.
- Envía un comentario y abre Administración → Comentarios. Puedes marcarlo como leído.
- En modo en línea, verifica el comentario desde otro dispositivo. En demostración, usa el mismo navegador.
- Los métodos de pago aparecen inmediatamente después del bloque de coaches.

La vigencia muestra días totales y su equivalente en meses y días de calendario. La consulta pública por nombre devuelve nombre, modalidad, número y fechas de membresía; no devuelve edad ni códigos. Los comentarios solo pueden leerse con sesión administrativa en modo en línea.

No se ha hecho push ni cambiado tu Vercel/Supabase desde este paquete.
