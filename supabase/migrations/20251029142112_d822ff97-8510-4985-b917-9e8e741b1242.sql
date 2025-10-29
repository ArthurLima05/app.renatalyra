-- Criar enum para roles
create type public.app_role as enum ('admin', 'secretaria');

-- Criar tabela user_roles
create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    created_at timestamp with time zone default now(),
    unique (user_id, role)
);

-- Habilitar RLS
alter table public.user_roles enable row level security;

-- Políticas RLS para user_roles
create policy "Users can view their own roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can manage all roles"
on public.user_roles
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  )
);

-- Criar função security definer para verificar role
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Inserir role admin para o primeiro usuário (você pode ajustar depois)
-- Esta parte é comentada pois você precisará executar manualmente com o user_id correto
-- insert into public.user_roles (user_id, role) values ('seu-user-id-aqui', 'admin');