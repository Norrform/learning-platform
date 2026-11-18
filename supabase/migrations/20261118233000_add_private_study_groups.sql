create table public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 50),
  description text not null default '' check (char_length(description) <= 300),
  invite_code text not null unique default upper(substr(encode(extensions.gen_random_bytes(9), 'hex'), 1, 12)),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.study_group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.study_group_notes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) <= 12000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index study_group_members_user_id_idx on public.study_group_members(user_id, joined_at desc);
create index study_group_notes_group_id_created_at_idx on public.study_group_notes(group_id, created_at desc);

alter table public.study_groups enable row level security;
alter table public.study_group_members enable row level security;
alter table public.study_group_notes enable row level security;

grant select, insert, update, delete on public.study_groups to authenticated;
grant select on public.study_group_members to authenticated;
grant select, insert, update, delete on public.study_group_notes to authenticated;

create policy "Members can view their study groups"
on public.study_groups for select to authenticated
using (exists (select 1 from public.study_group_members m where m.group_id = id and m.user_id = (select auth.uid())));

create policy "Owners can update their study groups"
on public.study_groups for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Owners can delete their study groups"
on public.study_groups for delete to authenticated
using (owner_id = (select auth.uid()));

create policy "Members can view their own membership"
on public.study_group_members for select to authenticated
using (user_id = (select auth.uid()));

create policy "Members can view notes in their groups"
on public.study_group_notes for select to authenticated
using (exists (select 1 from public.study_group_members m where m.group_id = study_group_notes.group_id and m.user_id = (select auth.uid())));

create policy "Members can add notes to their groups"
on public.study_group_notes for insert to authenticated
with check (author_id = (select auth.uid()) and exists (select 1 from public.study_group_members m where m.group_id = study_group_notes.group_id and m.user_id = (select auth.uid())));

create policy "Authors can update their group notes"
on public.study_group_notes for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()) and exists (select 1 from public.study_group_members m where m.group_id = study_group_notes.group_id and m.user_id = (select auth.uid())));

create policy "Authors can delete their group notes"
on public.study_group_notes for delete to authenticated
using (author_id = (select auth.uid()));

create or replace function public.create_study_group(p_name text, p_description text default '')
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_group_id uuid; v_name text := btrim(coalesce(p_name, '')); v_description text := btrim(coalesce(p_description, ''));
begin
  if v_user_id is null then raise exception 'Sign in to create a study group.'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 50 then raise exception 'Group name must be 3–50 characters.'; end if;
  if char_length(v_description) > 300 then raise exception 'Description must be 300 characters or fewer.'; end if;
  insert into public.study_groups(name, description, owner_id) values (v_name, v_description, v_user_id) returning id into v_group_id;
  insert into public.study_group_members(group_id, user_id, role) values (v_group_id, v_user_id, 'owner');
  return v_group_id;
end;
$$;

create or replace function public.join_study_group(p_invite_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_group_id uuid; v_code text := upper(btrim(coalesce(p_invite_code, '')));
begin
  if v_user_id is null then raise exception 'Sign in to join a study group.'; end if;
  if v_code !~ '^[A-F0-9]{12}$' then raise exception 'Enter a valid 12-character invite code.'; end if;
  select id into v_group_id from public.study_groups where invite_code = v_code;
  if v_group_id is null then raise exception 'No study group was found for that invite code.'; end if;
  insert into public.study_group_members(group_id, user_id, role) values (v_group_id, v_user_id, 'member') on conflict (group_id, user_id) do nothing;
  return v_group_id;
end;
$$;

create or replace function public.leave_study_group(p_group_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_owner_id uuid;
begin
  if v_user_id is null then raise exception 'Sign in to leave a study group.'; end if;
  select owner_id into v_owner_id from public.study_groups where id = p_group_id;
  if v_owner_id is null then return false; end if;
  if v_owner_id = v_user_id then raise exception 'The group owner must delete the group instead of leaving it.'; end if;
  delete from public.study_group_members where group_id = p_group_id and user_id = v_user_id;
  return found;
end;
$$;

revoke all on function public.create_study_group(text, text) from public, anon;
revoke all on function public.join_study_group(text) from public, anon;
revoke all on function public.leave_study_group(uuid) from public, anon;
grant execute on function public.create_study_group(text, text) to authenticated;
grant execute on function public.join_study_group(text) to authenticated;
grant execute on function public.leave_study_group(uuid) to authenticated;
