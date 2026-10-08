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
