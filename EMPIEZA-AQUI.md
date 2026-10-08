# IRON PANTHERS · Proyecto completo

Un solo proyecto para Windows y Mac. El ZIP se publica una vez; recepción abre el panel en su navegador. Necesita internet para compartir registros.

- Clientes: https://iron-family.vercel.app/
- Administración: https://iron-family.vercel.app/admin.html

## Actualizar el sitio que ya tienes

1. Haz una copia de tu carpeta actual `iron-family`.
2. Descomprime este ZIP. Copia TODO el contenido de su carpeta `iron-family` dentro de tu proyecto actual y acepta reemplazar archivos. Conserva tu carpeta `.git` y tus archivos de configuración privada. No copies la carpeta dentro de sí misma.
3. Abre `ACTUALIZACION-ADMIN.sql`, copia todo su contenido, pégalo en el SQL Editor de TU proyecto Supabase y pulsa Run. Este paso agrega el historial de pagos y conserva socios y comentarios. En Mac, desde tu carpeta del proyecto, puedes copiarlo con `pbcopy < ACTUALIZACION-ADMIN.sql`. No necesitas volver a ejecutar el SQL móvil.
4. En Terminal, dentro de tu carpeta del proyecto, ejecuta:

```bash
npm ci
npm test
npm run build
git add .
git commit -m "Organiza recepcion y agrega pagos y renovaciones"
git push origin main
```

5. Espera a que el nuevo despliegue de Vercel diga Ready. Las cinco variables que ya configuraste se conservan; no tienes que crear otro usuario ni otro proyecto.
6. Abre `/admin.html` e inicia sesión. Si muestra un error de conexión, verifica las variables indicadas en LEEME.md. El ZIP no configura ni verifica por sí mismo tu cuenta de Vercel o Supabase.

## Uso diario

- **Inicio:** membresías vigentes, próximas a vencer y comentarios nuevos.
- **Socios:** buscar, filtrar por modalidad o estado, registrar y editar. La ficha permite copiar el acceso del socio.
- **Pagos y renovaciones:** selecciona el socio, importe recibido, forma de pago, inicio y duración. Guarda el pago y la vigencia juntos. No hace cargos a tarjetas; registra cobros que ya recibiste. No incluye facturación fiscal ni cancelación de pagos.
- Si aún quedan días, la fecha propuesta prolonga la vigencia actual. Revisa el nuevo vencimiento antes de guardar. Los periodos incluyen la fecha final. Al cambiar manualmente la fecha puedes sustituir el periodo actual.
- **Comentarios:** mensajes privados enviados por clientes; permite marcarlos como leídos. El buzón se actualiza cada minuto cuando está abierto y también tiene botón Actualizar.
- **Ayuda y conexión:** indica si estás en línea o en demostración.

Al renovar, el cliente ve el nuevo tiempo restante al volver a consultar su nombre en la página pública. No se envían notificaciones ni WhatsApp automáticamente. Los mensajes enviados mientras recepción está cerrada quedan guardados en Supabase.

Editar inicio o duración desde la ficha sustituye la vigencia pagada. Usa Pagos y renovaciones para sumar tiempo y conservar el registro del cobro. Eliminar un socio no elimina su historial de pagos.

## Acceso directo: Windows y Mac

Incluimos `accesos/Administracion-Windows.url` para Windows y `accesos/Administracion-Mac.webloc` para Mac. Copia el correspondiente al escritorio y ábrelo con doble clic. Ambos abren el mismo panel publicado. No contienen contraseñas.

También puedes guardar el enlace de administración en Favoritos del navegador. El panel no aparece enlazado en la página pública. Quien tenga el enlace y las credenciales podrá entrar desde otro equipo, como acordamos. La sesión dura ocho horas y hay botón Salir.

## Si empiezas desde cero

Sigue LEEME.md y ejecuta `database.sql` completo en lugar de la actualización. No subas contraseñas ni claves privadas a GitHub. No abras los HTML con doble clic: usa el sitio publicado o `npm run dev` para desarrollo.

## Qué se incluye

Código completo, imágenes, fuentes, API, SQL, pruebas e instrucciones. No se incluyen dependencias descargadas, credenciales ni datos personales. No necesitas un ZIP distinto para cada sistema operativo.
