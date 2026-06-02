-- 棋稿 / Kikō 初期スキーマ
-- 共有 Supabase 内に専用スキーマ kikou を切り、全テーブルに RLS を付与する。
-- メンバー所属は kikou.project_members のみが真実。他アプリのデータには一切触れない。

create schema if not exists kikou;

-- ロール privileges（PostgREST / Realtime / service_role 用）
grant usage on schema kikou to anon, authenticated, service_role;

-- ============================================================
-- 列挙型
-- ============================================================
do $$ begin
  create type kikou.member_role as enum ('author', 'editor');
exception when duplicate_object then null; end $$;

-- ============================================================
-- テーブル
-- ============================================================
create table if not exists kikou.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

create table if not exists kikou.projects (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists kikou.project_members (
  project_id uuid not null references kikou.projects(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       kikou.member_role not null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists kikou.invites (
  code        text primary key,
  project_id  uuid not null references kikou.projects(id) on delete cascade,
  role        kikou.member_role not null default 'editor',
  created_by  uuid not null references auth.users(id) on delete cascade,
  expires_at  timestamptz,
  consumed_by uuid references auth.users(id),
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists kikou.chapters (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references kikou.projects(id) on delete cascade,
  title      text not null default '新しい章',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists kikou.positions (
  id           uuid primary key default gen_random_uuid(),
  chapter_id   uuid not null references kikou.chapters(id) on delete cascade,
  title        text not null default '新しい局面',
  sfen         text not null default 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1',
  side_to_move char(1) not null default 'b',
  kifu_jkf     jsonb,
  description  text not null default '',
  sort_order   integer not null default 0,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create table if not exists kikou.comments (
  id          uuid primary key default gen_random_uuid(),
  position_id uuid not null references kikou.positions(id) on delete cascade,
  parent_id   uuid references kikou.comments(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  body        text not null,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists kikou.attachments (
  id          uuid primary key default gen_random_uuid(),
  position_id uuid not null references kikou.positions(id) on delete cascade,
  storage_path text not null,
  caption     text not null default '',
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists idx_chapters_project on kikou.chapters(project_id);
create index if not exists idx_positions_chapter on kikou.positions(chapter_id);
create index if not exists idx_comments_position on kikou.comments(position_id);
create index if not exists idx_members_user on kikou.project_members(user_id);
create index if not exists idx_attachments_position on kikou.attachments(position_id);

-- ============================================================
-- ヘルパ関数（SECURITY DEFINER で RLS の再帰を回避）
-- ============================================================
create or replace function kikou.is_member(p uuid)
returns boolean language sql security definer stable
set search_path = kikou, public as $$
  select exists (
    select 1 from kikou.project_members
    where project_id = p and user_id = auth.uid()
  );
$$;

create or replace function kikou.is_author(p uuid)
returns boolean language sql security definer stable
set search_path = kikou, public as $$
  select exists (
    select 1 from kikou.project_members
    where project_id = p and user_id = auth.uid() and role = 'author'
  );
$$;

create or replace function kikou.project_of_chapter(c uuid)
returns uuid language sql security definer stable
set search_path = kikou, public as $$
  select project_id from kikou.chapters where id = c;
$$;

create or replace function kikou.project_of_position(p uuid)
returns uuid language sql security definer stable
set search_path = kikou, public as $$
  select ch.project_id
  from kikou.positions po
  join kikou.chapters ch on ch.id = po.chapter_id
  where po.id = p;
$$;

-- positions.updated_at 自動更新
create or replace function kikou.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_positions_touch on kikou.positions;
create trigger trg_positions_touch before update on kikou.positions
  for each row execute function kikou.touch_updated_at();

-- ============================================================
-- RLS 有効化
-- ============================================================
alter table kikou.profiles        enable row level security;
alter table kikou.projects        enable row level security;
alter table kikou.project_members enable row level security;
alter table kikou.invites         enable row level security;
alter table kikou.chapters        enable row level security;
alter table kikou.positions       enable row level security;
alter table kikou.comments        enable row level security;
alter table kikou.attachments     enable row level security;

-- profiles: 認証済みは閲覧可（コメント主の表示名を出すため）、書込は自分の行のみ
drop policy if exists profiles_select on kikou.profiles;
create policy profiles_select on kikou.profiles for select to authenticated using (true);
drop policy if exists profiles_insert on kikou.profiles;
create policy profiles_insert on kikou.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update on kikou.profiles;
create policy profiles_update on kikou.profiles for update to authenticated using (id = auth.uid());

-- projects: メンバーのみ閲覧、著者のみ更新/削除、作成は本人がオーナー
drop policy if exists projects_select on kikou.projects;
create policy projects_select on kikou.projects for select to authenticated using (kikou.is_member(id));
drop policy if exists projects_insert on kikou.projects;
create policy projects_insert on kikou.projects for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists projects_update on kikou.projects;
create policy projects_update on kikou.projects for update to authenticated using (kikou.is_author(id));

-- project_members: メンバーは一覧閲覧可。書込はサーバ(service_role)経由のみ＝クライアント不可
drop policy if exists members_select on kikou.project_members;
create policy members_select on kikou.project_members for select to authenticated using (kikou.is_member(project_id));

-- invites: 著者のみ閲覧。発行/消費はサーバ(service_role)経由
drop policy if exists invites_select on kikou.invites;
create policy invites_select on kikou.invites for select to authenticated using (kikou.is_author(project_id));

-- chapters: メンバー閲覧、著者のみ書込
drop policy if exists chapters_select on kikou.chapters;
create policy chapters_select on kikou.chapters for select to authenticated using (kikou.is_member(project_id));
drop policy if exists chapters_write on kikou.chapters;
create policy chapters_write on kikou.chapters for all to authenticated
  using (kikou.is_author(project_id)) with check (kikou.is_author(project_id));

-- positions: メンバー閲覧、著者のみ書込
drop policy if exists positions_select on kikou.positions;
create policy positions_select on kikou.positions for select to authenticated
  using (kikou.is_member(kikou.project_of_chapter(chapter_id)));
drop policy if exists positions_write on kikou.positions;
create policy positions_write on kikou.positions for all to authenticated
  using (kikou.is_author(kikou.project_of_chapter(chapter_id)))
  with check (kikou.is_author(kikou.project_of_chapter(chapter_id)));

-- comments: メンバー閲覧 / メンバーは投稿可(本人名義) / 自分の発言は更新削除 / 著者は解決トグル可
drop policy if exists comments_select on kikou.comments;
create policy comments_select on kikou.comments for select to authenticated
  using (kikou.is_member(kikou.project_of_position(position_id)));
drop policy if exists comments_insert on kikou.comments;
create policy comments_insert on kikou.comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and kikou.is_member(kikou.project_of_position(position_id))
  );
drop policy if exists comments_update_own on kikou.comments;
create policy comments_update_own on kikou.comments for update to authenticated
  using (author_id = auth.uid());
drop policy if exists comments_update_author on kikou.comments;
create policy comments_update_author on kikou.comments for update to authenticated
  using (kikou.is_author(kikou.project_of_position(position_id)));
drop policy if exists comments_delete_own on kikou.comments;
create policy comments_delete_own on kikou.comments for delete to authenticated
  using (author_id = auth.uid());

-- attachments: メンバー閲覧 / メンバーは本人名義で追加 / 自分の添付は削除
drop policy if exists attachments_select on kikou.attachments;
create policy attachments_select on kikou.attachments for select to authenticated
  using (kikou.is_member(kikou.project_of_position(position_id)));
drop policy if exists attachments_insert on kikou.attachments;
create policy attachments_insert on kikou.attachments for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and kikou.is_member(kikou.project_of_position(position_id))
  );
drop policy if exists attachments_delete_own on kikou.attachments;
create policy attachments_delete_own on kikou.attachments for delete to authenticated
  using (uploaded_by = auth.uid());

-- ============================================================
-- テーブル privileges（RLS と併用）
-- ============================================================
grant all on all tables in schema kikou to service_role;
grant all on all sequences in schema kikou to service_role;
grant select, insert, update, delete on all tables in schema kikou to authenticated;

-- ============================================================
-- Realtime（postgres_changes）: コメントを購読対象に
-- 注意: クライアント側は .on('postgres_changes', { schema:'kikou', ... }) で
--       スキーマ名を明示する必要がある（db:{schema} は PostgREST 用で別物）
-- ============================================================
do $$ begin
  alter publication supabase_realtime add table kikou.comments;
exception when duplicate_object then null; end $$;
