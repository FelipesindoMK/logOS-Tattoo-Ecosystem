-- ============================================================
--  CONECT TATTOO — Estrutura completa do banco (Supabase)
--  Como usar: Supabase → SQL Editor → colar tudo → Run
-- ============================================================

-- ── Extensão necessária pra gerar IDs únicos ──
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1) PERFIS (dados públicos de cada usuário, ligados ao login)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  bio text,
  instagram_handle text,
  avatar_url text,
  is_public boolean not null default true,
  role text not null default 'tatuador', -- 'tatuador' | 'tatuadora' | 'estudante' | 'cliente'
  country_code text not null default 'BR', -- sigla ISO do país (BR, US, PT, etc) — usada pra mostrar a bandeirinha no chat
  person_type text not null default 'fisica' check (person_type in ('fisica','juridica')),
  document_number text, -- CPF (pessoa física) ou CNPJ (pessoa jurídica), só dígitos
  company_name text, -- razão social — só preenchido quando person_type = 'juridica'
  nickname text, -- apelido / nome artístico (opcional, diferente do @username)
  state text, -- estado (UF, se Brasil) ou província/estado (se outro país)
  city text,
  phone text, -- com DDI, ex: "+55 (11) 91234-5678"
  created_at timestamptz not null default now()
);

-- ── Até 5 fotos de trampo por perfil ──
create table public.profile_photos (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint max_5_fotos check (position between 0 and 4)
);

-- ── Cria o perfil automaticamente assim que alguém se cadastra ──
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, username, display_name, role, country_code,
    person_type, document_number, company_name, nickname, state, city, phone
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Novo usuário'),
    coalesce(new.raw_user_meta_data->>'role', 'tatuador'),
    coalesce(new.raw_user_meta_data->>'country_code', 'BR'),
    coalesce(new.raw_user_meta_data->>'person_type', 'fisica'),
    new.raw_user_meta_data->>'document_number',
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'nickname',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2) SEGUIDORES (solicitação de seguir / aceitar / bloquear)
-- ============================================================
create table public.follows (
  id uuid primary key default uuid_generate_v4(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending', -- 'pending' | 'accepted' | 'blocked'
  created_at timestamptz not null default now(),
  unique (follower_id, following_id)
);

-- ============================================================
-- 3) CONVERSAS PRIVADAS (solicitação de mensagem / aceitar / bloquear)
-- ============================================================
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending', -- 'pending' | 'accepted' | 'blocked'
  requested_by uuid not null references public.profiles(id),
  pinned_by_a boolean not null default false,
  pinned_by_b boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);

-- ============================================================
-- 4) MENSAGENS (globais e privadas, na mesma tabela)
-- ============================================================
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  channel text not null default 'global', -- 'global' | 'private'
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now(),
  constraint private_precisa_de_conversa check (
    (channel = 'global' and conversation_id is null) or
    (channel = 'private' and conversation_id is not null)
  )
);

create index idx_messages_channel on public.messages (channel, created_at desc);
create index idx_messages_conversation on public.messages (conversation_id, created_at desc);

-- ============================================================
-- 5) SEGURANÇA (Row Level Security) — cada um vê só o que pode
-- ============================================================
alter table public.profiles enable row level security;
alter table public.profile_photos enable row level security;
alter table public.follows enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Perfis: todo mundo logado pode ver perfis públicos; dono sempre vê o próprio
create policy "ver perfis públicos ou o próprio"
  on public.profiles for select
  using (is_public = true or id = auth.uid());

create policy "editar só o próprio perfil"
  on public.profiles for update
  using (id = auth.uid());

-- Fotos: seguem a mesma regra do perfil dono
create policy "ver fotos de perfis públicos ou próprio"
  on public.profile_photos for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_photos.profile_id
      and (p.is_public = true or p.id = auth.uid())
    )
  );

create policy "gerenciar só as próprias fotos"
  on public.profile_photos for all
  using (profile_id = auth.uid());

-- Follows: usuário vê solicitações que enviou ou recebeu
create policy "ver follows relacionados a mim"
  on public.follows for select
  using (follower_id = auth.uid() or following_id = auth.uid());

create policy "criar solicitação de seguir"
  on public.follows for insert
  with check (follower_id = auth.uid());

create policy "responder solicitação recebida"
  on public.follows for update
  using (following_id = auth.uid() or follower_id = auth.uid());

-- Conversations: só quem participa vê
create policy "ver minhas conversas"
  on public.conversations for select
  using (user_a = auth.uid() or user_b = auth.uid());

create policy "criar conversa"
  on public.conversations for insert
  with check (requested_by = auth.uid());

create policy "responder/fixar minha conversa"
  on public.conversations for update
  using (user_a = auth.uid() or user_b = auth.uid());

-- Messages: global todo mundo vê; privada só quem participa da conversa
create policy "ver mensagens globais"
  on public.messages for select
  using (channel = 'global');

create policy "ver mensagens privadas das minhas conversas"
  on public.messages for select
  using (
    channel = 'private' and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid())
      and c.status = 'accepted'
    )
  );

create policy "enviar mensagem global"
  on public.messages for insert
  with check (channel = 'global' and sender_id = auth.uid());

create policy "enviar mensagem privada (conversa aceita)"
  on public.messages for insert
  with check (
    channel = 'private' and sender_id = auth.uid() and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid())
      and c.status = 'accepted'
    )
  );

-- ============================================================
-- 6) TEMPO REAL — liga as tabelas de chat ao "Realtime" do Supabase
-- ============================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.follows;
alter publication supabase_realtime add table public.conversations;

-- ============================================================
-- 6.1) FAVORITOS / REFERÊNCIAS — reaproveita a lógica do "follow"
-- ============================================================
create table public.profile_relations (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('favorito', 'referencia')),
  created_at timestamptz not null default now(),
  unique (owner_id, target_id, type)
);

alter table public.profile_relations enable row level security;

create policy "ver minhas relações (favoritos/referências)"
  on public.profile_relations for select
  using (owner_id = auth.uid());

create policy "criar minhas relações"
  on public.profile_relations for insert
  with check (owner_id = auth.uid());

create policy "apagar minhas relações"
  on public.profile_relations for delete
  using (owner_id = auth.uid());

-- ============================================================
-- 7) ARMAZENAMENTO DE FOTOS (avatar + fotos de trampo)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('trampos', 'trampos', true)
on conflict (id) do nothing;

-- Qualquer pessoa pode VER as fotos (perfil público de tatuador)
create policy "fotos são públicas pra visualização"
  on storage.objects for select
  using (bucket_id in ('avatars', 'trampos'));

-- Só o dono pode enviar/apagar fotos na própria pasta (nome da pasta = seu user id)
create policy "usuário gerencia só a própria pasta de fotos"
  on storage.objects for insert
  with check (
    bucket_id in ('avatars', 'trampos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "usuário apaga só as próprias fotos"
  on storage.objects for delete
  using (
    bucket_id in ('avatars', 'trampos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
