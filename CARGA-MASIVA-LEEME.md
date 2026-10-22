# Actualización: carga masiva de miembros

## Instalar

1. Conserva tu carpeta original y su archivo `.env.local`. Copia los archivos de esta actualización sobre tu proyecto, reemplazando los del mismo nombre. El ZIP no contiene contraseñas, `.git`, `node_modules` ni configuraciones de Vercel personales.
2. En Supabase → SQL Editor ejecuta **ACTUALIZACION-CARGA-MASIVA.sql**. Es necesario para admitir edades vacías y guardar los miembros con sus pagos en una transacción. No borra registros existentes.
3. Para activar la eliminación solicitada, ejecuta **ACTIVAR-LIMPIEZA-AUTOMATICA.sql**. Crea una tarea diaria en Supabase, independiente del navegador. Si pg_cron no se habilita desde SQL, actívalo en Integrations → Cron y ejecuta de nuevo ese archivo.
4. En la terminal, dentro del proyecto: `npm ci`, `npm test`, `npm run build`. Publica los archivos actualizados mediante tu procedimiento habitual de Git/Vercel. Conserva las variables de entorno que ya funcionan.
5. Abre `/admin.html` y recarga la página.

Para una base completamente nueva, ejecuta primero `database.sql`, después los dos archivos anteriores.

## Importar el Excel

En **Miembros**, debajo y a la derecha de **Descargar Excel completo**, aparece **Importar Excel**. Es un botón secundario discreto, accesible por teclado.

Descarga la plantilla desde ese diálogo. Incluye Citzi, Nancy, Omar, Jesús, Ofir y Dennise con las fechas proporcionadas, interpretadas como octubre/noviembre de **2026**. Verifica el año antes de confirmar. Cambia o quita esos ejemplos cuando prepares otra lista.

| Columna | Contenido |
|---|---|
| Nombre | Obligatorio, de 3 a 100 caracteres |
| Inicio | Fecha de pago/inicio del periodo, por ejemplo 11/10/2026 |
| Vencimiento | Por ejemplo 11/11/2026 |
| Pago | Vacío equivale a $600 MXN; puedes cambiarlo |
| Edad | Opcional; si se proporciona, entre 12 y 100 |
| Modalidad | Gym o Cross; si está vacía se usa la selección del diálogo |
| Forma de pago | Efectivo, Tarjeta o Transferencia; vacía equivale a Efectivo |

Una fila por persona. Se admite `.xlsx`, hasta 500 miembros y 5 MB. El lector usa la hoja **Carga masiva**, o la primera hoja si ese nombre no existe. Guarda archivos antiguos `.xls` como `.xlsx` y sustituye fórmulas por valores. Usa Chrome o Edge actualizado.

Se admiten fechas de Excel y texto DD/MM/AAAA o AAAA-MM-DD. No se adivina el año. Los periodos deben ser de 1, 3, 6 o 12 meses, de acuerdo con las duraciones del sistema. Una fecha imposible impide confirmar hasta corregirla.

La vista previa muestra los importes, modalidades, errores y duplicados. Los nombres existentes se omiten, sin actualizar sus fechas ni agregarles otro pago. Se ignoran mayúsculas, acentos y espacios repetidos al comparar nombres. Si hay dos personas distintas con el mismo nombre, registra manualmente a la segunda y utiliza apellidos para diferenciarlas.

Al confirmar se guardan los nuevos miembros y un pago por persona. La fecha de ese pago corresponde a **Inicio**, no al día de importación. El monto no es un cargo bancario: registra el dinero que ya recibiste. Una falla de la transacción no deja solo una parte del lote guardada. Reintentar una solicitud completada omite los nombres que ya se guardaron.

La edad también es opcional al registrar o editar manualmente. Registrar pago y renovar propone $600, editable. El alta manual sigue sin generar un cobro automáticamente: usa Registrar pago para documentarlo.

## Limpieza automática

La tarea comprueba los registros todos los días a las 12:00 UTC (06:00 de Ciudad de México). Elimina definitivamente la ficha cuando la fecha actual supera el vencimiento más **tres meses de calendario**. Por ejemplo, si vence el 11/11/2026, cumple tres meses el 11/02/2027 y se puede eliminar desde el 12/02/2027. Una renovación cambia el vencimiento y evita que se borre por la fecha anterior.

Los pagos históricos se conservan con su nombre e importe; su vínculo con la ficha eliminada queda vacío. No se borran comentarios. Esto reduce fichas inactivas, pero no pretende vaciar todo el historial de la base de datos. Una persona eliminada puede registrarse de nuevo con una membresía nueva.

Descarga el Excel completo antes de activar la tarea para conservar una copia de las fichas antiguas. Para detener la tarea:

```sql
select cron.unschedule('iron-limpieza-vencidos');
```

Para revisar ejecuciones:

```sql
select d.status, d.start_time, d.return_message
from cron.job_run_details d join cron.job j using (jobid)
where j.jobname='iron-limpieza-vencidos'
order by d.start_time desc limit 10;
```

En modo demostración la limpieza se realiza cuando se carga la lista local; en producción la tarea de Supabase funciona aunque el admin esté cerrado.

## Verificación realizada

Pruebas automáticas de validación, autenticación, fechas, duplicados, umbral de tres meses, lectura ZIP del Excel y exportación completa; compilación de producción. La ejecución de SQL en tu Supabase y la revisión visual en navegador quedan pendientes en tu entorno. Esta entrega no publica en Vercel ni activa por sí sola la tarea de limpieza.

Referencia de configuración: https://supabase.com/docs/guides/cron/quickstart
