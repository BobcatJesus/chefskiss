alter table public.meals
  add column if not exists is_available_now boolean not null default false,
  add column if not exists available_until timestamptz,
  add column if not exists current_offer_note text not null default '';

create index if not exists meals_available_now_idx
  on public.meals (cook_profile_id, is_available_now, available_until)
  where is_available_now = true;