-- OwnBooks remote schema: auth + progress sync only. Book files never reach the
-- server. Every table is owned by auth.users and protected by row-level security.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Server-side change time, used as the sync pull cursor. Client clocks only
-- decide last-write-wins; they never decide what gets pulled.
create or replace function public.touch_server_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at := now();
  return new;
end;
$$;

-- Last write wins: an update carrying an older client timestamp than the row
-- already holds is dropped silently (the upsert simply affects no row).
create or replace function public.reject_stale_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at < old.updated_at then
    return null;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Devices
-- ---------------------------------------------------------------------------

create table public.devices (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  name         text not null check (char_length(name) between 1 and 100),
  platform     text not null check (platform in ('ios', 'android')),
  last_seen_at timestamptz not null default now(),
  unique (id, user_id)
);

create index devices_user on public.devices (user_id);

-- ---------------------------------------------------------------------------
-- Books (minimal metadata; never files or covers)
-- ---------------------------------------------------------------------------

create table public.books (
  user_id           uuid not null default auth.uid() references auth.users on delete cascade,
  fingerprint       text not null check (char_length(fingerprint) = 64),
  type              text not null check (type in ('audio', 'ebook')),
  title             text not null check (char_length(title) between 1 and 500),
  author            text check (char_length(author) <= 500),
  duration_ms       bigint check (duration_ms >= 0),
  created_at        timestamptz not null default now(),
  -- Client timestamp of the last metadata change (last write wins).
  updated_at        timestamptz not null,
  -- "Remove from all devices" leaves a tombstone so other devices learn about it.
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, fingerprint)
);

create index books_pull on public.books (user_id, server_updated_at);

create trigger books_reject_stale before update on public.books
  for each row execute function public.reject_stale_write();
create trigger books_touch before insert or update on public.books
  for each row execute function public.touch_server_updated_at();

-- ---------------------------------------------------------------------------
-- Progress
-- ---------------------------------------------------------------------------

create table public.progress (
  user_id           uuid not null default auth.uid(),
  fingerprint       text not null,
  track_idx         int check (track_idx >= 0),
  position_ms       bigint check (position_ms >= 0),
  cfi               text check (char_length(cfi) <= 2000),
  fraction          real not null default 0 check (fraction between 0 and 1),
  speed             real check (speed between 0.5 and 3),
  finished_at       timestamptz,
  device_id         uuid,
  device_name       text check (char_length(device_name) <= 100),
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, fingerprint),
  foreign key (user_id, fingerprint) references public.books on delete cascade,
  -- A device can only be referenced by its own user.
  foreign key (device_id, user_id) references public.devices (id, user_id)
    on delete set null (device_id)
);

create index progress_pull on public.progress (user_id, server_updated_at);

create trigger progress_reject_stale before update on public.progress
  for each row execute function public.reject_stale_write();
create trigger progress_touch before insert or update on public.progress
  for each row execute function public.touch_server_updated_at();

-- ---------------------------------------------------------------------------
-- Activity: daily totals per device, deliberately not linked to any book.
-- ---------------------------------------------------------------------------

create table public.activity_days (
  user_id           uuid not null default auth.uid(),
  device_id         uuid not null,
  day               date not null,
  listen_s          int not null default 0 check (listen_s between 0 and 86400),
  read_s            int not null default 0 check (read_s between 0 and 86400),
  finished_count    int not null default 0 check (finished_count between 0 and 1000),
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, device_id, day),
  foreign key (device_id, user_id) references public.devices (id, user_id) on delete cascade
);

create index activity_days_pull on public.activity_days (user_id, server_updated_at);

create trigger activity_days_reject_stale before update on public.activity_days
  for each row execute function public.reject_stale_write();
create trigger activity_days_touch before insert or update on public.activity_days
  for each row execute function public.touch_server_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security: every row belongs to exactly one user.
-- ---------------------------------------------------------------------------

alter table public.devices enable row level security;
alter table public.books enable row level security;
alter table public.progress enable row level security;
alter table public.activity_days enable row level security;

create policy "own devices" on public.devices for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own books" on public.books for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own progress" on public.progress for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own activity" on public.activity_days for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Signed-out clients get nothing at all.
revoke all on public.devices, public.books, public.progress, public.activity_days from anon;
revoke execute on function public.touch_server_updated_at() from anon, authenticated, public;
revoke execute on function public.reject_stale_write() from anon, authenticated, public;
