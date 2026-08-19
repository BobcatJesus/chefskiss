alter table public.menu_events drop constraint if exists menu_events_event_type_check;

alter table public.menu_events
add constraint menu_events_event_type_check
check (event_type in ('short_link_visit', 'menu_dish_click', 'menu_page_view'));
