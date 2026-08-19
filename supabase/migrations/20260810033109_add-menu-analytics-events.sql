create table if not exists public.menu_events (
	id uuid primary key default gen_random_uuid(),
	cook_profile_id uuid not null references public.cook_profiles(id) on delete cascade,
	meal_id uuid references public.meals(id) on delete set null,
	meal_title text,
	source_slug text,
	event_type text not null check (event_type in ('short_link_visit', 'menu_dish_click')),
	created_at timestamptz not null default timezone('utc', now())
);

alter table public.menu_events enable row level security;

drop policy if exists "menu events public insert" on public.menu_events;
create policy "menu events public insert" on public.menu_events
for insert with check (true);

drop policy if exists "menu events cook read own" on public.menu_events;
create policy "menu events cook read own" on public.menu_events
for select using (
	exists (
		select 1
		from public.cook_profiles cp
		where cp.id = menu_events.cook_profile_id
			and cp.user_id = auth.uid()
	)
);

create index if not exists idx_menu_events_cook_profile_id on public.menu_events (cook_profile_id);
create index if not exists idx_menu_events_event_type on public.menu_events (event_type);
create index if not exists idx_menu_events_created_at on public.menu_events (created_at);
