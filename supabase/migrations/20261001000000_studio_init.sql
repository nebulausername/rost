-- Röstbrüder Studio – Phase 2: Mehrbenutzer-Schema für Supabase
-- Spiegelt das Datenmodell aus studio/src/lib/types.ts.
-- Noch NICHT angewendet – bewusst als Vorlage für den Umzug von localStorage nach Supabase.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Rollen & Team
-- ---------------------------------------------------------------------------
create type studio_role as enum ('owner', 'editor', 'viewer');

create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  role_label  text not null default '',          -- z. B. „Mitgründer · Röster“
  initials    text not null default '',
  color       text not null default '#c4702f',
  role        studio_role not null default 'editor',
  created_at  timestamptz not null default now()
);

-- Hilfsfunktionen für RLS
create or replace function studio_is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid());
$$;

create or replace function studio_my_role() returns studio_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function studio_can_edit() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('owner', 'editor'));
$$;

-- ---------------------------------------------------------------------------
-- Enums aus dem Frontend
-- ---------------------------------------------------------------------------
create type platform        as enum ('facebook', 'instagram', 'tiktok', 'google', 'pinterest', 'newsletter', 'linkedin', 'youtube');
create type post_format     as enum ('feed', 'carousel', 'reel', 'story', 'video', 'text', 'offer', 'event');
create type post_status     as enum ('idea', 'draft', 'review', 'approved', 'scheduled', 'published');
create type pillar          as enum ('bohne', 'roesten', 'cafe', 'bruehen', 'brueder', 'events', 'shop');
create type post_location   as enum ('roesterei', 'espressobar', 'online', 'extern');
create type campaign_goal   as enum ('awareness', 'traffic', 'sales', 'visits', 'leads', 'engagement');
create type ad_channel      as enum ('meta', 'influencer', 'tiktok', 'google', 'pinterest', 'local', 'email', 'print');
create type campaign_status as enum ('planned', 'active', 'paused', 'completed');
create type keydate_kind    as enum ('kaffee', 'weimar', 'handel', 'feiertag', 'intern');

-- ---------------------------------------------------------------------------
-- Kampagnen & Werbung
-- ---------------------------------------------------------------------------
create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  objective     campaign_goal not null,
  channels      ad_channel[] not null default '{}',
  status        campaign_status not null default 'planned',
  start_date    date not null,
  end_date      date not null,
  budget        numeric(10, 2) not null check (budget >= 0),
  daily_limit   numeric(10, 2),
  audience      text not null default '',
  radius_km     int,
  age_min       int not null default 18,
  age_max       int not null default 65,
  interests     text[] not null default '{}',
  offer         text not null default '',
  landing_url   text not null default '',
  utm_source    text not null default '',
  utm_medium    text not null default '',
  utm_campaign  text not null default '',
  target_ctr    numeric(6, 4),
  target_cpc    numeric(10, 2),
  target_cpa    numeric(10, 2),
  target_roas   numeric(6, 2),
  notes         text not null default '',
  external_ids  jsonb not null default '{}',     -- Meta/Google-Kampagnen-IDs für den Import
  created_by    uuid references profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_date >= start_date)
);

create table campaign_daily_stats (
  campaign_id  uuid not null references campaigns (id) on delete cascade,
  day          date not null,
  spend        numeric(10, 2) not null default 0,
  impressions  int not null default 0,
  clicks       int not null default 0,
  conversions  int not null default 0,
  revenue      numeric(10, 2) not null default 0,
  source       text not null default 'manual',   -- manual | meta_api | google_ads_api
  primary key (campaign_id, day)
);

create table budget_plan (
  month    date not null,                         -- immer der 1. des Monats
  channel  ad_channel not null,
  amount   numeric(10, 2) not null default 0 check (amount >= 0),
  primary key (month, channel)
);

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
create table posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  caption       text not null default '',
  platforms     platform[] not null default '{instagram}',
  format        post_format not null default 'feed',
  status        post_status not null default 'draft',
  pillar        pillar not null,
  scheduled_at  timestamptz not null,
  location      post_location not null default 'online',
  assignee_id   uuid references profiles (id) on delete set null,
  hashtags      text[] not null default '{}',
  media_path    text,                             -- Supabase Storage: bucket „post-media“
  media_tone    text not null default 'espresso',
  campaign_id   uuid references campaigns (id) on delete set null,
  link          text,
  notes         text not null default '',
  checklist     jsonb not null default '[]',      -- [{id, label, done}]
  metrics       jsonb,                            -- {reach, impressions, likes, comments, shares, saves, clicks}
  external_ids  jsonb not null default '{}',      -- IDs der veröffentlichten Beiträge je Kanal
  created_by    uuid references profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index posts_scheduled_at_idx on posts (scheduled_at);
create index posts_status_idx on posts (status);

-- Freigabe-Workflow: jede Statusänderung & jeder Kommentar wird protokolliert
create table post_activity (
  id          bigint generated always as identity primary key,
  post_id     uuid not null references posts (id) on delete cascade,
  actor_id    uuid references profiles (id),
  kind        text not null check (kind in ('status', 'comment', 'approval', 'publish_error')),
  from_status post_status,
  to_status   post_status,
  body        text,
  created_at  timestamptz not null default now()
);

create table ideas (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null default '',
  pillar       pillar not null,
  platforms    platform[] not null default '{}',
  format       post_format not null default 'feed',
  effort       text not null default 'M' check (effort in ('S', 'M', 'L')),
  key_date_id  text,
  created_by   uuid references profiles (id),
  created_at   timestamptz not null default now()
);

create table idea_votes (
  idea_id  uuid not null references ideas (id) on delete cascade,
  user_id  uuid not null references profiles (id) on delete cascade,
  primary key (idea_id, user_id)
);

create table key_dates (
  id      text primary key,
  title   text not null,
  kind    keydate_kind not null,
  rule    jsonb not null,                         -- {type: fixed|easter|nth-weekday|advent, …}
  angle   text not null default '',
  verify  boolean not null default false
);

create table hashtag_sets (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  tags  text[] not null default '{}'
);

create table caption_templates (
  id      uuid primary key default gen_random_uuid(),
  name    text not null,
  pillar  pillar,
  body    text not null
);

-- ---------------------------------------------------------------------------
-- Kanäle & Kennzahlen
-- ---------------------------------------------------------------------------
create table channel_accounts (
  platform   platform primary key,
  handle     text not null default '',
  connected  boolean not null default false,
  followers  int not null default 0
);

-- Zugangsdaten für API-Anbindungen liegen NICHT hier, sondern in Supabase Vault
-- bzw. als Edge-Function-Secrets.

create table follower_snapshots (
  platform  platform not null references channel_accounts (platform) on delete cascade,
  day       date not null,
  value     int not null,
  primary key (platform, day)
);

-- ---------------------------------------------------------------------------
-- updated_at automatisch pflegen
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_touch before update on posts for each row execute function touch_updated_at();
create trigger campaigns_touch before update on campaigns for each row execute function touch_updated_at();

-- Statuswechsel automatisch protokollieren
create or replace function log_post_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into post_activity (post_id, actor_id, kind, from_status, to_status)
    values (new.id, auth.uid(), 'status', old.status, new.status);
  end if;
  return new;
end;
$$;

create trigger posts_status_log after update on posts for each row execute function log_post_status();

-- ---------------------------------------------------------------------------
-- Row Level Security: Team liest alles, Editor:innen schreiben, Viewer nur lesen
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'campaigns', 'campaign_daily_stats', 'budget_plan', 'posts', 'post_activity', 'ideas',
    'idea_votes', 'key_dates', 'hashtag_sets', 'caption_templates', 'channel_accounts', 'follower_snapshots'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "team_read" on %I for select to authenticated using (studio_is_member())', t);
    execute format('create policy "editor_insert" on %I for insert to authenticated with check (studio_can_edit())', t);
    execute format('create policy "editor_update" on %I for update to authenticated using (studio_can_edit()) with check (studio_can_edit())', t);
    execute format('create policy "editor_delete" on %I for delete to authenticated using (studio_can_edit())', t);
  end loop;
end $$;

alter table profiles enable row level security;
create policy "profiles_read" on profiles for select to authenticated using (studio_is_member());
create policy "profiles_self_update" on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = studio_my_role());
