-- セキュリティ強化（監査で発見した穴をふさぐ）
-- 1) UPDATE ポリシーに WITH CHECK を付与（昇格・改ざん防止）
-- 2) コメント更新のカラム改ざんをトリガで禁止（他人の本文/作者/位置を変えられない）
-- 3) プロジェクトの owner_id を不変に
-- 4) comments を REPLICA IDENTITY FULL（Realtime の DELETE/UPDATE 正確化）

-- ---- projects ----
drop policy if exists projects_update on kikou.projects;
create policy projects_update on kikou.projects for update to authenticated
  using (kikou.is_author(id))
  with check (kikou.is_author(id));

-- owner_id / archived 以外を著者が変えるのは可。owner_id は不変に。
create or replace function kikou.guard_project_update()
returns trigger language plpgsql as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id は変更できません';
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_project_update on kikou.projects;
create trigger trg_guard_project_update before update on kikou.projects
  for each row execute function kikou.guard_project_update();

-- ---- profiles ----
drop policy if exists profiles_update on kikou.profiles;
create policy profiles_update on kikou.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---- comments ----
drop policy if exists comments_update_own on kikou.comments;
create policy comments_update_own on kikou.comments for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists comments_update_author on kikou.comments;
create policy comments_update_author on kikou.comments for update to authenticated
  using (kikou.is_author(kikou.project_of_position(position_id)))
  with check (kikou.is_author(kikou.project_of_position(position_id)));

-- 本人以外（＝著者の解決トグル）は resolved 以外を変えられない。
-- 本人でも author_id / position_id / parent_id は不変。
create or replace function kikou.guard_comment_update()
returns trigger language plpgsql security definer
set search_path = kikou, public as $$
begin
  if new.author_id is distinct from old.author_id
     or new.position_id is distinct from old.position_id
     or new.parent_id is distinct from old.parent_id then
    raise exception 'コメントの作者・位置は変更できません';
  end if;
  if auth.uid() <> old.author_id then
    -- 他人（著者）の更新は解決状態の切替のみ許可
    if new.body is distinct from old.body then
      raise exception '他人のコメント本文は変更できません';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_comment_update on kikou.comments;
create trigger trg_guard_comment_update before update on kikou.comments
  for each row execute function kikou.guard_comment_update();

-- ---- chapters / positions の WITH CHECK は既存 for all ポリシーに含まれるため追加不要 ----

-- ---- Realtime 正確化 ----
alter table kikou.comments replica identity full;
