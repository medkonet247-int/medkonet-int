
-- ROLES
create type public.app_role as enum ('admin', 'member');
create type public.application_status as enum ('Pending', 'Approved', 'Rejected');
create type public.university_type as enum ('Federal', 'State', 'Private');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null unique check (email = lower(email)),
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid());
create policy "Users read own profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- ADMIN ALLOWLIST
create table public.admin_allowlist (
  email text primary key check (email = lower(email)),
  granted_by uuid,
  is_protected boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.admin_allowlist to authenticated;
grant all on public.admin_allowlist to service_role;
alter table public.admin_allowlist enable row level security;
create policy "Admins read allowlist" on public.admin_allowlist for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

insert into public.admin_allowlist (email, granted_by, is_protected) values ('bionicz115@gmail.com', null, true);

create or replace function public.protect_allowlist()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.is_protected then
    raise exception 'The first administrator cannot be removed or changed';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger protect_allowlist_trg before update or delete on public.admin_allowlist
  for each row execute function public.protect_allowlist();

create or replace function public.protect_first_admin_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and exists (
    select 1 from public.profiles p join public.admin_allowlist a on a.email = p.email
    where p.id = old.user_id and a.is_protected) then
    raise exception 'The first administrator cannot be removed';
  end if;
  return old;
end $$;
create trigger protect_first_admin_role_trg before delete on public.user_roles
  for each row execute function public.protect_first_admin_role();

-- APPLICATIONS
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email = lower(email) and char_length(email) <= 255),
  whatsapp_number text not null check (whatsapp_number ~ '^\+[1-9][0-9]{7,14}$'),
  university text not null check (char_length(university) between 2 and 160),
  university_type public.university_type not null,
  state text not null check (char_length(state) between 2 and 40),
  course text not null check (char_length(course) between 2 and 120),
  current_level text not null check (char_length(current_level) between 1 and 40),
  reason_for_joining text not null check (char_length(reason_for_joining) between 50 and 1000),
  application_status public.application_status not null default 'Pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
create index applications_status_idx on public.applications (application_status);
create index applications_submitted_idx on public.applications (submitted_at desc);
grant select, update on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;
create policy "Applicants read own application" on public.applications for select to authenticated
  using (user_id = auth.uid());
create policy "Admins read all applications" on public.applications for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update applications" on public.applications for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- AUDIT LOG
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "Admins read audit log" on public.audit_log for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Review guard: only status may change; stamps reviewer + time; writes audit
create or replace function public.applications_review_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_user = 'service_role' or auth.uid() is null then
    return new;
  end if;
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not allowed';
  end if;
  if (new.user_id, new.full_name, new.email, new.whatsapp_number, new.university, new.university_type,
      new.state, new.course, new.current_level, new.reason_for_joining, new.submitted_at)
     is distinct from
     (old.user_id, old.full_name, old.email, old.whatsapp_number, old.university, old.university_type,
      old.state, old.course, old.current_level, old.reason_for_joining, old.submitted_at) then
    raise exception 'Only the application status can be changed';
  end if;
  if new.application_status is distinct from old.application_status then
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
    insert into public.audit_log (actor_id, action, target_id, details)
    values (auth.uid(), 'application_' || lower(new.application_status::text), new.id,
      jsonb_build_object('from', old.application_status, 'to', new.application_status));
    if new.application_status = 'Approved' then
      insert into public.user_roles (user_id, role) values (new.user_id, 'member') on conflict do nothing;
    else
      delete from public.user_roles where user_id = new.user_id and role = 'member';
    end if;
  else
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
  end if;
  return new;
end $$;
create trigger applications_review_guard_trg before update on public.applications
  for each row execute function public.applications_review_guard();

-- MEMBER CHECK
create or replace function public.is_approved_member(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'admin') or exists (
    select 1 from public.applications where user_id = _user_id and application_status = 'Approved')
$$;

-- MEMBERS-ONLY CONTENT
create table public.member_pages (
  slug text primary key,
  title text not null,
  intro text not null,
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
grant select on public.member_pages to authenticated;
grant all on public.member_pages to service_role;
alter table public.member_pages enable row level security;
create policy "Approved members read member pages" on public.member_pages for select to authenticated
  using (public.is_approved_member(auth.uid()));

insert into public.member_pages (slug, title, intro, sections) values
('community', 'Community',
 'The MedKonet community exists so Medicine and Surgery students from different universities can support one another, ask honest questions and learn together without unhealthy competition.',
 '[{"heading":"Our purpose","body":"To connect students across federal, state and private universities in Nigeria for peer learning, resource sharing, encouragement and meaningful friendships."},{"heading":"Our values","body":"Collaboration, compassion, academic excellence, belonging, integrity and growth guide how we treat one another."},{"heading":"How to take part","body":"Be respectful and kind. Share knowledge generously. Credit others for their work. Keep other members'' personal information private. Ask for help when you need it, and offer help when you can."},{"heading":"WhatsApp community","body":"Conversations happen in our WhatsApp community. Approved members are invited by the MedKonet team using the WhatsApp number provided in their application. If you have been approved but have not yet received an invitation, please reach out through the Contact page."}]'),
('resources', 'Academic Resources',
 'This space is being prepared for members to share study materials, notes and helpful references with one another.',
 '[{"heading":"What this will be","body":"A place where members can find and share academic materials contributed by the community."},{"heading":"Current status","body":"No resources have been published here yet. In the meantime, members share and discuss materials within the WhatsApp community."},{"heading":"Sharing responsibly","body":"Only share materials you have the right to share, and always credit the original authors."}]'),
('mentorship', 'Mentorship',
 'MedKonet hopes to connect students with experienced peers, senior students and medical professionals who can offer guidance.',
 '[{"heading":"Our vision","body":"We would like to build a mentorship initiative where students can receive guidance on studying, examinations, wellbeing and career direction."},{"heading":"Current status","body":"The mentorship programme has not launched yet and no mentors have been assigned. We will share updates with members when it is ready."}]'),
('events', 'Events and Programmes',
 'In future, MedKonet intends to host academic sessions, collaborative study events and programmes for members.',
 '[{"heading":"What to expect","body":"Event announcements will be shared with approved members when they are planned."},{"heading":"Current status","body":"There are no scheduled events at this time."}]'),
('representatives', 'University Representatives',
 'We are proposing a University Representatives programme to help MedKonet grow chapters across Nigerian universities.',
 '[{"heading":"The proposed programme","body":"Representatives would help welcome new members from their universities, share information and support community activities."},{"heading":"Current status","body":"This programme is a proposal. No representatives have been appointed yet."}]');

-- PRIVATE SERVER-ONLY TABLES (no policies: only service role reaches them)
create table public.pending_registrations (
  user_id uuid primary key,
  email text not null unique check (email = lower(email)),
  data jsonb not null,
  created_at timestamptz not null default now()
);
grant all on public.pending_registrations to service_role;
alter table public.pending_registrations enable row level security;

create table public.verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  code_hash text not null,
  token_hash text not null unique,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  invalidated_at timestamptz,
  request_ip text,
  created_at timestamptz not null default now()
);
create index verification_codes_email_idx on public.verification_codes (email, created_at desc);
create index verification_codes_ip_idx on public.verification_codes (request_ip, created_at desc);
grant all on public.verification_codes to service_role;
alter table public.verification_codes enable row level security;

create table public.rate_events (
  id bigserial primary key,
  kind text not null,
  key text not null,
  created_at timestamptz not null default now()
);
create index rate_events_idx on public.rate_events (kind, key, created_at desc);
grant all on public.rate_events to service_role;
grant usage on sequence public.rate_events_id_seq to service_role;
alter table public.rate_events enable row level security;

-- Atomic completion after verification (service role only)
create or replace function public.complete_registration(_user_id uuid, _dev_mode boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  p public.pending_registrations;
  v_email text;
  v_name text;
begin
  select * into p from public.pending_registrations where user_id = _user_id for update;
  if not found then
    if public.has_role(_user_id, 'admin') then return 'admin'; end if;
    if exists (select 1 from public.applications where user_id = _user_id) then return 'applicant'; end if;
    raise exception 'No pending registration';
  end if;
  v_email := p.email;
  v_name := p.data->>'full_name';
  insert into public.profiles (id, full_name, email) values (_user_id, v_name, v_email)
    on conflict (id) do nothing;
  if not _dev_mode and exists (select 1 from public.admin_allowlist where email = v_email) then
    insert into public.user_roles (user_id, role) values (_user_id, 'admin') on conflict do nothing;
    insert into public.audit_log (actor_id, action, target_id, details)
      values (_user_id, 'admin_granted_from_allowlist', _user_id, jsonb_build_object('email', v_email));
    delete from public.pending_registrations where user_id = _user_id;
    return 'admin';
  end if;
  insert into public.applications (user_id, full_name, email, whatsapp_number, university, university_type,
    state, course, current_level, reason_for_joining)
  values (_user_id, v_name, v_email, p.data->>'whatsapp_number', p.data->>'university',
    (p.data->>'university_type')::public.university_type, p.data->>'state', p.data->>'course',
    p.data->>'current_level', p.data->>'reason_for_joining')
  on conflict (user_id) do nothing;
  insert into public.audit_log (actor_id, action, target_id) values (_user_id, 'application_submitted', _user_id);
  delete from public.pending_registrations where user_id = _user_id;
  return 'applicant';
end $$;
revoke all on function public.complete_registration(uuid, boolean) from public, anon, authenticated;
grant execute on function public.complete_registration(uuid, boolean) to service_role;

-- Lookup auth user status by email (service role only)
create or replace function public.auth_user_status(_email text)
returns table (user_id uuid, confirmed boolean) language sql stable security definer set search_path = public, auth as $$
  select id, email_confirmed_at is not null from auth.users where lower(email) = lower(_email) limit 1
$$;
revoke all on function public.auth_user_status(text) from public, anon, authenticated;
grant execute on function public.auth_user_status(text) to service_role;
