# Actualización visual de recepción

Esta versión incorpora un Inicio pensado para permanecer abierto en el monitor del gimnasio:

- Botón destacado «Registrar miembro» en Inicio y navegación.
- Contadores de miembros registrados, membresías vigentes, por vencer y vencidas.
- Dos listas independientes: por vencer en los próximos 7 días (incluye hoy) y vencidas.
- Nombre, modalidad, fecha de vencimiento y tiempo restante o transcurrido.
- Acceso a la ficha y botón Renovar que abre el pago del miembro seleccionado.
- Actualización del tablero cada minuto mientras está visible, sin cerrar formularios abiertos; también hay botón Actualizar.
- Listas con desplazamiento interno para mantener visibles los controles.
- Uso de «miembros» en las pantallas y mensajes.
- Formulario con secciones destacadas y botón de registro más grande.
- En móvil, halo completo detrás de la pantera, sin arco delantero cortado sobre el brazo. En escritorio se conserva el efecto original.

## Instalar sobre tu proyecto actual

Copia el contenido de la carpeta iron-family de este ZIP dentro de tu carpeta original iron-family y acepta reemplazar los archivos. Conserva .git, .env*, .npmrc y .vercel. No pongas una carpeta iron-family dentro de otra.

En Terminal, dentro de tu proyecto:

```bash
npm ci
npm test
npm run build
```

Para revisarlo en tu Mac:

```bash
npm run dev
```

Abre la dirección que muestre Terminal y agrega /admin.html. Mantén Terminal abierta durante la demostración. Sin variables configuradas se ofrece «Explorar administración». Una configuración parcial seguirá mostrando un error: esta actualización visual no cambia tus variables de Vercel o Supabase.

Usa información ficticia en demostración. Administración y consulta deben usarse en el mismo navegador y dirección; la demostración no comparte datos entre dispositivos.

Para publicar, después de comprobar el resultado:

```bash
git add .
git commit -m "Mejora recepcion, miembros y portada movil"
git push origin main
```

Espera Ready en Vercel y abre /admin.html.

## Base de datos

Si ya ejecutaste ACTUALIZACION-ADMIN.sql para el historial de pagos, no tienes que ejecutar más SQL por estos cambios visuales. Se conservan el modelo de datos y los pagos. Para una instalación desde cero, consulta LEEME.md.

Registrar pagos solo registra cobros recibidos; no realiza cargos bancarios.

## Archivos modificados en esta revisión

- src/admin.js y src/admin.css
- src/mobile.css
- index.html y src/main.js
- src/data.js, src/shared.js y api/family.js (terminología visible)
- EMPIEZA-AQUI.md, INSTRUCCIONES-ACTUALIZACION.md y VERIFICACION.md

No se incluyen dependencias descargadas, credenciales ni datos personales.
