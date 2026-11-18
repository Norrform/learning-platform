create index if not exists friendships_requested_by_created_at_idx on public.friendships(requested_by, created_at desc);
