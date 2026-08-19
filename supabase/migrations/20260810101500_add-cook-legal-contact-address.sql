alter table public.cook_profiles
  add column if not exists full_legal_name text,
  add column if not exists phone_number text,
  add column if not exists physical_address text;
