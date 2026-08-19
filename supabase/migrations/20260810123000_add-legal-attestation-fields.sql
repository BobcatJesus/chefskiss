alter table public.cook_profiles
  add column if not exists attests_cottage_food_law_compliance boolean not null default false,
  add column if not exists attests_package_labeling_compliance boolean not null default false,
  add column if not exists attests_kitchen_sanitation_standards boolean not null default false,
  add column if not exists legal_attested_at timestamptz;
