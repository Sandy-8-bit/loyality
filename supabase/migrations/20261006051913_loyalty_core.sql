-- Kora: business mutations are atomic, authenticated functions in a private schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique check (phone is null or phone ~ '^\+91[6-9][0-9]{9}$'),
  name text check (char_length(name) between 2 and 60),
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  last_visit_at timestamptz,
  constraint customer_has_phone check (role = 'admin' or phone is not null)
);
create table public.shop_settings (
  id integer primary key default 1 check (id = 1),
  name text not null check (char_length(name) between 2 and 60),
  tagline text not null default 'Good food. Great company. A little something back.' check (char_length(tagline) <= 100),
  website_url text check (website_url is null or website_url ~ '^https://')
);
insert into public.shop_settings(id, name) values (1, 'Kora');
create table public.rewards (
  id integer primary key default 1 check (id = 1),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 240),
  image_url text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
insert into public.rewards(id, name, description) values (1, 'A dish on the house', 'Six visits, one delicious thank you. Ask us about your complimentary dish.');
create table public.loyalty_cycles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  cycle_number integer not null check (cycle_number > 0),
  completed_checkpoints integer not null default 0 check (completed_checkpoints between 0 and 6),
  status text not null default 'active' check (status in ('active','completed','reward_claimed')),
  reward_name text,
  reward_image_url text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  claimed_at timestamptz,
  claimed_by uuid references public.profiles(id),
  unique(customer_id, cycle_number),
  unique(id, customer_id),
  check ((status = 'active' and completed_checkpoints < 6 and completed_at is null and claimed_at is null) or
    (status = 'completed' and completed_checkpoints = 6 and completed_at is not null and claimed_at is null and reward_name is not null) or
    (status = 'reward_claimed' and completed_checkpoints = 6 and completed_at is not null and claimed_at is not null and claimed_by is not null and reward_name is not null))
);
create unique index one_open_cycle_per_customer on public.loyalty_cycles(customer_id) where status <> 'reward_claimed';
create table public.loyalty_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9]{4}[A-Z]{2}$'),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  created_date date not null default (clock_timestamp() at time zone 'Asia/Kolkata')::date,
  revoked boolean not null default false,
  check (expires_at = created_at + interval '5 minutes')
);
create index loyalty_codes_expiry on public.loyalty_codes(expires_at);
create table public.loyalty_checkins (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  cycle_id uuid not null,
  code_id uuid not null references public.loyalty_codes(id),
  checkpoint_number integer not null check (checkpoint_number between 1 and 6),
  created_at timestamptz not null default clock_timestamp(),
  foreign key(cycle_id, customer_id) references public.loyalty_cycles(id, customer_id),
  unique(customer_id, code_id),
  unique(cycle_id, checkpoint_number)
);
create index checkins_created_at on public.loyalty_checkins(created_at desc);
create index checkins_code_id on public.loyalty_checkins(code_id);
create index profiles_created_at on public.profiles(created_at desc);
create index codes_created_by on public.loyalty_codes(created_by);
create index cycles_claimed_by on public.loyalty_cycles(claimed_by);
create index rewards_updated_by on public.rewards(updated_by);
create table private.validation_limits (
  customer_id uuid primary key references public.profiles(id) on delete cascade,
  window_started timestamptz not null,
  attempts integer not null
);
alter table private.validation_limits enable row level security;

create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.shop_settings enable row level security;
alter table public.rewards enable row level security;
alter table public.loyalty_cycles enable row level security;
alter table public.loyalty_codes enable row level security;
alter table public.loyalty_checkins enable row level security;
revoke all on public.profiles, public.loyalty_cycles, public.loyalty_codes, public.loyalty_checkins, public.shop_settings, public.rewards from anon, authenticated;
grant select on public.profiles, public.loyalty_cycles, public.loyalty_codes, public.loyalty_checkins to authenticated;
grant select on public.shop_settings, public.rewards to anon, authenticated;
grant update(name, tagline, website_url) on public.shop_settings to authenticated;
grant update(name, description, image_url, updated_by, updated_at) on public.rewards to authenticated;
create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()) or (select private.is_admin()));
create policy cycles_read on public.loyalty_cycles for select to authenticated using (customer_id = (select auth.uid()) or (select private.is_admin()));
create policy checkins_read on public.loyalty_checkins for select to authenticated using (customer_id = (select auth.uid()) or (select private.is_admin()));
create policy codes_admin_read on public.loyalty_codes for select to authenticated using ((select private.is_admin()));
create policy shop_read on public.shop_settings for select to anon, authenticated using (true);
create policy reward_read on public.rewards for select to anon, authenticated using (true);
create policy shop_admin_update on public.shop_settings for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy reward_admin_update on public.rewards for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create function private.ensure_customer(p_name text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user auth.users; v_profile public.profiles;
begin
  if auth.uid() is null then return jsonb_build_object('error','Please sign in.'); end if;
  select * into v_user from auth.users where id = auth.uid();
  if v_user.phone_confirmed_at is null or v_user.phone is null then return jsonb_build_object('error','Verify your mobile number first.'); end if;
  if p_name is not null and (char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 60) then return jsonb_build_object('error','Enter a name between 2 and 60 characters.'); end if;
  insert into public.profiles(id, phone, name) values (auth.uid(), '+' || ltrim(v_user.phone, '+'), nullif(trim(p_name), ''))
    on conflict (id) do update set name = coalesce(excluded.name, profiles.name)
    returning * into v_profile;
  if not exists(select 1 from public.loyalty_cycles where customer_id = auth.uid() and status <> 'reward_claimed') then
    insert into public.loyalty_cycles(customer_id, cycle_number) values (auth.uid(), coalesce((select max(cycle_number) from public.loyalty_cycles where customer_id = auth.uid()), 0) + 1);
  end if;
  return to_jsonb(v_profile);
end; $$;

create function private.generate_loyalty_code(p_code text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_code public.loyalty_codes; v_now timestamptz;
begin
  if auth.uid() is null or not private.is_admin() then return jsonb_build_object('error','Shopkeeper access required.'); end if;
  if p_code is null or p_code !~ '^[0-9]{4}[A-Z]{2}$' then return jsonb_build_object('error','Invalid code format.'); end if;
  perform pg_advisory_xact_lock(742061);
  v_now := clock_timestamp();
  select * into v_code from public.loyalty_codes where not revoked and expires_at > v_now and created_date = (v_now at time zone 'Asia/Kolkata')::date order by created_at desc limit 1;
  if found then return to_jsonb(v_code); end if;
  if exists(select 1 from public.loyalty_codes where code = p_code) then return jsonb_build_object('error','Please generate another code.'); end if;
  insert into public.loyalty_codes(code, created_by, created_at, expires_at, created_date)
  values(p_code, auth.uid(), v_now, v_now + interval '5 minutes', (v_now at time zone 'Asia/Kolkata')::date) returning * into v_code;
  return to_jsonb(v_code);
end; $$;

create function private.validate_loyalty_code(p_code text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_code public.loyalty_codes; v_cycle public.loyalty_cycles; v_reward public.rewards; v_attempts integer; v_now timestamptz; v_checkpoint integer;
begin
  if auth.uid() is null then return jsonb_build_object('error','Please sign in.'); end if;
  perform 1 from public.profiles p join auth.users u on u.id = p.id where p.id = auth.uid() and p.role = 'customer' and u.phone_confirmed_at is not null for update of p;
  if not found then return jsonb_build_object('error','Verify your mobile number and create your profile first.'); end if;
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

create function private.claim_reward(p_cycle_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_cycle public.loyalty_cycles; v_customer uuid;
begin
  if auth.uid() is null or not private.is_admin() then return jsonb_build_object('error','Shopkeeper access required.'); end if;
  select customer_id into v_customer from public.loyalty_cycles where id = p_cycle_id;
  if not found then return jsonb_build_object('error','Loyalty card not found.'); end if;
  -- Always lock profile before cycle, matching validation and onboarding lock order.
  perform 1 from public.profiles where id = v_customer for update;
  select * into v_cycle from public.loyalty_cycles where id = p_cycle_id for update;
  if v_cycle.status <> 'completed' then return jsonb_build_object('error','This reward has already been claimed or is not ready.'); end if;
  update public.loyalty_cycles set status = 'reward_claimed', claimed_at = clock_timestamp(), claimed_by = auth.uid() where id = p_cycle_id;
  insert into public.loyalty_cycles(customer_id, cycle_number) values(v_cycle.customer_id, v_cycle.cycle_number + 1);
  return jsonb_build_object('success',true);
end; $$;

create function public.ensure_customer(p_name text default null) returns jsonb language sql security invoker set search_path = '' as $$ select private.ensure_customer(p_name); $$;
create function public.generate_loyalty_code(p_code text) returns jsonb language sql security invoker set search_path = '' as $$ select private.generate_loyalty_code(p_code); $$;
create function public.validate_loyalty_code(p_code text) returns jsonb language sql security invoker set search_path = '' as $$ select private.validate_loyalty_code(p_code); $$;
create function public.claim_reward(p_cycle_id uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.claim_reward(p_cycle_id); $$;

create function public.admin_overview() returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not private.is_admin() then return jsonb_build_object('error','Shopkeeper access required.'); end if;
  select jsonb_build_object(
    'stats', jsonb_build_object(
      'customers',(select count(*) from public.profiles where role = 'customer'),
      'activeCodes',(select count(*) from public.loyalty_codes where expires_at > clock_timestamp() and not revoked and created_date = (clock_timestamp() at time zone 'Asia/Kolkata')::date),
      'completedCards',(select count(*) from public.loyalty_cycles where completed_checkpoints = 6),
      'claimedRewards',(select count(*) from public.loyalty_cycles where status = 'reward_claimed'),
      'visits',(select count(*) from public.loyalty_checkins)),
    'customers',coalesce((select jsonb_agg(to_jsonb(p) || jsonb_build_object('loyalty_cycles',coalesce((select jsonb_agg(c) from public.loyalty_cycles c where c.customer_id = p.id and c.status <> 'reward_claimed'),'[]'::jsonb))) from (select * from public.profiles where role = 'customer' order by created_at desc limit 5) p),'[]'::jsonb),
    'codes',coalesce((select jsonb_agg(c) from (select * from public.loyalty_codes order by created_at desc limit 8) c),'[]'::jsonb),
    'activity',coalesce((select jsonb_agg(to_jsonb(v) || jsonb_build_object('profiles',(select jsonb_build_object('name',p.name,'phone',p.phone) from public.profiles p where p.id = v.customer_id))) from (select * from public.loyalty_checkins order by created_at desc limit 5) v),'[]'::jsonb),
    'chart',(select jsonb_agg(jsonb_build_object('day',d::date,'visits',(select count(*) from public.loyalty_checkins where (created_at at time zone 'Asia/Kolkata')::date = d::date))) from generate_series((now() at time zone 'Asia/Kolkata')::date - 6, (now() at time zone 'Asia/Kolkata')::date, interval '1 day') d),
    'reward',(select to_jsonb(r) from public.rewards r where id = 1),
    'shop',(select to_jsonb(s) from public.shop_settings s where id = 1)
  ) into v_result;
  return v_result;
end; $$;

revoke all on function private.ensure_customer(text), private.generate_loyalty_code(text), private.validate_loyalty_code(text), private.claim_reward(uuid) from public, anon;
grant execute on function private.ensure_customer(text), private.generate_loyalty_code(text), private.validate_loyalty_code(text), private.claim_reward(uuid) to authenticated;
revoke all on function public.ensure_customer(text), public.generate_loyalty_code(text), public.validate_loyalty_code(text), public.claim_reward(uuid), public.admin_overview() from public, anon;
grant execute on function public.ensure_customer(text), public.generate_loyalty_code(text), public.validate_loyalty_code(text), public.claim_reward(uuid), public.admin_overview() to authenticated;

-- STORAGE SETUP (kept after core SQL for isolated PostgreSQL tests)
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('loyalty-rewards','loyalty-rewards',true,5000000,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy reward_image_insert on storage.objects for insert to authenticated with check (bucket_id = 'loyalty-rewards' and (select private.is_admin()));
create policy reward_image_read on storage.objects for select to authenticated using (bucket_id = 'loyalty-rewards' and (select private.is_admin()));
-- Images are immutable: retaining old objects preserves earned reward snapshots.
