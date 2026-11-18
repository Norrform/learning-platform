alter table public.profiles
  add column if not exists friend_code text;

update public.profiles
set friend_code = upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))
where friend_code is null;

alter table public.profiles
  alter column friend_code set default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));

alter table public.profiles
  alter column friend_code set not null;

create unique index if not exists profiles_friend_code_key on public.profiles (friend_code);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references auth.users(id) on delete cascade,
  user_high uuid not null references auth.users(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  constraint friendships_ordered_users check (user_low < user_high),
  constraint friendships_unique_pair unique (user_low, user_high),
  constraint friendships_requester_is_participant check (requested_by = user_low or requested_by = user_high)
);

create index if not exists friendships_user_low_status_idx on public.friendships(user_low, status);
create index if not exists friendships_user_high_status_idx on public.friendships(user_high, status);
alter table public.friendships enable row level security;

create policy "Participants can view their friendships"
on public.friendships for select to authenticated
using ((select auth.uid()) = user_low or (select auth.uid()) = user_high);

revoke all on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated;

create or replace function public.list_friend_connections()
returns table (friendship_id uuid, friend_id uuid, friend_name text, friend_code text, status text, is_incoming boolean, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select f.id,
    case when f.user_low = (select auth.uid()) then f.user_high else f.user_low end,
    coalesce(p.display_name, 'Learner'), p.friend_code, f.status,
    f.requested_by <> (select auth.uid()), f.created_at
  from public.friendships f
  join public.profiles p on p.id = case when f.user_low = (select auth.uid()) then f.user_high else f.user_low end
  where (select auth.uid()) is not null
    and ((select auth.uid()) = f.user_low or (select auth.uid()) = f.user_high)
  order by f.created_at desc;
$$;

create or replace function public.send_friend_request(p_friend_code text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target uuid;
  low_id uuid;
  high_id uuid;
  current_status text;
  current_requester uuid;
begin
  if actor is null then raise exception 'Sign in to add a friend.'; end if;
  if p_friend_code is null or length(trim(p_friend_code)) <> 8 then raise exception 'Enter a valid 8-character friend code.'; end if;
  select p.id into target from public.profiles p where p.friend_code = upper(trim(p_friend_code)) limit 1;
  if target is null then raise exception 'No account was found for that friend code.'; end if;
  if target = actor then raise exception 'You cannot add yourself.'; end if;
  low_id := least(actor, target);
  high_id := greatest(actor, target);
  select f.status, f.requested_by into current_status, current_requester
  from public.friendships f where f.user_low = low_id and f.user_high = high_id;
  if current_status = 'accepted' then return 'accepted';
  elsif current_status = 'pending' and current_requester <> actor then
    update public.friendships set status = 'accepted' where user_low = low_id and user_high = high_id;
    return 'accepted';
  elsif current_status = 'pending' then return 'pending';
  end if;
  insert into public.friendships(user_low, user_high, requested_by, status) values (low_id, high_id, actor, 'pending');
  return 'pending';
end;
$$;

create or replace function public.respond_friend_request(p_friendship_id uuid, p_accept boolean)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); changed integer;
begin
  if actor is null then raise exception 'Sign in to respond to a friend request.'; end if;
  if p_accept then
    update public.friendships set status = 'accepted'
    where id = p_friendship_id and status = 'pending'
      and ((user_low = actor and requested_by = user_high) or (user_high = actor and requested_by = user_low));
  else
    delete from public.friendships where id = p_friendship_id and status = 'pending'
      and ((user_low = actor and requested_by = user_high) or (user_high = actor and requested_by = user_low));
  end if;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

create or replace function public.remove_friend(p_friendship_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); changed integer;
begin
  if actor is null then raise exception 'Sign in to manage friends.'; end if;
  delete from public.friendships where id = p_friendship_id and status = 'accepted'
    and (user_low = actor or user_high = actor);
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

revoke all on function public.list_friend_connections() from public, anon;
revoke all on function public.send_friend_request(text) from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
grant execute on function public.list_friend_connections() to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
