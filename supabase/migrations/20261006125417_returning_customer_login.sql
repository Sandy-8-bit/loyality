alter table public.loyalty_cycles drop constraint loyalty_cycles_customer_id_fkey;
alter table public.loyalty_cycles add constraint loyalty_cycles_customer_id_fkey foreign key (customer_id) references public.profiles(id) on delete cascade on update cascade;
alter table public.loyalty_checkins drop constraint loyalty_checkins_customer_id_fkey;
alter table public.loyalty_checkins add constraint loyalty_checkins_customer_id_fkey foreign key (customer_id) references public.profiles(id) on delete cascade on update cascade;
alter table public.loyalty_checkins drop constraint loyalty_checkins_cycle_id_customer_id_fkey;
alter table public.loyalty_checkins add constraint loyalty_checkins_cycle_id_customer_id_fkey foreign key (cycle_id, customer_id) references public.loyalty_cycles(id, customer_id) on update cascade;
alter table private.validation_limits drop constraint validation_limits_customer_id_fkey;
alter table private.validation_limits add constraint validation_limits_customer_id_fkey foreign key (customer_id) references public.profiles(id) on delete cascade on update cascade;

create or replace function private.register_customer(p_name text, p_phone text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles;
begin
  if auth.uid() is null then return jsonb_build_object('error','Please join the club first.'); end if;
  if p_name is null or char_length(trim(p_name)) not between 2 and 60 then return jsonb_build_object('error','Enter a name between 2 and 60 characters.'); end if;
  if p_phone is null or p_phone !~ '^\+91[6-9][0-9]{9}$' then return jsonb_build_object('error','Enter a valid Indian mobile number.'); end if;
  perform pg_advisory_xact_lock(hashtextextended(p_phone, 42));
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if found then
    if v_profile.role <> 'customer' then return jsonb_build_object('error','You are signed in as a shopkeeper. Sign out of the dashboard before joining as a customer.'); end if;
    if v_profile.phone <> p_phone then return jsonb_build_object('error','This browser already has a loyalty card. Open your existing card.'); end if;
    update public.profiles set name = trim(p_name) where id = auth.uid() returning * into v_profile;
    return to_jsonb(v_profile);
  end if;
  select * into v_profile from public.profiles where phone = p_phone and role = 'customer' for update;
  if found then
    if lower(trim(v_profile.name)) <> lower(trim(p_name)) then return jsonb_build_object('error','Enter the name used for this loyalty card.'); end if;
    update public.profiles set id = auth.uid() where id = v_profile.id returning * into v_profile;
    return to_jsonb(v_profile);
  end if;
  insert into public.profiles(id, name, phone, role) values(auth.uid(), trim(p_name), p_phone, 'customer') returning * into v_profile;
  insert into public.loyalty_cycles(customer_id, cycle_number) values(auth.uid(), 1);
  return to_jsonb(v_profile);
end; $$;
