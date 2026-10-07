-- Ejecutar en Supabase > SQL Editor antes de publicar esta actualización.
-- Es aditiva: no borra ni reemplaza socios existentes.
create or replace function public.iron_normalize_name(value text)
returns text language sql immutable strict set search_path=public as $$
  select regexp_replace(lower(translate(trim(value), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '\s+', ' ', 'g');
$$;
create index if not exists iron_members_normalized_name on public.iron_members (public.iron_normalize_name(name));
create or replace function public.iron_lookup_name(p_name text)
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
