-- Run after artist-desk.sql. Entries are private until an authorised artist publishes them.
create table if not exists public.site_content (
  id text primary key,
  kind text not null check (kind in ('show','release')),
  state text not null default 'draft' check (state in ('draft','published')),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.site_content enable row level security;
revoke all on public.site_content from anon, authenticated;
grant select,insert,update,delete on public.site_content to service_role;
create index if not exists site_content_state_idx on public.site_content(state,updated_at desc);
-- Artwork is public media, never private booking attachments. Uploads go through the protected API.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('artist-media','artist-media',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
-- Do not add anonymous storage write policies. The service_role performs uploads on the server.
