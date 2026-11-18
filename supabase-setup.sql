-- ============================================================
--  مغز دوم · Second Brain — Supabase setup (run once in SQL Editor)
-- ============================================================

-- 1) Main state: one row per user, whole brain as JSON
create table if not exists public.brain_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  device     text,
  updated_at timestamptz not null default now()
);

-- 2) Daily backups (version history)
create table if not exists public.brain_backups (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null,
  device     text,
  created_at timestamptz not null default now()
);
create index if not exists brain_backups_user_idx on public.brain_backups (user_id, created_at desc);

-- 3) Row Level Security: each user can only see/change their own rows
alter table public.brain_state   enable row level security;
alter table public.brain_backups enable row level security;

drop policy if exists "own state select" on public.brain_state;
drop policy if exists "own state insert" on public.brain_state;
drop policy if exists "own state update" on public.brain_state;
drop policy if exists "own state delete" on public.brain_state;
create policy "own state select" on public.brain_state for select using (auth.uid() = user_id);
create policy "own state insert" on public.brain_state for insert with check (auth.uid() = user_id);
create policy "own state update" on public.brain_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own state delete" on public.brain_state for delete using (auth.uid() = user_id);

drop policy if exists "own backups select" on public.brain_backups;
drop policy if exists "own backups insert" on public.brain_backups;
drop policy if exists "own backups delete" on public.brain_backups;
create policy "own backups select" on public.brain_backups for select using (auth.uid() = user_id);
create policy "own backups insert" on public.brain_backups for insert with check (auth.uid() = user_id);
create policy "own backups delete" on public.brain_backups for delete using (auth.uid() = user_id);

-- 4) Realtime: instant sync between phone and laptop
do $$ begin
  alter publication supabase_realtime add table public.brain_state;
exception when duplicate_object then null; end $$;

-- 5) Keep only the last 60 backups per user
create or replace function public.trim_brain_backups() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.brain_backups b
   where b.user_id = new.user_id
     and b.id not in (select id from public.brain_backups where user_id = new.user_id order by created_at desc limit 60);
  return new;
end $$;
drop trigger if exists trim_brain_backups_trg on public.brain_backups;
create trigger trim_brain_backups_trg after insert on public.brain_backups for each row execute function public.trim_brain_backups();
