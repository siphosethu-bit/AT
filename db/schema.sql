-- Internet Athi community members and tour (city) requests
--
-- Run this once in the Supabase project's SQL editor (Database > SQL Editor > New query),
-- or via `supabase db push` if you manage migrations with the Supabase CLI.
--
-- These tables are written to exclusively by the /api/community-join and /api/tour-request
-- serverless functions using the service-role key, which bypasses Row Level Security entirely.
-- RLS is enabled below with no policies attached, so both tables are unreachable through the
-- public anon/authenticated API keys used in the browser. /api/tour-demand reads the aggregate
-- city_demand view the same way and returns only non-identifying counts to the public.

create extension if not exists pgcrypto;

-- community_members is the single source of truth for a fan's identity. A row exists here for
-- anyone who has either joined the community directly or submitted a city (tour) request —
-- `consent` is what actually governs whether they receive marketing communication.
create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),

  -- Fan-facing details
  first_name text not null,
  email text not null,
  city text not null,
  phone text,
  interests text[] not null default '{}'::text[],

  -- Consent (required for a community join, timestamped)
  consent boolean not null default false,
  consent_timestamp timestamptz,

  -- Attribution: where and how the signup happened
  source text not null default 'website',
  source_page text,
  signup_context text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Email is the primary identifier: one row per person, case-insensitively.
create unique index if not exists community_members_email_key
  on public.community_members (lower(email));

create index if not exists community_members_city_idx on public.community_members (city);
create index if not exists community_members_created_at_idx on public.community_members (created_at);

alter table public.community_members enable row level security;
-- Intentionally no policies: RLS is on and nothing grants access, so anon/authenticated
-- clients are denied by default. Only the service-role key (server-side only) can read or write.

-- tour_requests is "Bring Internet Athi to my city": a fan-identity FK plus a requested city, kept
-- separate from community_members so personal details are never duplicated across tables and a
-- fan can request more than one city. `notify_on_announcement` is a per-request consent, distinct
-- from `community_members.consent` (the general marketing opt-in) — a fan can ask for a city
-- without subscribing to anything else. Repeat requests for the same member+city increment
-- request_count instead of creating another row, so demand counts reflect unique fans.
create table if not exists public.tour_requests (
  id uuid primary key default gen_random_uuid(),
  community_member_id uuid not null references public.community_members(id) on delete cascade,

  requested_city text not null,
  requested_province text,
  requested_country text not null default 'South Africa',
  latitude double precision,
  longitude double precision,

  -- Reserved for a future demand -> tour lifecycle (requested / high_demand / event_planned /
  -- event_announced / tickets_live / event_completed). Not surfaced in the UI yet.
  status text not null default 'requested',

  notify_on_announcement boolean not null default false,
  notify_consent_timestamp timestamptz,

  source text not null default 'website',
  source_page text,
  signup_context text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,

  request_count integer not null default 1,
  first_requested_at timestamptz not null default now(),
  last_requested_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per fan per city, case-insensitively — repeat clicks bump request_count instead of
-- inflating the vote.
create unique index if not exists tour_requests_member_city_key
  on public.tour_requests (community_member_id, lower(requested_city));

create index if not exists tour_requests_city_idx on public.tour_requests (lower(requested_city));
create index if not exists tour_requests_created_at_idx on public.tour_requests (created_at);

alter table public.tour_requests enable row level security;
-- Intentionally no policies: service-role key only, same rationale as community_members.

-- Public, read-only aggregate for the Live Programme map and any future dashboard. Exposes a
-- city name, province and a unique-requester count only — no names, emails or individual rows.
create or replace view public.city_demand as
select
  requested_city as city,
  max(requested_province) as province,
  max(latitude) as latitude,
  max(longitude) as longitude,
  count(distinct community_member_id) as requester_count
from public.tour_requests
group by requested_city;
