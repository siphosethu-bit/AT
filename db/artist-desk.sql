-- Additive migration. Run after schema.sql. No anonymous or authenticated browser access.
create table if not exists public.booking_enquiries (
  id uuid primary key,
  reference text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  status text not null default 'new' check (status in ('new','reviewing','confirmed','declined')),
  details jsonb not null,
  email text not null,
  private_notes text not null default '',
  requester_hash text not null,
  consent_at timestamptz not null default now()
);
alter table public.booking_enquiries enable row level security;
revoke all on public.booking_enquiries from anon, authenticated;
grant select, insert, update, delete on public.booking_enquiries to service_role;
create index if not exists booking_created_idx on public.booking_enquiries(created_at desc);
create index if not exists booking_email_idx on public.booking_enquiries(email, created_at);
create index if not exists booking_requester_idx on public.booking_enquiries(requester_hash, created_at);

create or replace function public.submit_booking_brief(p_id uuid, p_details jsonb, p_requester_hash text)
returns text language plpgsql security invoker set search_path = public as $$
declare v_reference text; v_email text := lower(p_details->>'email');
begin
  -- A single transaction serialises repeat submissions from this source, including retries.
  perform pg_advisory_xact_lock(hashtextextended(p_requester_hash, 0));
  perform pg_advisory_xact_lock(hashtextextended(v_email, 1));
  select reference into v_reference from booking_enquiries where id = p_id;
  if v_reference is not null then return v_reference; end if;
  if (select count(*) from booking_enquiries where email = v_email and created_at > now() - interval '1 day') >= 5
     or (select count(*) from booking_enquiries where requester_hash = p_requester_hash and created_at > now() - interval '1 day') >= 20 then
    raise exception 'submission_limit';
  end if;
  v_reference := 'IA-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(p_id::text, '-', ''), 1, 10));
  insert into booking_enquiries(id, reference, details, email, requester_hash)
  values (p_id, v_reference, p_details, v_email, p_requester_hash);
  return v_reference;
end;
$$;
revoke all on function public.submit_booking_brief(uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.submit_booking_brief(uuid,jsonb,text) to service_role;
