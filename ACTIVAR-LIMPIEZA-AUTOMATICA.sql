-- Ejecutar después de ACTUALIZACION-CARGA-MASIVA.sql.
-- Activa borrado definitivo diario de fichas con MÁS de 3 meses de vencimiento.
-- Los pagos se conservan (member_id pasa a NULL), como establece database.sql.
-- Puede ejecutarse de nuevo: actualiza el trabajo del mismo nombre.
create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.iron_cleanup_expired()
returns integer language plpgsql security definer set search_path=public as $$
declare removed integer;
begin
  -- Mismo bloqueo que la carga: una renovación y la limpieza no pisan sus cambios.
  lock table public.iron_members in share row exclusive mode;
  delete from public.iron_members
  where (coalesce(paid_until,(start+make_interval(months=>months))::date) + interval '3 months')::date
    < (now() at time zone 'America/Mexico_City')::date;
  get diagnostics removed = row_count;
  return removed;
end; $$;
revoke all on function public.iron_cleanup_expired() from public,anon,authenticated;
-- Se ejecuta como postgres por el programador; no se expone a la página pública.
select cron.schedule('iron-limpieza-vencidos','0 12 * * *','select public.iron_cleanup_expired();');
-- 12:00 UTC equivale a las 06:00 en Ciudad de México.
-- Inspeccionar la configuración:
select jobname,schedule,active from cron.job where jobname='iron-limpieza-vencidos';
-- Para detenerlo: select cron.unschedule('iron-limpieza-vencidos');
