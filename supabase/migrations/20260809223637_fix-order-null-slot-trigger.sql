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
	elsif new.fulfillment_mode <> 'pickup' then
		raise exception 'Orders without slots must use pickup fulfillment';
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

drop trigger if exists validate_orders_before_write on public.orders;
create trigger validate_orders_before_write
before insert or update on public.orders
for each row execute function public.apply_order_defaults_and_validate();
