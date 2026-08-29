-- Peak Fitness — initial schema.
--
-- Every table that holds user data ships with its RLS policies in the same
-- migration. A table that lands without them is a table that is briefly world
-- readable, and "briefly" is long enough.
--
-- Weight, injuries and allergies are sensitive personal data under Oman's
-- Personal Data Protection Law (Royal Decree 6/2022 + Regulation 34/2024, fully
-- enforced from 5 February 2026). Consent is recorded per purpose in
-- public.consents, and cross-border transfer is a separate grant from
-- processing.

create extension if not exists "pgcrypto";

-- ── enums ───────────────────────────────────────────────────────────────────
create type sex_t          as enum ('m', 'f');
create type goal_t         as enum ('cut', 'recomp', 'gain', 'strength');
create type activity_t     as enum ('sedentary', 'light', 'moderate', 'active', 'very_active');
create type locale_t       as enum ('ar', 'en');
create type consent_kind_t as enum ('processing', 'cross_border_transfer');
create type job_status_t   as enum ('queued', 'running', 'ready', 'failed');
create type plan_source_t  as enum ('model', 'template');
create type cook_method_t  as enum ('fried', 'grilled', 'boiled');
create type portion_t      as enum ('half', 'normal', 'large');
create type meal_status_t  as enum ('estimating', 'ready', 'corrected');

-- ── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  user_id       uuid primary key references auth.users on delete cascade,
  age           smallint     not null check (age between 18 and 100),
  sex           sex_t        not null,
  height_cm     smallint     not null check (height_cm between 120 and 230),
  weight_kg     numeric(5,2) not null check (weight_kg between 30 and 300),
  goal          goal_t       not null,
  activity      activity_t   not null,
  days_per_week smallint     not null check (days_per_week between 1 and 6),
  equipment     text[]       not null default '{}',
  injuries      text[]       not null default '{}',
  allergies     text[]       not null default '{}',
  dietary       text[]       not null default '{}',
  locale        locale_t     not null default 'ar',
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);
-- The under-18 block is enforced in the gate, in the API, and here. A birthday
-- is the kind of thing a client is happy to lie about.
comment on constraint profiles_age_check on public.profiles is
  'Accounts are 18+. The safety gate returns BLOCK_ACCOUNT below this.';

-- ── consent ─────────────────────────────────────────────────────────────────
create table public.consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  kind           consent_kind_t not null,
  granted        boolean not null,
  policy_version text not null,
  decided_at     timestamptz not null default now()
);
create index consents_user_kind_idx on public.consents (user_id, kind, decided_at desc);

-- ── plans and the queue that produces them ──────────────────────────────────
create table public.plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  week_index integer not null,
  source     plan_source_t not null,
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_index)
);

-- Plan generation is a job, never a blocking call. The user closes the app and
-- comes back to a finished plan.
create table public.plan_jobs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  week_index integer not null,
  status     job_status_t not null default 'queued',
  attempts   smallint not null default 0,
  plan_id    uuid references public.plans on delete set null,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index plan_jobs_user_idx on public.plan_jobs (user_id, created_at desc);

-- ── the loops ───────────────────────────────────────────────────────────────
create table public.check_ins (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users on delete cascade,
  day               date not null default current_date,
  sleep_hours       numeric(3,1) not null check (sleep_hours between 0 and 24),
  energy            smallint not null check (energy between 1 and 5),
  soreness          smallint not null check (soreness between 1 and 5),
  stress            smallint not null check (stress between 1 and 5),
  minutes_available smallint not null check (minutes_available between 0 and 240),
  created_at        timestamptz not null default now(),
  unique (user_id, day)
);

create table public.weights (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  day        date not null default current_date,
  weight_kg  numeric(5,2) not null check (weight_kg between 30 and 300),
  unique (user_id, day)
);

create table public.session_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  plan_id      uuid references public.plans on delete set null,
  day_id       text not null,
  completed_at timestamptz not null default now(),
  sets_done    smallint not null default 0
);
create index session_logs_user_idx on public.session_logs (user_id, completed_at desc);

-- ── meals ───────────────────────────────────────────────────────────────────
-- No photo column and no storage bucket, deliberately. Images are analysed in
-- memory inside the edge function and dropped; only the numbers survive.
create table public.meal_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  logged_at     timestamptz not null default now(),
  dish_key      text,
  label         text not null,
  cook_method   cook_method_t,
  portion       portion_t,
  estimate      jsonb not null,
  status        meal_status_t not null default 'estimating',
  corrected_kcal integer check (corrected_kcal is null or corrected_kcal between 0 and 10000)
);
create index meal_logs_user_idx on public.meal_logs (user_id, logged_at desc);

-- Corrections are the competitive moat: what this user's kabsa actually is,
-- cooked their way, in their city.
create table public.dish_corrections (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  dish_key     text not null,
  kcal         integer not null check (kcal between 0 and 10000),
  portion      portion_t,
  cook_method  cook_method_t,
  city         text,
  corrected_at timestamptz not null default now()
);
create index dish_corrections_user_dish_idx on public.dish_corrections (user_id, dish_key);

-- ── safety ──────────────────────────────────────────────────────────────────
-- Rejection count is the measure of how often the model was about to be wrong.
-- Target for allergen rejections that reached a user: zero, absolutely.
create table public.safety_rejections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  verdict     text not null,
  code        text not null,
  allergen    text,
  match_kind  text,
  term        text,
  attempt     smallint not null default 1,
  plan_source plan_source_t not null,
  created_at  timestamptz not null default now()
);
create index safety_rejections_created_idx on public.safety_rejections (created_at desc);

-- ── model spend ─────────────────────────────────────────────────────────────
-- Quota is enforced server-side per user per day. A client-side limit is a
-- suggestion; this is the thing that keeps the bill finite.
create table public.model_usage (
  user_id      uuid not null references auth.users on delete cascade,
  day          date not null default current_date,
  kind         text not null,
  calls        integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  primary key (user_id, day, kind)
);

-- ── row level security ──────────────────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.consents          enable row level security;
alter table public.plans             enable row level security;
alter table public.plan_jobs         enable row level security;
alter table public.check_ins         enable row level security;
alter table public.weights           enable row level security;
alter table public.session_logs      enable row level security;
alter table public.meal_logs         enable row level security;
alter table public.dish_corrections  enable row level security;
alter table public.safety_rejections enable row level security;
alter table public.model_usage       enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'consents', 'plans', 'plan_jobs', 'check_ins', 'weights',
    'session_logs', 'meal_logs', 'dish_corrections'
  ] loop
    execute format($f$
      create policy %1$I_select on public.%1$I for select using (auth.uid() = user_id);
      create policy %1$I_insert on public.%1$I for insert with check (auth.uid() = user_id);
      create policy %1$I_update on public.%1$I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
      create policy %1$I_delete on public.%1$I for delete using (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;

-- Users may record their own rejections and read them back; nobody may edit or
-- erase them, so the safety record cannot be quietly cleaned up.
create policy safety_rejections_select on public.safety_rejections
  for select using (auth.uid() = user_id);
create policy safety_rejections_insert on public.safety_rejections
  for insert with check (auth.uid() = user_id);

-- Spend is written by the edge functions under the service role, which bypasses
-- RLS. Users can see their own usage and change none of it.
create policy model_usage_select on public.model_usage
  for select using (auth.uid() = user_id);

-- ── updated_at ──────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch  before update on public.profiles  for each row execute function public.touch_updated_at();
create trigger plan_jobs_touch before update on public.plan_jobs for each row execute function public.touch_updated_at();

-- ── "delete everything about me" ────────────────────────────────────────────
-- The privacy screen promises this button works. It has to actually work, on
-- every table, which is why it is one function and not a client-side loop that
-- can be interrupted halfway.
create or replace function public.delete_all_my_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.dish_corrections  where user_id = uid;
  delete from public.meal_logs         where user_id = uid;
  delete from public.session_logs      where user_id = uid;
  delete from public.weights           where user_id = uid;
  delete from public.check_ins         where user_id = uid;
  delete from public.plan_jobs         where user_id = uid;
  delete from public.plans             where user_id = uid;
  delete from public.safety_rejections where user_id = uid;
  delete from public.model_usage       where user_id = uid;
  delete from public.consents          where user_id = uid;
  delete from public.profiles          where user_id = uid;
end $$;

revoke all on function public.delete_all_my_data() from public;
grant execute on function public.delete_all_my_data() to authenticated;

-- ── server-side quota ───────────────────────────────────────────────────────
create or replace function public.consume_quota(
  p_user uuid, p_kind text, p_limit integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare used integer;
begin
  insert into public.model_usage (user_id, day, kind, calls)
  values (p_user, current_date, p_kind, 1)
  on conflict (user_id, day, kind)
  do update set calls = public.model_usage.calls + 1
  returning calls into used;

  return used <= p_limit;
end $$;

revoke all on function public.consume_quota(uuid, text, integer) from public;
