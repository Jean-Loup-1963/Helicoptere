create extension if not exists "pgcrypto";

create table if not exists models (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  theme_color text not null,
  created_at timestamptz not null default now()
);

create table if not exists flights (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id text not null references models(id) on delete cascade,
  date date,
  duration int,
  battery_id text,
  notes text
);

create table if not exists batteries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id text not null references models(id) on delete cascade,
  name text not null,
  number text,
  capacity int,
  discharge_rate int,
  cells int,
  voltage numeric,
  cycles int,
  last_used date,
  notes text
);

create table if not exists maintenance (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id text not null references models(id) on delete cascade,
  title text not null,
  interval_days int,
  interval_flights int,
  last_done_date date,
  last_done_flights int,
  notes text
);

create table if not exists stock (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id text not null references models(id) on delete cascade,
  name text not null,
  reference text,
  quantity int,
  minimum int,
  location text
);

create table if not exists purchases (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id text not null references models(id) on delete cascade,
  date date,
  name text not null,
  reference text,
  quantity int,
  price numeric,
  store text,
  notes text
);

create table if not exists settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tab_order jsonb,
  stock_sort jsonb,
  stock_battery_sort jsonb,
  stock_battery_number_placement text,
  last_tab text,
  active_model_id text,
  updated_at timestamptz not null default now()
);

alter table models enable row level security;
alter table flights enable row level security;
alter table batteries enable row level security;
alter table maintenance enable row level security;
alter table stock enable row level security;
alter table purchases enable row level security;
alter table settings enable row level security;

drop policy if exists "models_user" on models;
drop policy if exists "flights_user" on flights;
drop policy if exists "batteries_user" on batteries;
drop policy if exists "maintenance_user" on maintenance;
drop policy if exists "stock_user" on stock;
drop policy if exists "purchases_user" on purchases;
drop policy if exists "settings_user" on settings;

create policy "models_user" on models for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "flights_user" on flights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "batteries_user" on batteries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "maintenance_user" on maintenance for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "stock_user" on stock for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "purchases_user" on purchases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "settings_user" on settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function import_app_data(p_user_id uuid)
returns void
language plpgsql
as $$
declare
  v_payload jsonb;
  v_settings jsonb;
  v_model jsonb;
begin
  select payload into v_payload from app_data where user_id = p_user_id;
  if v_payload is null then
    raise exception 'No app_data payload for user.';
  end if;

  delete from flights where user_id = p_user_id;
  delete from batteries where user_id = p_user_id;
  delete from maintenance where user_id = p_user_id;
  delete from stock where user_id = p_user_id;
  delete from purchases where user_id = p_user_id;
  delete from models where user_id = p_user_id;
  delete from settings where user_id = p_user_id;

  v_settings := v_payload->'settings';
  insert into settings (
    user_id,
    tab_order,
    stock_sort,
    stock_battery_sort,
    stock_battery_number_placement,
    last_tab,
    active_model_id
  ) values (
    p_user_id,
    coalesce(v_settings->'tabOrder', '[]'::jsonb),
    coalesce(v_settings->'stockSort', '{}'::jsonb),
    coalesce(v_settings->'stockBatterySort', '{}'::jsonb),
    coalesce(v_settings->>'stockBatteryNumberPlacement', 'first'),
    coalesce(v_settings->>'lastTab', 'flights'),
    coalesce(v_payload->>'activeModelId', null)
  );

  for v_model in select * from jsonb_array_elements(coalesce(v_payload->'models', '[]'::jsonb))
  loop
    insert into models (id, user_id, name, theme_color)
    values (
      v_model->>'id',
      p_user_id,
      coalesce(v_model->>'name', 'Modele'),
      coalesce(v_model->>'themeColor', '#c0501a')
    );

    insert into flights (id, user_id, model_id, date, duration, battery_id, notes)
    select
      f->>'id',
      p_user_id,
      v_model->>'id',
      nullif(f->>'date', '')::date,
      nullif(f->>'duration', '')::int,
      nullif(f->>'batteryId', ''),
      f->>'notes'
    from jsonb_array_elements(coalesce(v_model->'flights', '[]'::jsonb)) as f;

    insert into batteries (id, user_id, model_id, name, number, capacity, discharge_rate, cells, voltage, cycles, last_used, notes)
    select
      b->>'id',
      p_user_id,
      v_model->>'id',
      coalesce(b->>'name', 'Batterie'),
      b->>'number',
      nullif(b->>'capacity', '')::int,
      nullif(b->>'dischargeRate', '')::int,
      nullif(b->>'cells', '')::int,
      nullif(b->>'voltage', '')::numeric,
      nullif(b->>'cycles', '')::int,
      nullif(b->>'lastUsed', '')::date,
      b->>'notes'
    from jsonb_array_elements(coalesce(v_model->'batteries', '[]'::jsonb)) as b;

    insert into maintenance (id, user_id, model_id, title, interval_days, interval_flights, last_done_date, last_done_flights, notes)
    select
      m->>'id',
      p_user_id,
      v_model->>'id',
      coalesce(m->>'title', 'Maintenance'),
      nullif(m->>'intervalDays', '')::int,
      nullif(m->>'intervalFlights', '')::int,
      nullif(m->>'lastDoneDate', '')::date,
      nullif(m->>'lastDoneFlights', '')::int,
      m->>'notes'
    from jsonb_array_elements(coalesce(v_model->'maintenance', '[]'::jsonb)) as m;

    insert into stock (id, user_id, model_id, name, reference, quantity, minimum, location)
    select
      s->>'id',
      p_user_id,
      v_model->>'id',
      coalesce(s->>'name', 'Piece'),
      s->>'reference',
      nullif(s->>'quantity', '')::int,
      nullif(s->>'minimum', '')::int,
      s->>'location'
    from jsonb_array_elements(coalesce(v_model->'stock', '[]'::jsonb)) as s;

    insert into purchases (id, user_id, model_id, date, name, reference, quantity, price, store, notes)
    select
      p->>'id',
      p_user_id,
      v_model->>'id',
      nullif(p->>'date', '')::date,
      coalesce(p->>'name', 'Achat'),
      p->>'reference',
      nullif(p->>'quantity', '')::int,
      nullif(p->>'price', '')::numeric,
      p->>'store',
      p->>'notes'
    from jsonb_array_elements(coalesce(v_model->'purchases', '[]'::jsonb)) as p;
  end loop;
end;
$$;
