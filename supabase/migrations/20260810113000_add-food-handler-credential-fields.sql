alter table public.cook_profiles
  add column if not exists food_handler_permit_url text,
  add column if not exists food_handler_permit_expires_on date,
  add column if not exists food_handler_permit_number text;
