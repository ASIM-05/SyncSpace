create table if not exists public.rooms (
  id text primary key check (id ~ '^[a-z0-9-]{3,64}$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.board_state (
  room_id text primary key references public.rooms(id) on delete cascade,
  lines jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.room_documents (
  room_id text primary key references public.rooms(id) on delete cascade,
  state text not null,
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.board_state enable row level security;
alter table public.room_documents enable row level security;
