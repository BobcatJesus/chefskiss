create table if not exists public.follow_offer_events (
	id uuid primary key default gen_random_uuid(),
	customer_user_id uuid not null references public.profiles(id) on delete cascade,
	cook_profile_id uuid not null references public.cook_profiles(id) on delete cascade,
	meal_id uuid not null references public.meals(id) on delete cascade,
	event_type text not null default 'meal_published',
	seen_at timestamptz,
	created_at timestamptz not null default timezone('utc', now()),
	unique (customer_user_id, cook_profile_id, meal_id, event_type)
);

alter table public.follow_offer_events enable row level security;

drop policy if exists "follow offer events read own" on public.follow_offer_events;
create policy "follow offer events read own" on public.follow_offer_events
for select using (auth.uid() = customer_user_id);

drop policy if exists "follow offer events update own" on public.follow_offer_events;
create policy "follow offer events update own" on public.follow_offer_events
for update using (auth.uid() = customer_user_id) with check (auth.uid() = customer_user_id);

create or replace function public.create_follow_offer_events_for_published_meal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if new.is_published = true and (tg_op = 'INSERT' or coalesce(old.is_published, false) = false) then
		insert into public.follow_offer_events (customer_user_id, cook_profile_id, meal_id, event_type)
		select cf.customer_user_id, new.cook_profile_id, new.id, 'meal_published'
		from public.cook_follows cf
		where cf.cook_profile_id = new.cook_profile_id
		on conflict (customer_user_id, cook_profile_id, meal_id, event_type) do nothing;
	end if;

	return new;
end;
$$;

drop trigger if exists create_follow_offer_events_after_meal_publish on public.meals;
create trigger create_follow_offer_events_after_meal_publish
after insert or update of is_published on public.meals
for each row execute function public.create_follow_offer_events_for_published_meal();

create or replace view public.cook_trust_metrics as
with completed_customer_orders as (
	select
		o.cook_profile_id,
		o.customer_user_id,
		count(*) as completed_orders_for_customer
	from public.orders o
	where o.status = 'completed'
	group by o.cook_profile_id, o.customer_user_id
),
aggregate_metrics as (
	select
		cco.cook_profile_id,
		sum(cco.completed_orders_for_customer) as total_completed_orders,
		count(*) as distinct_customers,
		count(*) filter (where cco.completed_orders_for_customer >= 2) as repeat_customers
	from completed_customer_orders cco
	group by cco.cook_profile_id
)
select
	cp.id as cook_profile_id,
	coalesce(am.total_completed_orders, 0)::integer as total_completed_orders,
	case
		when coalesce(am.distinct_customers, 0) = 0 then 0::numeric
		else round((am.repeat_customers::numeric / am.distinct_customers::numeric) * 100, 1)
	end as repeat_customer_rate
from public.cook_profiles cp
left join aggregate_metrics am on am.cook_profile_id = cp.id;

grant select on public.cook_trust_metrics to anon, authenticated;

create index if not exists idx_follow_offer_events_customer_user_id on public.follow_offer_events (customer_user_id);
create index if not exists idx_follow_offer_events_cook_profile_id on public.follow_offer_events (cook_profile_id);
create index if not exists idx_follow_offer_events_meal_id on public.follow_offer_events (meal_id);
