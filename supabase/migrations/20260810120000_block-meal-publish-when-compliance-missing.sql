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

  end if;

  return new;
end;
$$;

drop trigger if exists validate_meal_publish_requirements_before_write on public.meals;
create trigger validate_meal_publish_requirements_before_write
before insert or update of is_published, cook_profile_id on public.meals
for each row execute function public.validate_meal_publish_requirements();
