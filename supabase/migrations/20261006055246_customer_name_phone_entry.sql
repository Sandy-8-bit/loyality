-- Customer entry now collects self-reported name and phone without OTP.
-- Auth UUIDs still own every row; entering another customer's number never grants access.
create function private.register_customer(p_name text, p_phone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles;
begin
  if auth.uid() is null then return jsonb_build_object('error','Please join the club first.'); end if;
  if p_name is null or char_length(trim(p_name)) not between 2 and 60 then
    return jsonb_build_object('error','Enter a name between 2 and 60 characters.');
  end if;
  if p_phone is null or p_phone !~ '^\+91[6-9][0-9]{9}$' then
    return jsonb_build_object('error','Enter a valid Indian mobile number.');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_phone, 42));
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if found then
    if v_profile.role <> 'customer' then return jsonb_build_object('error','You are signed in as a shopkeeper. Sign out of the dashboard before joining as a customer.'); end if;
    if v_profile.phone <> p_phone then return jsonb_build_object('error','This browser already has a loyalty card. Open your existing card.'); end if;
    update public.profiles set name = trim(p_name) where id = auth.uid() returning * into v_profile;
    return to_jsonb(v_profile);
  end if;
  if exists(select 1 from public.profiles where phone = p_phone) then
    return jsonb_build_object('error','This number already has a card. Open it in the browser you used to join.');
  end if;
  insert into public.profiles(id, name, phone, role) values(auth.uid(), trim(p_name), p_phone, 'customer') returning * into v_profile;
  insert into public.loyalty_cycles(customer_id, cycle_number) values(auth.uid(), 1);
  return to_jsonb(v_profile);
end; $$;

create function public.register_customer(p_name text, p_phone text) returns jsonb
language sql security invoker set search_path = '' as $$ select private.register_customer(p_name, p_phone); $$;
revoke all on function private.register_customer(text,text), public.register_customer(text,text) from public, anon;
grant execute on function private.register_customer(text,text), public.register_customer(text,text) to authenticated;

create or replace function private.ensure_customer(p_name text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles;
begin
  if auth.uid() is null then return jsonb_build_object('error','Please join the club first.'); end if;
  select * into v_profile from public.profiles where id = auth.uid() and role = 'customer' for update;
  if not found then return jsonb_build_object('error','Enter your name and mobile number to open your card.'); end if;
  if p_name is not null then
    if char_length(trim(p_name)) not between 2 and 60 then return jsonb_build_object('error','Enter a name between 2 and 60 characters.'); end if;
    update public.profiles set name = trim(p_name) where id = auth.uid() returning * into v_profile;
  end if;
  return to_jsonb(v_profile);
end; $$;

create or replace function private.validate_loyalty_code(p_code text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_code public.loyalty_codes; v_cycle public.loyalty_cycles; v_reward public.rewards; v_attempts integer; v_now timestamptz; v_checkpoint integer;
begin
  if auth.uid() is null then return jsonb_build_object('error','Please sign in.'); end if;
  perform 1 from public.profiles p where p.id = auth.uid() and p.role = 'customer' for update of p;
  if not found then return jsonb_build_object('error','Enter your name and mobile number to open your card.'); end if;
  v_now := clock_timestamp();
  insert into private.validation_limits(customer_id, window_started, attempts) values(auth.uid(), v_now, 1)
  on conflict(customer_id) do update set
    attempts = case when validation_limits.window_started <= v_now - interval '1 minute' then 1 else validation_limits.attempts + 1 end,
    window_started = case when validation_limits.window_started <= v_now - interval '1 minute' then v_now else validation_limits.window_started end
  returning attempts into v_attempts;
  if v_attempts > 10 then return jsonb_build_object('error','Too many attempts. Please wait a minute.', 'rateLimited',true); end if;
  if p_code is null or p_code !~ '^[0-9]{4}[A-Z]{2}$' then return jsonb_build_object('error','Enter the four digits and two letters from the shopkeeper.'); end if;
  select * into v_code from public.loyalty_codes where code = p_code;
  if not found then return jsonb_build_object('error','That code is not valid. Check with the shopkeeper.'); end if;
  if v_code.revoked or v_code.expires_at <= v_now or v_code.created_date <> (v_now at time zone 'Asia/Kolkata')::date then return jsonb_build_object('error','This code has expired. Ask for a new code.'); end if;
  if exists(select 1 from public.loyalty_checkins where customer_id = auth.uid() and code_id = v_code.id) then return jsonb_build_object('error','You have already collected a stamp with this code.'); end if;
  select * into v_cycle from public.loyalty_cycles where customer_id = auth.uid() and status <> 'reward_claimed' for update;
  if not found then return jsonb_build_object('error','Please refresh your loyalty card.'); end if;
  if v_cycle.completed_checkpoints = 6 then return jsonb_build_object('error','Your reward is ready! Ask the shopkeeper to claim it first.'); end if;
  v_checkpoint := v_cycle.completed_checkpoints + 1;
  insert into public.loyalty_checkins(customer_id, cycle_id, code_id, checkpoint_number) values(auth.uid(), v_cycle.id, v_code.id, v_checkpoint);
  select * into v_reward from public.rewards where id = 1;
  update public.loyalty_cycles set completed_checkpoints = v_checkpoint,
    status = case when v_checkpoint = 6 then 'completed' else 'active' end,
    completed_at = case when v_checkpoint = 6 then v_now else null end,
    reward_name = case when v_checkpoint = 6 then v_reward.name else null end,
    reward_image_url = case when v_checkpoint = 6 then v_reward.image_url else null end where id = v_cycle.id;
  update public.profiles set last_visit_at = v_now where id = auth.uid();
  return jsonb_build_object('success',true,'checkpoint',v_checkpoint,'total',6,'rewardUnlocked',v_checkpoint = 6);
end; $$;

