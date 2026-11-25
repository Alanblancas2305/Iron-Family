-- IRON FAMILY · Ejecutar una sola vez en Supabase / SQL Editor.
-- Sin datos personales ni cuentas de prueba. El servidor crea los socios.
create table if not exists public.iron_members (
  id bigint generated always as identity (start with 1001) primary key,
  name text not null check (char_length(name) between 3 and 100),
  age integer check (age between 12 and 100),
  area text not null check (area in ('gym','cf')),
  start date not null check (start between date '2000-01-01' and date '2100-12-31'),
  months integer not null check (months in (1,3,6,12)),
  access_code text not null unique,
  created_at timestamptz not null default now()
);
alter table public.iron_members enable row level security;
revoke all on public.iron_members from anon, authenticated;
grant all on public.iron_members to service_role;
grant usage, select on sequence public.iron_members_id_seq to service_role;

create table if not exists public.iron_request_budgets (
  key text primary key,
  hits integer not null,
  expires_at timestamptz not null
);
alter table public.iron_request_budgets enable row level security;
revoke all on public.iron_request_budgets from anon, authenticated;
grant all on public.iron_request_budgets to service_role;

create or replace function public.iron_take_budget(p_key text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_hits integer;
begin
  delete from public.iron_request_budgets where expires_at < now() - interval '1 hour';
  insert into public.iron_request_budgets(key,hits,expires_at)
    values(p_key,1,now()+make_interval(secs=>p_seconds))
  on conflict(key) do update set
    hits=case when iron_request_budgets.expires_at < now() then 1 else iron_request_budgets.hits+1 end,
    expires_at=case when iron_request_budgets.expires_at < now() then now()+make_interval(secs=>p_seconds) else iron_request_budgets.expires_at end
  returning hits into current_hits;
  return current_hits <= p_limit;
end; $$;
revoke all on function public.iron_take_budget(text,integer,integer) from public,anon,authenticated;
grant execute on function public.iron_take_budget(text,integer,integer) to service_role;

-- Ejecutar en Supabase > SQL Editor antes de publicar esta actualización.
-- Es aditiva: no borra ni reemplaza socios existentes.
create or replace function public.iron_normalize_name(value text)
returns text language sql immutable strict set search_path=public as $$
  select regexp_replace(lower(translate(trim(value), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '\s+', ' ', 'g');
$$;
create index if not exists iron_members_normalized_name on public.iron_members (public.iron_normalize_name(name));
drop function if exists public.iron_lookup_name(text);
create function public.iron_lookup_name(p_name text)
returns table(id bigint,name text,area text,start date,months integer)
language sql stable security definer set search_path=public as $$
  select m.id,m.name,m.area,m.start,m.months from public.iron_members m
  where public.iron_normalize_name(m.name)=public.iron_normalize_name(p_name)
  limit 2;
$$;
revoke all on function public.iron_lookup_name(text) from public,anon,authenticated;
grant execute on function public.iron_lookup_name(text) to service_role;
create table if not exists public.iron_comments (
  id bigint generated always as identity primary key,
  name text not null default '' check (char_length(name)<=100),
  message text not null check (char_length(trim(message)) between 10 and 2000),
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.iron_comments enable row level security;
revoke all on public.iron_comments from anon,authenticated;
grant all on public.iron_comments to service_role;
grant usage,select on sequence public.iron_comments_id_seq to service_role;


begin;
alter table public.iron_members add column if not exists paid_until date;
-- Ejecutar antes de publicar. Conserva los socios y comentarios existentes.
create table if not exists public.iron_payments (
 id uuid primary key,
 member_id bigint references public.iron_members(id) on delete set null,
 member_name text not null,
 amount numeric(10,2) not null check(amount > 0 and amount <= 1000000),
 method text not null check(method in ('Efectivo','Tarjeta','Transferencia')),
 start date not null,
 months integer not null check(months in (1,3,6,12)),
 created_at timestamptz not null default now()
);
alter table public.iron_payments enable row level security;
revoke all on public.iron_payments from anon,authenticated;
grant all on public.iron_payments to service_role;
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
 start=case when p_start=coalesce(m.paid_until,(m.start+make_interval(months=>m.months))::date) then m.start else p_start end,
 months=p_months,
 paid_until=(p_start+make_interval(months=>p_months))::date
 where id=m.id;
 return to_jsonb(existing);
end; $$;
revoke all on function public.iron_record_payment(uuid,bigint,numeric,text,date,integer) from public,anon,authenticated;
grant execute on function public.iron_record_payment(uuid,bigint,numeric,text,date,integer) to service_role;

drop function if exists public.iron_lookup_name(text);
create function public.iron_lookup_name(p_name text)
returns table(id bigint,name text,area text,start date,months integer,paid_until date)
language sql stable security definer set search_path=public as $$
 select m.id,m.name,m.area,m.start,m.months,m.paid_until from public.iron_members m
 where public.iron_normalize_name(m.name)=public.iron_normalize_name(p_name) limit 2;
$$;
revoke all on function public.iron_lookup_name(text) from public,anon,authenticated;
grant execute on function public.iron_lookup_name(text) to service_role;

commit;

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
