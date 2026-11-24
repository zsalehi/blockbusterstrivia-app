-- Age rules per competition. Ages are measured on the competition's start date (or the
-- registration day if it has no start date). Null means no limit on that side.
--   min_age: younger players may REQUEST an exception, which an organizer approves or denies.
--   max_age: a hard limit. Older players can never play in the division.
alter table competitions
  add column min_age integer check (min_age between 1 and 99),
  add column max_age integer check (max_age between 1 and 99),
  add constraint competitions_age_range check (min_age is null or max_age is null or min_age <= max_age);

-- A roster player under the competition's min_age is only allowed with an exception.
--   requested: captain asked, waiting on an organizer.  approved / denied: organizer decided.
alter table team_members
  add column age_exception text check (age_exception in ('requested', 'approved', 'denied')),
  add column age_exception_note text,
  add column age_exception_decided_by uuid references "user" (id) on delete set null,
  add column age_exception_decided_at timestamptz;
