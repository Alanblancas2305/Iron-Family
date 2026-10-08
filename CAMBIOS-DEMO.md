# Actualización de recepción

Incluye 60 miembros ficticios adicionales, con vigencias activas, próximas a vencer y vencidas, y 12 comentarios positivos identificados como ejemplos. Solo se agregan en modo demostración; nunca se insertan en Supabase. Los ejemplos se cargan una sola vez y se conservan los registros existentes.

Los nombres y botones Renovar son más grandes en las listas de vencimientos, sin círculos de iniciales. Cada comentario permite eliminarlo con confirmación, tanto en demo como en línea. No necesitas ejecutar SQL adicional para estos cambios.

## Instalar
Copia el contenido de esta carpeta dentro de tu proyecto actual y reemplaza los archivos. Conserva .git y tus archivos privados .env. No metas la carpeta dentro de sí misma.

Ejecuta npm ci y npm run dev; abre /admin.html en la dirección que muestre Terminal. Si está en modo demostración, pulsa Explorar administración. Recarga el navegador para ver la actualización.

Para que aparezca en el enlace compartido, publica los cambios en tu proyecto habitual de Vercel. Este ZIP no cambia por sí solo el sitio publicado.

Verificación: nueve pruebas automatizadas, compilación de producción y comprobación de la interfaz con 66 miembros y eliminación de comentarios. La conexión real requiere las variables del proyecto.
