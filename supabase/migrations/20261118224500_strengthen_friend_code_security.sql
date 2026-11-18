update public.profiles
set friend_code = upper(substr(encode(gen_random_bytes(9), 'hex'), 1, 12));

alter table public.profiles
  alter column friend_code set default upper(substr(encode(gen_random_bytes(9), 'hex'), 1, 12));

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
  requests_today integer;
begin
  if actor is null then raise exception 'Sign in to add a friend.'; end if;
  if p_friend_code is null or length(trim(p_friend_code)) <> 12 then raise exception 'Enter a valid 12-character friend code.'; end if;
  select count(*) into requests_today from public.friendships
  where requested_by = actor and created_at > now() - interval '24 hours';
  if requests_today >= 10 then raise exception 'You have reached the daily friend-request limit. Try again tomorrow.'; end if;
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
revoke all on function public.send_friend_request(text) from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;
