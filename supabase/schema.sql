create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'fulfillment_mode') then
    create type fulfillment_mode as enum ('pickup', 'cook_delivery');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum (
      'pending',
      'accepted',
      'declined',
      'ready',
      'completed',
      'canceled'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'service_type') then
    create type service_type as enum ('prepared_meals', 'meal_prep', 'in_home_chef');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ingredient_model') then
    create type ingredient_model as enum ('cook_provides', 'customer_provides', 'customer_chooses');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'cook_type') then
    create type cook_type as enum ('home_kitchen', 'commercial_kitchen', 'in_home_personal_chef');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  city text,
  is_cook boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cook_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  display_name text not null,
  full_legal_name text,
  phone_number text,
  physical_address text,
  cook_types cook_type[] not null default '{}'::cook_type[],
  food_handler_permit_url text,
  food_handler_permit_expires_on date,
  food_handler_permit_number text,
  attests_cottage_food_law_compliance boolean not null default false,
  attests_package_labeling_compliance boolean not null default false,
  attests_kitchen_sanitation_standards boolean not null default false,
  legal_attested_at timestamptz,
  public_menu_slug text not null,
  bio text not null default '',
  city text not null,
  cuisines text[] not null default '{}',
  fulfillment_modes fulfillment_mode[] not null default array['pickup']::fulfillment_mode[],
  food_safety_badge text,
  identity_verified boolean not null default false,
  rating_average numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  cook_profile_id uuid not null references public.cook_profiles(id) on delete cascade,
  service_type service_type not null default 'prepared_meals',
  ingredient_model ingredient_model not null default 'cook_provides',
  offers_pickup boolean not null default true,
  offers_cook_delivery boolean not null default false,
  offers_platform_delivery boolean not null default false,
  title text not null,
  description text not null default '',
  price_cents integer not null check (price_cents > 0),
  photo_url text,
  quantity_available integer not null default 1 check (quantity_available >= 0),
  preorder_notice_hours integer not null default 24 check (preorder_notice_hours >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (offers_pickup or offers_cook_delivery or offers_platform_delivery)
);

create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  cook_profile_id uuid not null references public.cook_profiles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  order_cutoff_at timestamptz not null,
  fulfillment_modes fulfillment_mode[] not null default array['pickup']::fulfillment_mode[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_at > start_at),
  check (order_cutoff_at <= start_at)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references public.profiles(id) on delete restrict,
  cook_profile_id uuid not null references public.cook_profiles(id) on delete restrict,
  meal_id uuid not null references public.meals(id) on delete restrict,
  availability_slot_id uuid references public.availability_slots(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  fulfillment_mode fulfillment_mode not null,
  ingredient_model ingredient_model not null default 'cook_provides',
  status order_status not null default 'pending',
  scheduled_for timestamptz not null,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  service_fee_cents integer not null default 0 check (service_fee_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  special_instructions text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.orders alter column availability_slot_id drop not null;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  cook_profile_id uuid not null references public.cook_profiles(id) on delete cascade,
  customer_user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cook_follows (
  id uuid primary key default gen_random_uuid(),
  cook_profile_id uuid not null references public.cook_profiles(id) on delete cascade,
  customer_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (cook_profile_id, customer_user_id)
);

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

create table if not exists public.menu_events (
  id uuid primary key default gen_random_uuid(),
  cook_profile_id uuid not null references public.cook_profiles(id) on delete cascade,
  meal_id uuid references public.meals(id) on delete set null,
  meal_title text,
  source_slug text,
  event_type text not null check (event_type in ('short_link_visit', 'menu_dish_click', 'menu_page_view', 'checkout_start')),
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.apply_order_defaults_and_validate()
returns trigger
language plpgsql
as $$
declare
  meal_record public.meals%rowtype;
  slot_record public.availability_slots%rowtype;
begin
  select *
  into meal_record
  from public.meals
  where id = new.meal_id;

  if not found then
    raise exception 'Meal % does not exist', new.meal_id;
  end if;

  if meal_record.cook_profile_id <> new.cook_profile_id then
    raise exception 'Meal % does not belong to cook profile %', new.meal_id, new.cook_profile_id;
  end if;

  if new.fulfillment_mode = 'pickup' and meal_record.offers_pickup = false then
    raise exception 'Meal % does not offer pickup fulfillment', new.meal_id;
  end if;

  if new.fulfillment_mode = 'cook_delivery' and meal_record.offers_cook_delivery = false then
    raise exception 'Meal % does not offer cook delivery fulfillment', new.meal_id;
  end if;

  if meal_record.ingredient_model = 'cook_provides' and new.ingredient_model <> 'cook_provides' then
    raise exception 'Meal % requires cook-provided ingredients', new.meal_id;
  end if;

  if meal_record.ingredient_model = 'customer_provides' and new.ingredient_model <> 'customer_provides' then
    raise exception 'Meal % requires customer-provided ingredients', new.meal_id;
  end if;

  if meal_record.ingredient_model = 'customer_chooses' and new.ingredient_model = 'customer_chooses' then
    raise exception 'Select either cook_provides or customer_provides for ingredient model';
  end if;

  if new.availability_slot_id is not null then
    select *
    into slot_record
    from public.availability_slots
    where id = new.availability_slot_id;

    if not found then
      raise exception 'Availability slot % does not exist', new.availability_slot_id;
    end if;

    if slot_record.cook_profile_id <> new.cook_profile_id then
      raise exception 'Availability slot % does not belong to cook profile %', new.availability_slot_id, new.cook_profile_id;
    end if;

    if not (new.fulfillment_mode = any(slot_record.fulfillment_modes)) then
      raise exception 'Fulfillment mode % is not allowed for slot %', new.fulfillment_mode, new.availability_slot_id;
    end if;

    if new.scheduled_for < slot_record.start_at or new.scheduled_for > slot_record.end_at then
      raise exception 'Scheduled time must fall within the selected availability slot';
    end if;
  end if;

  if meal_record.is_published = false then
    raise exception 'Cannot order an unpublished meal';
  end if;

  if meal_record.quantity_available < new.quantity then
    raise exception 'Requested quantity exceeds available inventory';
  end if;

  new.subtotal_cents = meal_record.price_cents * new.quantity;
  new.total_cents = new.subtotal_cents + coalesce(new.service_fee_cents, 0);

  return new;
end;
$$;

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

create or replace function public.validate_meal_publish_requirements()
returns trigger
language plpgsql
as $$
declare
  cook_row public.cook_profiles%rowtype;
begin
  if new.is_published = true then
    select *
    into cook_row
    from public.cook_profiles
    where id = new.cook_profile_id;

    if not found then
      raise exception 'Cook profile % does not exist', new.cook_profile_id;
    end if;

    if nullif(trim(coalesce(cook_row.full_legal_name, '')), '') is null then
      raise exception 'Cannot publish meal: cook full legal name is required';
    end if;

    if nullif(trim(coalesce(cook_row.phone_number, '')), '') is null then
      raise exception 'Cannot publish meal: cook phone number is required';
    end if;

    if nullif(trim(coalesce(cook_row.physical_address, '')), '') is null then
      raise exception 'Cannot publish meal: cook physical address is required';
    end if;

    if coalesce(array_length(cook_row.cook_types, 1), 0) = 0 then
      raise exception 'Cannot publish meal: choose at least one cook type';
    end if;

    if nullif(trim(coalesce(cook_row.food_handler_permit_url, '')), '') is null then
      raise exception 'Cannot publish meal: food handler permit upload is required';
    end if;

    if cook_row.food_handler_permit_expires_on is null then
      raise exception 'Cannot publish meal: food handler permit expiration date is required';
    end if;

    if cook_row.food_handler_permit_expires_on < current_date then
      raise exception 'Cannot publish meal: food handler permit is expired';
    end if;

    if cook_row.attests_cottage_food_law_compliance is not true then
      raise exception 'Cannot publish meal: must attest compliance with cottage food laws';
    end if;

    if cook_row.attests_package_labeling_compliance is not true then
      raise exception 'Cannot publish meal: must agree to package and label items correctly';
    end if;

    if cook_row.attests_kitchen_sanitation_standards is not true then
      raise exception 'Cannot publish meal: must acknowledge kitchen sanitation standards';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.slugify_menu_text(input_text text)
returns text
language plpgsql
immutable
as $$
declare
  normalized text;
begin
  normalized := lower(coalesce(input_text, ''));
  normalized := regexp_replace(normalized, '[^a-z0-9]+', '-', 'g');
  normalized := trim(both '-' from normalized);

  if normalized = '' then
    return 'cook';
  end if;

  return normalized;
end;
$$;

create or replace function public.assign_cook_public_menu_slug()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
  candidate_slug text;
  suffix integer := 1;
begin
  base_slug := public.slugify_menu_text(coalesce(nullif(new.public_menu_slug, ''), new.display_name, 'cook'));
  candidate_slug := base_slug;

  while exists (
    select 1
    from public.cook_profiles cp
    where cp.public_menu_slug = candidate_slug
      and (new.id is null or cp.id <> new.id)
  ) loop
    candidate_slug := base_slug || '-' || suffix;
    suffix := suffix + 1;
  end loop;

  new.public_menu_slug := candidate_slug;
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_cook_profiles_updated_at on public.cook_profiles;
create trigger set_cook_profiles_updated_at
before update on public.cook_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_cook_public_menu_slug on public.cook_profiles;
create trigger set_cook_public_menu_slug
before insert or update of display_name, public_menu_slug on public.cook_profiles
for each row execute function public.assign_cook_public_menu_slug();

drop trigger if exists set_meals_updated_at on public.meals;
create trigger set_meals_updated_at
before update on public.meals
for each row execute function public.set_updated_at();

drop trigger if exists validate_meal_publish_requirements_before_write on public.meals;
create trigger validate_meal_publish_requirements_before_write
before insert or update of is_published, cook_profile_id on public.meals
for each row execute function public.validate_meal_publish_requirements();

drop trigger if exists set_availability_slots_updated_at on public.availability_slots;
create trigger set_availability_slots_updated_at
before update on public.availability_slots
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists validate_orders_before_write on public.orders;
create trigger validate_orders_before_write
before insert or update on public.orders
for each row execute function public.apply_order_defaults_and_validate();

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

alter table public.profiles enable row level security;
alter table public.cook_profiles enable row level security;
alter table public.meals enable row level security;
alter table public.availability_slots enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;
alter table public.cook_follows enable row level security;
alter table public.follow_offer_events enable row level security;
alter table public.menu_events enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "cook profiles public read active" on public.cook_profiles;
create policy "cook profiles public read active" on public.cook_profiles
for select using (is_active = true or auth.uid() = user_id);

drop policy if exists "cook profiles insert own" on public.cook_profiles;
create policy "cook profiles insert own" on public.cook_profiles
for insert with check (auth.uid() = user_id);

drop policy if exists "cook profiles update own" on public.cook_profiles;
create policy "cook profiles update own" on public.cook_profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "meals public read published" on public.meals;
create policy "meals public read published" on public.meals
for select using (
  is_published = true
  or exists (
    select 1
    from public.cook_profiles cp
    where cp.id = meals.cook_profile_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "meals insert own" on public.meals;
create policy "meals insert own" on public.meals
for insert with check (
  exists (
    select 1
    from public.cook_profiles cp
    where cp.id = meals.cook_profile_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "meals update own" on public.meals;
create policy "meals update own" on public.meals
for update using (
  exists (
    select 1
    from public.cook_profiles cp
    where cp.id = meals.cook_profile_id
      and cp.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.cook_profiles cp
    where cp.id = meals.cook_profile_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "availability public read" on public.availability_slots;
create policy "availability public read" on public.availability_slots
for select using (
  exists (
    select 1
    from public.cook_profiles cp
    where cp.id = availability_slots.cook_profile_id
      and (cp.is_active = true or cp.user_id = auth.uid())
  )
);

drop policy if exists "availability insert own" on public.availability_slots;
create policy "availability insert own" on public.availability_slots
for insert with check (
  exists (
    select 1
    from public.cook_profiles cp
    where cp.id = availability_slots.cook_profile_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "availability update own" on public.availability_slots;
create policy "availability update own" on public.availability_slots
for update using (
  exists (
    select 1
    from public.cook_profiles cp
    where cp.id = availability_slots.cook_profile_id
      and cp.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.cook_profiles cp
    where cp.id = availability_slots.cook_profile_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "orders participants read" on public.orders;
create policy "orders participants read" on public.orders
for select using (
  auth.uid() = customer_user_id
  or exists (
    select 1
    from public.cook_profiles cp
    where cp.id = orders.cook_profile_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "orders customer insert" on public.orders;
create policy "orders customer insert" on public.orders
for insert with check (
  auth.uid() = customer_user_id
  and status = 'pending'
);

drop policy if exists "orders customer update own pending" on public.orders;
create policy "orders customer update own pending" on public.orders
for update using (
  auth.uid() = customer_user_id and status = 'pending'
) with check (
  auth.uid() = customer_user_id and status in ('pending', 'canceled')
);

drop policy if exists "orders cook update owned" on public.orders;
create policy "orders cook update owned" on public.orders
for update using (
  exists (
    select 1
    from public.cook_profiles cp
    where cp.id = orders.cook_profile_id
      and cp.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.cook_profiles cp
    where cp.id = orders.cook_profile_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read" on public.reviews
for select using (true);

drop policy if exists "reviews customer insert own" on public.reviews;
create policy "reviews customer insert own" on public.reviews
for insert with check (
  auth.uid() = customer_user_id
  and exists (
    select 1
    from public.orders o
    where o.id = reviews.order_id
      and o.customer_user_id = auth.uid()
      and o.cook_profile_id = reviews.cook_profile_id
      and o.status = 'completed'
  )
);

drop policy if exists "cook follows public read" on public.cook_follows;
create policy "cook follows public read" on public.cook_follows
for select using (true);

drop policy if exists "cook follows insert own" on public.cook_follows;
create policy "cook follows insert own" on public.cook_follows
for insert with check (auth.uid() = customer_user_id);

drop policy if exists "cook follows delete own" on public.cook_follows;
create policy "cook follows delete own" on public.cook_follows
for delete using (auth.uid() = customer_user_id);

drop policy if exists "follow offer events read own" on public.follow_offer_events;
create policy "follow offer events read own" on public.follow_offer_events
for select using (auth.uid() = customer_user_id);

drop policy if exists "follow offer events update own" on public.follow_offer_events;
create policy "follow offer events update own" on public.follow_offer_events
for update using (auth.uid() = customer_user_id) with check (auth.uid() = customer_user_id);

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

create index if not exists idx_cook_profiles_city on public.cook_profiles (city);
create index if not exists idx_cook_profiles_user_id on public.cook_profiles (user_id);
create unique index if not exists idx_cook_profiles_public_menu_slug on public.cook_profiles (public_menu_slug);
create index if not exists idx_meals_cook_profile_id on public.meals (cook_profile_id);
create index if not exists idx_meals_published on public.meals (is_published);
create index if not exists idx_availability_cook_profile_id on public.availability_slots (cook_profile_id);
create index if not exists idx_orders_customer_user_id on public.orders (customer_user_id);
create index if not exists idx_orders_cook_profile_id on public.orders (cook_profile_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_reviews_cook_profile_id on public.reviews (cook_profile_id);
create index if not exists idx_follow_offer_events_customer_user_id on public.follow_offer_events (customer_user_id);
create index if not exists idx_follow_offer_events_cook_profile_id on public.follow_offer_events (cook_profile_id);
create index if not exists idx_follow_offer_events_meal_id on public.follow_offer_events (meal_id);
create index if not exists idx_menu_events_cook_profile_id on public.menu_events (cook_profile_id);
create index if not exists idx_menu_events_event_type on public.menu_events (event_type);
create index if not exists idx_menu_events_created_at on public.menu_events (created_at);


{
  "cookProfile": {
    "isCottageFoodVerified": true,
    "jurisdiction": "TX",
    "foodHandlerCard": {
      "verified": true,
      "expirationDate": "2027-08-10"
    },
    "attestations": {
      "agreedToCottageTerms": true,
      "timestamp": "2026-08-10T21:27:00Z"
    }
  }
} 