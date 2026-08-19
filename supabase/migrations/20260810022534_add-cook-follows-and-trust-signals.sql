create table if not exists public.cook_follows (
	id uuid primary key default gen_random_uuid(),
	cook_profile_id uuid not null references public.cook_profiles(id) on delete cascade,
	customer_user_id uuid not null references public.profiles(id) on delete cascade,
	created_at timestamptz not null default timezone('utc', now()),
	unique (cook_profile_id, customer_user_id)
);

alter table public.cook_follows enable row level security;

drop policy if exists "cook follows public read" on public.cook_follows;
create policy "cook follows public read" on public.cook_follows
for select using (true);

drop policy if exists "cook follows insert own" on public.cook_follows;
create policy "cook follows insert own" on public.cook_follows
for insert with check (auth.uid() = customer_user_id);

drop policy if exists "cook follows delete own" on public.cook_follows;
create policy "cook follows delete own" on public.cook_follows
for delete using (auth.uid() = customer_user_id);
