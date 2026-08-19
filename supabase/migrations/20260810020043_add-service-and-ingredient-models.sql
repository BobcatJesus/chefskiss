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

alter table public.meals
add column if not exists service_type service_type not null default 'prepared_meals',
add column if not exists ingredient_model ingredient_model not null default 'cook_provides',
add column if not exists offers_pickup boolean not null default true,
add column if not exists offers_cook_delivery boolean not null default false,
add column if not exists offers_platform_delivery boolean not null default false;

do $$
begin
	if not exists (
		select 1
		from pg_constraint
		where conname = 'meals_at_least_one_fulfillment'
	) then
		alter table public.meals
		add constraint meals_at_least_one_fulfillment
		check (offers_pickup or offers_cook_delivery or offers_platform_delivery);
	end if;
end
$$;

alter table public.orders
add column if not exists ingredient_model ingredient_model not null default 'cook_provides';

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
