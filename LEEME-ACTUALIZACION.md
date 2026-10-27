# Panel compacto y membresía semanal

Cambios: menú izquierdo sin Registrar; botón principal destacado con brillo suave; registro en ventana que vuelve a Inicio; listas compactas con todos los miembros accesibles por desplazamiento; botón Renovar en cada fila; renovación simplificada; opción 1 semana (7 días), con importe editable; Excel identifica la duración semanal.

## Instalación
1. En Supabase, abre SQL Editor y ejecuta ACTUALIZACION-SEMANA.sql. Actualiza las validaciones y las funciones de vigencia; no ejecuta borrados ni cambia miembros existentes. Requiere las tablas de miembros y pagos ya instaladas.
2. Copia el contenido de la carpeta iron-family del ZIP sobre tu proyecto actual, conservando las mismas rutas. No borres el resto de tu proyecto ni tus variables de entorno.
3. Ejecuta npm run build. Después publica con tu procedimiento habitual de Vercel.

El importe de una semana queda vacío para capturar la tarifa correcta. Los periodos mensuales conservan 600 como importe editable.
El primer pago documenta el periodo registrado al dar de alta; los pagos siguientes renuevan desde el vencimiento si aún hay días vigentes, o desde hoy si venció.
La importación masiva mantiene sus periodos mensuales existentes.

## Validación
19 pruebas automatizadas aprobadas: API, miembros, pagos, importación, Excel, límites de fechas y nueva duración semanal. Compilación de producción correcta. No se pudo completar la revisión visual por un error de conexión del navegador.

## Nota técnica
Para mantener las firmas existentes de la API y las funciones de Supabase, months=0 representa una semana. periodEnd / iron_period_end convierten ese valor en siete días. addMonths sigue calculando meses de calendario. Ejecutar el SQL antes de desplegar es obligatorio. No volver a ejecutar versiones antiguas de ACTUALIZACION-ADMIN.sql después de esta migración.
