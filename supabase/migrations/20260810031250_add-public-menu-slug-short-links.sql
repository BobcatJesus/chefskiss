alter table public.cook_profiles
add column if not exists public_menu_slug text;

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

drop trigger if exists set_cook_public_menu_slug on public.cook_profiles;
create trigger set_cook_public_menu_slug
before insert or update of display_name, public_menu_slug on public.cook_profiles
for each row execute function public.assign_cook_public_menu_slug();

update public.cook_profiles
set public_menu_slug = coalesce(public_menu_slug, display_name);

alter table public.cook_profiles
alter column public_menu_slug set not null;

create unique index if not exists idx_cook_profiles_public_menu_slug on public.cook_profiles (public_menu_slug);
