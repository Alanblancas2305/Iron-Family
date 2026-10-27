-- Ejecutar en Supabase antes de desplegar esta versión. No elimina registros.
-- Convención compatible con las columnas existentes: months=0 equivale a 7 días.
begin;
create or replace function public.iron_period_end(p_start date,p_months integer)
returns date language sql immutable strict set search_path=public as $$
 select case when p_months=0 then p_start+7 else (p_start+make_interval(months=>p_months))::date end;
$$;
alter table public.iron_members drop constraint if exists iron_members_months_check;
alter table public.iron_members add constraint iron_members_months_check check(months in (0,1,3,6,12));
alter table public.iron_payments drop constraint if exists iron_payments_months_check;
alter table public.iron_payments add constraint iron_payments_months_check check(months in (0,1,3,6,12));
create or replace function public.iron_record_payment(p_id uuid,p_member bigint,p_amount numeric,p_method text,p_start date,p_months integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare m public.iron_members; existing public.iron_payments;
begin
 select * into m from public.iron_members where id=p_member for update;
 if not found then raise exception 'Socio inexistente'; end if;
 select * into existing from public.iron_payments where id=p_id;
 if found then return to_jsonb(existing); end if;
 insert into public.iron_payments(id,member_id,member_name,amount,method,start,months)
 values(p_id,m.id,m.name,p_amount,p_method,p_start,p_months) returning * into existing;
 update public.iron_members set
 start=case when p_start=coalesce(m.paid_until,public.iron_period_end(m.start,m.months)) then m.start else p_start end,
 months=p_months,
 paid_until=public.iron_period_end(p_start,p_months)
 where id=m.id;
 return to_jsonb(existing);
end; $$;
revoke all on function public.iron_record_payment(uuid,bigint,numeric,text,date,integer) from public,anon,authenticated;
grant execute on function public.iron_record_payment(uuid,bigint,numeric,text,date,integer) to service_role;
create or replace function public.iron_cleanup_expired()
returns integer language plpgsql security definer set search_path=public as $$
declare removed integer;
begin
  -- Mismo bloqueo que la carga: una renovación y la limpieza no pisan sus cambios.
  lock table public.iron_members in share row exclusive mode;
  delete from public.iron_members
  where (coalesce(paid_until,public.iron_period_end(start,months)) + interval '3 months')::date
    < (now() at time zone 'America/Mexico_City')::date;
  get diagnostics removed = row_count;
  return removed;
end; $$;
revoke all on function public.iron_cleanup_expired() from public,anon,authenticated;

commit;
