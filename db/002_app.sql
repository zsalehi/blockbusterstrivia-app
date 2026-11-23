-- BlockBusters application tables. Mirrors the production Supabase schema
-- (roster-first model) with auth.users replaced by Better Auth's "user" table.
-- Row-level security is gone: permission checks live in src/lib/team-service.ts.

create table profiles (
  id             uuid primary key references "user" (id) on delete cascade,
  handle         text unique,
  full_name      text,
  avatar_url     text,
  role           text default 'player' check (role in ('admin', 'organizer', 'player')),
  phone          text,
  date_of_birth  date,
  created_at     timestamptz default now()
);

-- Every new login gets an empty profile row (replaces Supabase's handle_new_user trigger).
create function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, created_at) values (new.id, now()) on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql;

create trigger on_user_created after insert on "user"
  for each row execute function handle_new_user();

create table competitions (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text,
  status              text default 'upcoming' check (status in ('upcoming', 'active', 'complete')),
  registration_opens  timestamptz,
  registration_closes timestamptz,
  start_at            timestamptz,
  end_at              timestamptz,
  max_teams           integer,
  format              text default 'single_elim'
                      check (format in ('single_elim', 'double_elim', 'groups', 'swiss', 'custom')),
  created_by          uuid references "user" (id) on delete set null,
  created_at          timestamptz default now()
);

create table teams (
  id               uuid primary key default gen_random_uuid(),
  competition_id   uuid not null references competitions (id) on delete cascade,
  name             text not null,
  logo_url         text,
  captain_user_id  uuid references "user" (id) on delete set null,
  created_by       uuid references "user" (id) on delete set null,
  created_at       timestamptz default now(),
  unique (competition_id, name)
);

-- A roster slot. user_id stays null until that person logs in and accepts their invite.
create table team_members (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references teams (id) on delete cascade,
  user_id        uuid references "user" (id) on delete cascade,
  role           text default 'member' check (role in ('captain', 'member')),
  full_name      text not null,
  handle         text,
  phone          text,
  date_of_birth  date,
  member_email   text,
  created_at     timestamptz default now()
);
create index team_members_team_idx on team_members (team_id);
create index team_members_user_idx on team_members (user_id);

create table team_invitations (
  id               uuid primary key default gen_random_uuid(),
  competition_id   uuid not null references competitions (id) on delete cascade,
  team_id          uuid not null references teams (id) on delete cascade,
  inviter_user_id  uuid references "user" (id) on delete set null,
  invitee_email    text not null,
  invitee_user_id  uuid references "user" (id) on delete set null,
  role             text default 'member' check (role in ('member', 'captain')),
  token            text not null unique,
  status           text default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at       timestamptz not null default now() + interval '7 days',
  created_at       timestamptz not null default now(),
  team_member_id   uuid references team_members (id) on delete set null
);
create index team_invitations_team_idx on team_invitations (team_id);

-- One team per person per competition. Fires on insert and when a roster slot is claimed.
create function enforce_one_team_per_competition() returns trigger as $$
declare
  comp uuid;
begin
  if new.user_id is null then
    return new;
  end if;
  select competition_id into comp from teams where id = new.team_id;
  perform pg_advisory_xact_lock(hashtext(new.user_id::text || comp::text));
  if exists (
    select 1
    from team_members tm
    join teams t on t.id = tm.team_id
    where tm.user_id = new.user_id
      and t.competition_id = comp
      and tm.id <> new.id
  ) then
    raise exception 'User is already on a team for this competition'
      using errcode = '23505';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_one_team_per_comp
  before insert or update of user_id on team_members
  for each row execute function enforce_one_team_per_competition();

create view v_my_teams as
  select tm.user_id,
         t.competition_id,
         t.id   as team_id,
         t.name as team_name,
         t.captain_user_id,
         tm.role,
         t.created_at
  from team_members tm
  join teams t on t.id = tm.team_id;

-- Admin roster export. Contains phone numbers and dates of birth: never expose publicly.
create view v_competition_team_members as
  select c.title          as competition_title,
         t.name           as team_name,
         tm.full_name     as member_name,
         tm.role          as member_role,
         tm.member_email,
         tm.phone         as member_phone,
         tm.date_of_birth as member_date_of_birth,
         case when tm.date_of_birth is not null
              then extract(year from age(current_date::timestamptz, tm.date_of_birth::timestamptz))
              else null end as member_age,
         tm.created_at    as member_joined_at
  from competitions c
  join teams t on t.competition_id = c.id
  join team_members tm on tm.team_id = t.id
  order by c.title, t.name, tm.full_name;
