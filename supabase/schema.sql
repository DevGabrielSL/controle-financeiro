create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('checking', 'savings', 'cash', 'credit_card')),
  balance numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text not null default '#22c55e',
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null references public.accounts(id) on delete cascade,
  category_id text not null references public.categories(id) on delete restrict,
  description text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount >= 0),
  date date not null,
  due_date date,
  status text not null default 'pending' check (status in ('paid', 'pending')),
  notes text,
  card_payment_type text check (card_payment_type is null or card_payment_type in ('credit', 'debit')),
  source_id text,
  source_type text check (source_type in ('recurring', 'installment', 'loan')),
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null references public.accounts(id) on delete cascade,
  category_id text not null references public.categories(id) on delete restrict,
  description text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount >= 0),
  day_of_month int not null check (day_of_month between 1 and 28),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.installment_plans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null references public.accounts(id) on delete cascade,
  category_id text not null references public.categories(id) on delete restrict,
  description text not null,
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  installments int not null check (installments > 0),
  first_due_date date not null,
  paid_installments int not null default 0 check (paid_installments >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.loans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null references public.accounts(id) on delete cascade,
  category_id text not null references public.categories(id) on delete restrict,
  description text not null,
  direction text not null check (direction in ('borrowed', 'lent')),
  principal numeric(14, 2) not null check (principal >= 0),
  interest_rate numeric(8, 4) not null default 0,
  installments int not null check (installments > 0),
  first_due_date date not null,
  counterparty text not null,
  paid_installments int not null default 0 check (paid_installments >= 0),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_items enable row level security;
alter table public.installment_plans enable row level security;
alter table public.loans enable row level security;

create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users manage own accounts" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own recurring items" on public.recurring_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own installment plans" on public.installment_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own loans" on public.loans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
