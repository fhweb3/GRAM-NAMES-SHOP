-- GRAM NAMES SHOP database schema
-- Run this in Supabase SQL Editor before deploying the site.
create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.usernames (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  username_key text generated always as (lower(trim(username))) stored,
  category_id uuid not null references public.categories(id) on update cascade,
  status text not null default 'Available'
    check (status in ('Available','Offer Received','Sold')),
  price numeric(14,4) null check (price is null or price >= 0),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  constraint username_nonempty check (length(trim(username)) between 1 and 100),
  constraint username_unique_case_insensitive unique (username_key)
);

create index if not exists usernames_category_idx on public.usernames(category_id);
create index if not exists usernames_status_idx on public.usernames(status);
create index if not exists usernames_public_idx on public.usernames(is_archived, created_at desc);
create index if not exists usernames_search_idx on public.usernames using gin (to_tsvector('simple', username));

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  if new.is_archived and old.is_archived = false then new.archived_at = now(); end if;
  if not new.is_archived then new.archived_at = null; end if;
  return new;
end;
$$;
drop trigger if exists usernames_updated_at on public.usernames;
create trigger usernames_updated_at before update on public.usernames
for each row execute function public.set_updated_at();

alter table public.admins enable row level security;
alter table public.categories enable row level security;
alter table public.usernames enable row level security;

drop policy if exists "Admins can read their admin record" on public.admins;
create policy "Admins can read their admin record" on public.admins
for select to authenticated using (user_id = auth.uid());

drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories" on public.categories
for select to anon, authenticated using (true);
drop policy if exists "Admins can manage categories" on public.categories;
create policy "Admins can manage categories" on public.categories
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read nonarchived usernames" on public.usernames;
create policy "Public can read nonarchived usernames" on public.usernames
for select to anon, authenticated using (is_archived = false or public.is_admin());
drop policy if exists "Admins can insert usernames" on public.usernames;
create policy "Admins can insert usernames" on public.usernames
for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update usernames" on public.usernames;
create policy "Admins can update usernames" on public.usernames
for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete usernames" on public.usernames;
create policy "Admins can delete usernames" on public.usernames
for delete to authenticated using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.usernames to anon, authenticated;
grant select on public.admins to authenticated;
grant insert, update, delete on public.categories to authenticated;
grant insert, update, delete on public.usernames to authenticated;

-- SETUP ADMIN:
-- 1) Create your user in Supabase Dashboard > Authentication > Users.
-- 2) Copy that user's UUID.
-- 3) Run the following, replacing the UUID:
-- insert into public.admins (user_id) values ('YOUR-AUTH-USER-UUID');
-- Never expose the service_role key in config.js or frontend code.
