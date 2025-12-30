drop policy if exists "Users can read own data" on app_data;
drop policy if exists "Users can insert own data" on app_data;
drop policy if exists "Users can update own data" on app_data;
drop policy if exists "Users can delete own data" on app_data;

create policy "Users can read own data"
  on app_data
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own data"
  on app_data
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own data"
  on app_data
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own data"
  on app_data
  for delete
  using (auth.uid() = user_id);

