-- CyberPath: схема прогресса. Выполнить целиком в Supabase -> SQL Editor -> New query -> Run.

create table if not exists public.progress (
  user_id     uuid not null references auth.users on delete cascade,
  atom_id     text not null,
  mastery     int  not null default 0,
  due         timestamptz,
  right_count int  not null default 0,
  wrong_count int  not null default 0,
  seen        int  not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, atom_id)
);

create table if not exists public.lesson_reads (
  user_id   uuid not null references auth.users on delete cascade,
  lesson_id text not null,
  read_at   timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.island_results (
  user_id    uuid not null references auth.users on delete cascade,
  island_id  text not null,
  best_score int  not null default 0,
  attempts   int  not null default 0,
  passed     boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, island_id)
);

create table if not exists public.user_stats (
  user_id     uuid primary key references auth.users on delete cascade,
  xp          int not null default 0,
  streak      int not null default 0,
  last_active date,
  updated_at  timestamptz not null default now()
);

alter table public.progress        enable row level security;
alter table public.lesson_reads    enable row level security;
alter table public.island_results  enable row level security;
alter table public.user_stats      enable row level security;

-- каждый видит и меняет только свои строки
drop policy if exists own_progress on public.progress;
create policy own_progress on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists own_lesson_reads on public.lesson_reads;
create policy own_lesson_reads on public.lesson_reads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists own_island_results on public.island_results;
create policy own_island_results on public.island_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists own_user_stats on public.user_stats;
create policy own_user_stats on public.user_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists progress_user_due_idx on public.progress (user_id, due);
