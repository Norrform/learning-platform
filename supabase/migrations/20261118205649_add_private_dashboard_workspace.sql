alter table public.profiles
  add column if not exists workspace_data jsonb not null default '{}'::jsonb;
