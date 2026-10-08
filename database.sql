-- IRON FAMILY · Ejecutar una sola vez en Supabase / SQL Editor.
-- Sin datos personales ni cuentas de prueba. El servidor crea los socios.
create table if not exists public.iron_members (
  id bigint generated always as identity (start with 1001) primary key,
  name text not null check (char_length(name) between 3 and 100),
  age integer not null check (age between 12 and 100),
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
