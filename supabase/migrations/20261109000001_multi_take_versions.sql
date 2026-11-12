-- 多 Take 版本：同一席位保留多个录音，并明确当前播放版本。
alter table public.slots
  add column if not exists active_take_id uuid null;

-- 旧房间沿用最新一条有效录音作为初始当前版本。
with latest_takes as (
  select distinct on (t.slot_id) t.slot_id, t.id
  from public.takes t
  where t.audio_path is not null
  order by t.slot_id, t.created_at desc, t.id desc
)
update public.slots s
set active_take_id = latest_takes.id
from latest_takes
where latest_takes.slot_id = s.id and s.active_take_id is null;

-- 复合唯一键让 active_take_id 只能引用同一席位的 Take，避免跨席位关联。
create unique index if not exists takes_id_slot_unique on public.takes (id, slot_id);
alter table public.slots
  drop constraint if exists slots_active_take_same_slot_fkey;
alter table public.slots
  add constraint slots_active_take_same_slot_fkey
  foreign key (active_take_id, id)
  references public.takes (id, slot_id)
  on delete set null (active_take_id);

create index if not exists slots_active_take_idx
  on public.slots (active_take_id);

-- 允许已登录的房间协作者切换当前版本；不能改 room_id 或 slot_type。
create policy "slots_update_active_take" on public.slots
  for update to authenticated
  using (exists (select 1 from public.rooms r where r.id = room_id))
  with check (exists (select 1 from public.rooms r where r.id = room_id));

-- 限制客户端只能更新当前 Take 列，不能改席位类型、房间归属或混音参数。
revoke update on public.slots from anon, authenticated;
grant update (active_take_id) on public.slots to authenticated;

-- 房间协作需要及时看见新录音和当前版本切换。
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'takes'
    ) then
      execute 'alter publication supabase_realtime add table public.takes';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'slots'
    ) then
      execute 'alter publication supabase_realtime add table public.slots';
    end if;
  end if;
end;
$$;
