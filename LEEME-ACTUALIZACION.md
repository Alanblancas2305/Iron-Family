# IRON PANTHERS · Panel oscuro según las tres referencias

Esta versión reemplaza el rediseño claro descartado y recupera la apariencia oscura del administrador.

## Ajustes de la referencia 4
- Registro con nombre, edad opcional, botones de modalidad, duración y fecha en ese orden; sin encabezados numerados.
- Inicio sin número ni modalidad en las dos listas, nombres más grandes y columna de vencidas más ancha.
- Renovar aparece únicamente en la lista de vencidas; las opciones del directorio de miembros se conservan.
- Verificados en navegador: registro semanal en Iron Cross, permanencia en Inicio y ausencia de botones Renovar en Por vencer.

## Cambios
- Inicio: dos indicadores (por vencer y vencidas), botón rojo grande Registrar miembro, búsqueda por nombre o número y dos listas de vigencias.
- Miembros: cuatro indicadores, filtros de modalidad y vigencia, tabla completa con Renovar, Editar y Eliminar. Todos los registros son accesibles mediante desplazamiento y búsqueda.
- Pago y renovación: nombre destacado, importe, botones Iron Gym / Iron Cross, duración, vencimiento y Guardar. La fecha de inicio y forma de pago están dentro de una sección desplegable.
- Una semana equivale a siete días. El importe semanal se captura manualmente; el mensual inicia en 600 y es editable.
- Registrar miembro permanece únicamente como botón principal en Inicio, con brillo sutil y soporte para movimiento reducido. Registrar termina en Inicio.

## Instalar
El ZIP es una actualización para el proyecto existente, no contiene dependencias, credenciales ni fotografías del sitio. Incluye admin.html, necesario para restaurar la carga de estilos original.

```sh
unzip -o "/Users/jennifer/Documents/ChatGPT/Iron Family/IRON-PANTHERS-PANEL-COMPACTO.zip" -d "/Users/jennifer/Downloads"
cd "/Users/jennifer/Downloads/iron-family"
npm run build
```

Para revisarlo localmente, ejecuta npm run dev y abre /admin.html en la dirección que indique Terminal. Cuando quieras publicarlo en el proyecto ya vinculado:

```sh
npx vercel --prod
```

Si ya aplicaste ACTUALIZACION-SEMANA.sql, no necesitas SQL adicional para este diseño.

## Verificación
20 pruebas automatizadas aprobadas y compilación de producción correcta. Revisión visual en Chrome a 1440 x 900 y 390 x 844. Probados en demostración local: alta semanal sin edad, permanencia en Inicio, búsqueda sin acentos, primer pago sin mes extra, cambio de modalidad y segunda renovación semanal conservando los días pendientes (7 a 14 días).

La modalidad se actualiza antes de guardar el pago. Si falla el pago después de actualizar la modalidad, esta última puede quedar guardada; el formulario informa el error y permite reintentar el pago sin duplicarlo mediante su identificador.

No se han publicado estos cambios en Vercel ni se han realizado operaciones sobre los miembros reales.

## Pantalla de reposo
En Inicio, tras cinco minutos sin actividad, aparece una secuencia de 20 segundos: letras que se reúnen, tres zarpazos, logo original, brillo del ojo y halo rojo. No tiene sonido. El botón Ver animación de reposo permite probarla inmediatamente. Cualquier movimiento, toque o tecla vuelve al panel conservando la sesión. No se activa en otras secciones ni con formularios abiertos. Respeta la preferencia de movimiento reducido. No necesita cambios en Supabase.
