-- Ejecutar una vez en Supabase antes de publicar el panel.
begin;
lock table public.iron_members, public.iron_payments in share row exclusive mode;

create temporary table iron_member_merge on commit drop as
select id, first_value(id) over (
  partition by public.iron_normalize_name(name) order by created_at desc, id desc
) as keep_id from public.iron_members;

update public.iron_payments p set member_id=m.keep_id
from iron_member_merge m where p.member_id=m.id and m.id<>m.keep_id;
delete from public.iron_members p using iron_member_merge m
where p.id=m.id and m.id<>m.keep_id;
create unique index if not exists iron_members_unique_name
on public.iron_members (public.iron_normalize_name(name));

create or replace function public.iron_save_profile(p_member jsonb)
returns setof public.iron_members language sql set search_path=public as $$
  insert into public.iron_members(name,age,area,start,months,access_code)
  values(p_member->>'name',(p_member->>'age')::integer,p_member->>'area',
         (p_member->>'start')::date,(p_member->>'months')::integer,p_member->>'access_code')
  on conflict (public.iron_normalize_name(name)) do update
    set name=excluded.name, age=excluded.age, area=excluded.area, start=excluded.start,
        months=excluded.months, paid_until=null
  returning *;
$$;
revoke all on function public.iron_save_profile(jsonb) from public,anon,authenticated;
grant execute on function public.iron_save_profile(jsonb) to service_role;

create or replace function public.iron_import_members(p_rows jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb; m public.iron_members; v_name text; v_age integer;
  v_start date; v_end date; v_months integer; v_amount numeric; v_area text; v_method text;
  imported integer := 0; skipped integer := 0; updated integer := 0;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'Se requiere una lista'; end if;
  if jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 500 then raise exception 'De 1 a 500 filas'; end if;
  -- Serializa importaciones y bloquea altas/renovaciones concurrentes mientras se valida y escribe.
  lock table public.iron_members in share row exclusive mode;
  for r in select distinct on (public.iron_normalize_name(value->>'name')) value
    from jsonb_array_elements(p_rows) with ordinality
    order by public.iron_normalize_name(value->>'name'), ordinality desc loop
    v_name := trim(r->>'name'); v_age := nullif(trim(r->>'age'),'')::integer;
    v_area := r->>'area'; v_start := (r->>'start')::date; v_end := (r->>'paid_until')::date;
    v_months := (r->>'months')::integer; v_amount := coalesce(nullif(r->>'amount','')::numeric,600);
    v_method := coalesce(nullif(r->>'method',''),'Efectivo');
    if v_name is null or char_length(v_name) not between 3 and 100
      or (v_age is not null and v_age not between 12 and 100)
      or v_area is null or v_area not in ('gym','cf')
      or v_months is null or v_months not in (1,3,6,12)
      or v_start is null or v_start not between date '2000-01-01' and date '2100-12-31'
      or v_end is null or v_end not between date '2000-01-01' and date '2100-12-31'
      or v_end <> (v_start + make_interval(months=>v_months))::date
      or v_amount <= 0 or v_amount > 1000000 or v_amount <> round(v_amount,2)
      or v_method not in ('Efectivo','Tarjeta','Transferencia') then
      raise exception 'Fila inválida: %',v_name;
    end if;
    if (v_end + interval '3 months')::date < (now() at time zone 'America/Mexico_City')::date then
      raise exception 'Membresía con más de tres meses vencida: %',v_name;
    end if;
    update public.iron_members set name=v_name, age=v_age, area=v_area,
      start=v_start, months=v_months, paid_until=v_end
      where public.iron_normalize_name(name)=public.iron_normalize_name(v_name);
    if found then
      updated := updated + 1;
      continue;
    end if;
    insert into public.iron_members(name,age,area,start,months,paid_until,access_code)
      values(v_name,v_age,v_area,v_start,v_months,v_end,replace(gen_random_uuid()::text,'-','')) returning * into m;
    insert into public.iron_payments(id,member_id,member_name,amount,method,start,months,created_at)
      values(gen_random_uuid(),m.id,m.name,v_amount,v_method,v_start,v_months,
      (v_start + time '12:00') at time zone 'America/Mexico_City');
    imported := imported + 1;
  end loop;
  skipped := jsonb_array_length(p_rows)-imported-updated;
  return jsonb_build_object('imported',imported,'updated',updated,'skipped',skipped);
end; $$;
revoke all on function public.iron_import_members(jsonb) from public,anon,authenticated;
grant execute on function public.iron_import_members(jsonb) to service_role;
commit;
