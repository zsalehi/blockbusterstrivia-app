-- Admin and organizer portals: communities (organizations) that run competitions.
-- Platform admins are profiles.role = 'admin' (see scripts/make-admin.mjs).
-- Permission checks live in src/lib/authz.ts and src/lib/portal-service.ts.

create table organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description  text,
  created_at   timestamptz not null default now()
);

-- owner: manages members and competitions. manager: manages competitions only.
create table organization_members (
  organization_id  uuid not null references organizations (id) on delete cascade,
  user_id          uuid not null references "user" (id) on delete cascade,
  role             text not null default 'manager' check (role in ('owner', 'manager')),
  created_at       timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on organization_members (user_id);

alter table competitions add column organization_id uuid references organizations (id) on delete restrict;
create index competitions_org_idx on competitions (organization_id);

-- The original BlockBusters competitions belong to this organization.
insert into organizations (name, slug, description)
values ('BlockBusters Trivia', 'blockbusters', 'The original BlockBusters trivia competition for the Toronto Shi''a community.');

update competitions set organization_id = (select id from organizations where slug = 'blockbusters')
 where organization_id is null;

-- Who did what to sensitive data (exports, role changes, deletions).
create table audit_log (
  id          bigserial primary key,
  actor_id    uuid references "user" (id) on delete set null,
  actor_email text,
  action      text not null,
  target      text,
  detail      text,
  created_at  timestamptz not null default now()
);
create index audit_log_created_idx on audit_log (created_at desc);
