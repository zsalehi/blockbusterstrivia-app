-- BlockBusters application tables.
-- Columns match what the app's queries use. If you restore a real dump from the
-- old Supabase project instead, skip this file and see scripts/import-supabase.mjs.

create table competitions (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text,
  status              text,
  registration_opens  timestamptz,
  registration_closes timestamptz,
  start_at            timestamptz,
  end_at              timestamptz,
  created_at          timestamptz not null default now()
);

create table teams (
  id               uuid primary key default gen_random_uuid(),
  competition_id   uuid not null references competitions (id) on delete cascade,
  name             text not null,
  captain_user_id  uuid not null references "user" (id),
  created_by       uuid references "user" (id),
  logo_url         text,
  created_at       timestamptz not null default now()
);
create index teams_competition_idx on teams (competition_id);

create table team_members (
  team_id    uuid not null references teams (id) on delete cascade,
  user_id    uuid not null references "user" (id) on delete cascade,
  role       text not null default 'member' check (role in ('captain', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index team_members_user_idx on team_members (user_id);

create table team_invitations (
  id               uuid primary key default gen_random_uuid(),
  team_id          uuid not null references teams (id) on delete cascade,
  competition_id   uuid not null references competitions (id) on delete cascade,
  inviter_user_id  uuid references "user" (id),
  invitee_user_id  uuid references "user" (id),
  invitee_email    text not null,
  role             text not null default 'member',
  token            text not null unique,
  status           text not null default 'pending'
                   check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at       timestamptz not null default now() + interval '7 days',
  created_at       timestamptz not null default now()
);
create index team_invitations_team_idx on team_invitations (team_id);
create unique index team_invitations_one_pending
  on team_invitations (team_id, lower(invitee_email)) where status = 'pending';

-- One team per person per competition.
create function enforce_one_team_per_competition() returns trigger as $$
declare
  comp uuid;
begin
  select competition_id into comp from teams where id = new.team_id;
  perform pg_advisory_xact_lock(hashtext(new.user_id::text || comp::text));
  if exists (
    select 1
    from team_members tm
    join teams t on t.id = tm.team_id
    where tm.user_id = new.user_id
      and t.competition_id = comp
      and tm.team_id <> new.team_id
  ) then
    raise exception 'already on a team in this competition' using errcode = '23505';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger team_members_one_team_per_competition
  before insert on team_members
  for each row execute function enforce_one_team_per_competition();

create view v_my_teams as
  select tm.user_id,
         t.id             as team_id,
         t.name           as team_name,
         tm.role,
         t.competition_id,
         c.title          as competition_title
  from team_members tm
  join teams t on t.id = tm.team_id
  join competitions c on c.id = t.competition_id;
