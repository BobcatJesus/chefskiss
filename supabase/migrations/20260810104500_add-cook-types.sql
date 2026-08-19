do $$
begin
  if not exists (select 1 from pg_type where typname = 'cook_type') then
    create type cook_type as enum ('home_kitchen', 'commercial_kitchen', 'in_home_personal_chef');
  end if;
end
$$;

alter table public.cook_profiles
  add column if not exists cook_types cook_type[] not null default '{}'::cook_type[];
