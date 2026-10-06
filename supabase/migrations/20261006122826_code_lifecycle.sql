-- A code is a one-time invitation: it has 30 minutes to be redeemed and is
-- retained for ten days for the shopkeeper's history.
alter table public.loyalty_codes
  drop constraint loyalty_codes_check,
  add column used_at timestamptz;

update public.loyalty_codes
set expires_at = created_at + interval '30 minutes';

alter table public.loyalty_codes
  add constraint loyalty_codes_check check (expires_at = created_at + interval '30 minutes');

alter table public.loyalty_checkins
  alter column code_id drop not null,
  drop constraint loyalty_checkins_code_id_fkey,
  add constraint loyalty_checkins_code_id_fkey
    foreign key (code_id) references public.loyalty_codes(id) on delete set null;

create or replace function private.delete_expired_loyalty_codes() returns void
language sql security definer set search_path = '' as $$
  delete from public.loyalty_codes
  where created_at < clock_timestamp() - interval '10 days';
$$;

create or replace function private.generate_loyalty_code(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_code public.loyalty_codes; v_now timestamptz;
begin
  if auth.uid() is null or not private.is_admin() then return jsonb_build_object('error','Shopkeeper access required.'); end if;
  if p_code is null or p_code !~ '^[0-9]{4}[A-Z]{2}$' then return jsonb_build_object('error','Invalid code format.'); end if;
  perform private.delete_expired_loyalty_codes();
  v_now := clock_timestamp();
  if exists(select 1 from public.loyalty_codes where code = p_code) then return jsonb_build_object('error','Please generate another code.'); end if;
  insert into public.loyalty_codes(code, created_by, created_at, expires_at, created_date)
  values(p_code, auth.uid(), v_now, v_now + interval '30 minutes', (v_now at time zone 'Asia/Kolkata')::date)
  returning * into v_code;
  return to_jsonb(v_code);
end; $$;

create or replace function private.validate_loyalty_code(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_code public.loyalty_codes; v_cycle public.loyalty_cycles; v_reward public.rewards; v_attempts integer; v_now timestamptz; v_checkpoint integer;
begin
  if auth.uid() is null then return jsonb_build_object('error','Please sign in.'); end if;
  perform 1 from public.profiles p where p.id = auth.uid() and p.role = 'customer' for update of p;
  if not found then return jsonb_build_object('error','Enter your name and mobile number to open your card.'); end if;
  perform private.delete_expired_loyalty_codes();
  v_now := clock_timestamp();
  insert into private.validation_limits(customer_id, window_started, attempts) values(auth.uid(), v_now, 1)
  on conflict(customer_id) do update set
    attempts = case when validation_limits.window_started <= v_now - interval '1 minute' then 1 else validation_limits.attempts + 1 end,
    window_started = case when validation_limits.window_started <= v_now - interval '1 minute' then v_now else validation_limits.window_started end
  returning attempts into v_attempts;
  if v_attempts > 10 then return jsonb_build_object('error','Too many attempts. Please wait a minute.', 'rateLimited',true); end if;
  if p_code is null or p_code !~ '^[0-9]{4}[A-Z]{2}$' then return jsonb_build_object('error','Enter the four digits and two letters from the shopkeeper.'); end if;
  select * into v_code from public.loyalty_codes where code = p_code for update;
  if not found then return jsonb_build_object('error','That code is not valid. Check with the shopkeeper.'); end if;
  if v_code.revoked or v_code.used_at is not null or v_code.expires_at <= v_now then return jsonb_build_object('error','This code has expired or has already been used. Ask for a new code.'); end if;
  select * into v_cycle from public.loyalty_cycles where customer_id = auth.uid() and status <> 'reward_claimed' for update;
  if not found then return jsonb_build_object('error','Please refresh your loyalty card.'); end if;
  if v_cycle.completed_checkpoints = 6 then return jsonb_build_object('error','Your reward is ready! Ask the shopkeeper to claim it first.'); end if;
  v_checkpoint := v_cycle.completed_checkpoints + 1;
  insert into public.loyalty_checkins(customer_id, cycle_id, code_id, checkpoint_number) values(auth.uid(), v_cycle.id, v_code.id, v_checkpoint);
  update public.loyalty_codes set used_at = v_now where id = v_code.id;
  select * into v_reward from public.rewards where id = 1;
  update public.loyalty_cycles set completed_checkpoints = v_checkpoint,
    status = case when v_checkpoint = 6 then 'completed' else 'active' end,
    completed_at = case when v_checkpoint = 6 then v_now else null end,
    reward_name = case when v_checkpoint = 6 then v_reward.name else null end,
    reward_image_url = case when v_checkpoint = 6 then v_reward.image_url else null end
  where id = v_cycle.id;
  update public.profiles set last_visit_at = v_now where id = auth.uid();
  return jsonb_build_object('checkpoint', v_checkpoint, 'rewardUnlocked', v_checkpoint = 6);
end; $$;

revoke all on function private.delete_expired_loyalty_codes() from public, anon;
grant execute on function private.delete_expired_loyalty_codes() to authenticated;
