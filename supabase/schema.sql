-- Users
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  daily_task_limit int default 5 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Tasks (one per day)
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  is_completed boolean default false not null,
  slot_order int not null, -- 1-5 for today
  task_date date not null default current_date,
  completed_at timestamptz,
  created_at timestamptz default now() not null,
  unique(user_id, task_date, slot_order)
);

-- Inbox (uncategorized captures)
create table public.inbox_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  is_processed boolean default false not null,
  created_at timestamptz default now() not null
);

-- Streaks
create table public.streaks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  current_streak int default 0 not null,
  longest_streak int default 0 not null,
  last_completed_date date,
  created_at timestamptz default now() not null
);

-- Daily completions log (for streak calculation)
create table public.completion_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  completed_date date not null default current_date,
  tasks_completed int default 0 not null,
  unique(user_id, completed_date)
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.inbox_items enable row level security;
alter table public.streaks enable row level security;
alter table public.completion_log enable row level security;

-- RLS Policies
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Users can view own tasks" on tasks for select using (auth.uid() = user_id);
create policy "Users can insert own tasks" on tasks for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks" on tasks for update using (auth.uid() = user_id);
create policy "Users can delete own tasks" on tasks for delete using (auth.uid() = user_id);

create policy "Users can view own inbox" on inbox_items for select using (auth.uid() = user_id);
create policy "Users can insert own inbox" on inbox_items for insert with check (auth.uid() = user_id);
create policy "Users can update own inbox" on inbox_items for update using (auth.uid() = user_id);
create policy "Users can delete own inbox" on inbox_items for delete using (auth.uid() = user_id);

create policy "Users can view own streaks" on streaks for select using (auth.uid() = user_id);
create policy "Users can insert own streaks" on streaks for insert with check (auth.uid() = user_id);
create policy "Users can update own streaks" on streaks for update using (auth.uid() = user_id);

create policy "Users can view own logs" on completion_log for select using (auth.uid() = user_id);
create policy "Users can insert own logs" on completion_log for insert with check (auth.uid() = user_id);
create policy "Users can update own logs" on completion_log for update using (auth.uid() = user_id);

-- Function to create profile and streak on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  insert into public.streaks (user_id, current_streak, longest_streak)
  values (new.id, 0, 0);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
