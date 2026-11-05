-- ============================================================
-- 8Bars 初始化迁移:数据表 + RLS + 点赞 RPC + 存储桶
-- 设计依据: docs/architecture.md
-- 安全模型: 所有读公开;所有写必须匿名登录(设备级 uid);
--           RLS 是唯一安全边界,不建 API 层
-- ============================================================

-- 生成随机 UUID 需要 pgcrypto(gen_random_uuid)
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. 数据表
-- ------------------------------------------------------------

-- 合奏房间:创建即入库,分享链接 = /room/{id}
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  template_id text not null,              -- 对应 src/data/templates.ts 的模板 id
  bpm smallint not null,                  -- 权威 BPM(进入房间后引擎以它为准,可覆盖模板默认值)
  progression text[] not null,            -- 8 个和弦名,每小节一个
  creator_uid uuid references auth.users(id) on delete set null,
  creator_name text not null,
  creator_avatar text not null default '🎸',
  genre text not null default '',
  contact_info text not null default '',
  recruitment_call text not null default '',
  tags text[] not null default '{}',
  likes_count integer not null default 0, -- 仅允许经 toggle_like() RPC 修改
  is_seed boolean not null default false,
  created_at timestamptz not null default now()
);
create index rooms_created_at_idx on rooms (created_at desc);

-- 固定 4 席位:每房恰好 4 行(drums/bass/chords/melody),由创建流程在事务内批量插入
create table public.slots (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  slot_type text not null check (slot_type in ('drums','bass','chords','melody')),
  volume real not null default 0.85,      -- 0..1
  is_muted boolean not null default false,
  is_solo boolean not null default false,
  latency_offset_ms smallint not null default -80,
  unique (room_id, slot_type)
);

-- 录音 Take:只有真人 take 才落库(AI 合成是代码行为);
-- audio_path 为空 = 种子房的"占位元数据"(无音频,播放时回退 AI 合成)
create table public.takes (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references slots(id) on delete cascade,
  musician_uid uuid references auth.users(id) on delete set null,
  musician_name text not null,
  musician_avatar text not null,
  is_ai boolean not null default false,
  audio_path text,                        -- storage 路径: {room_id}/{uuid}.webm
  latency_offset_ms smallint not null default -80,
  created_at timestamptz not null default now()
);
create index takes_slot_idx on takes (slot_id, created_at desc);

-- 点赞:(room_id, user_uid) 联合主键天然去重,计数维护在 toggle_like() RPC
create table public.likes (
  room_id uuid not null references rooms(id) on delete cascade,
  user_uid uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, user_uid)
);

-- ------------------------------------------------------------
-- 2. RLS:全表开启
-- ------------------------------------------------------------

alter table public.rooms enable row level security;
alter table public.slots enable row level security;
alter table public.takes enable row level security;
alter table public.likes enable row level security;

-- 读:全公开(广场列表 / 房间页 / SEO 预取 / 匿名访客)
create policy "rooms_public_read" on rooms for select using (true);
create policy "slots_public_read" on slots for select using (true);
create policy "takes_public_read" on takes for select using (true);
create policy "likes_public_read" on likes for select using (true);

-- 写:房间只归创建者
create policy "rooms_insert_own" on rooms for insert to authenticated
  with check (creator_uid = auth.uid());
create policy "rooms_update_own" on rooms for update to authenticated
  using (creator_uid = auth.uid()) with check (creator_uid = auth.uid());
create policy "slots_insert_own_room" on slots for insert to authenticated
  with check (exists (select 1 from rooms r where r.id = room_id and r.creator_uid = auth.uid()));
-- slots 不开放 update/delete:席位状态由房主改 rooms 或经后续功能处理

-- 写:任何登录(匿名)访客都可以往任意房间录 Take —— 这就是产品的核心循环
create policy "takes_insert_any_member" on takes for insert to authenticated
  with check (musician_uid = auth.uid() and exists (
    select 1 from slots s join rooms r on r.id = s.room_id where s.id = slot_id));
create policy "takes_update_own" on takes for update to authenticated
  using (musician_uid = auth.uid());
create policy "takes_delete_own" on takes for delete to authenticated
  using (musician_uid = auth.uid());

-- 点赞:不开放直接写 likes,只能经 RPC(去重 + 原子计数,防匿名用户篡改 likes_count)
create or replace function public.toggle_like(p_room_id uuid)
returns table (likes_count integer, liked boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'login required';
  end if;
  if exists (select 1 from likes where room_id = p_room_id and user_uid = v_uid) then
    delete from likes where room_id = p_room_id and user_uid = v_uid;
    update rooms set likes_count = likes_count - 1 where id = p_room_id;
    liked := false;
  else
    insert into likes (room_id, user_uid) values (p_room_id, v_uid);
    update rooms set likes_count = likes_count + 1 where id = p_room_id;
    liked := true;
  end if;
  select r.likes_count into likes_count from rooms r where r.id = p_room_id;
  return next;
end;
$$;
grant execute on function public.toggle_like(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3. 存储桶
-- ------------------------------------------------------------

-- 用户录音桶:公开读(免签名 URL 直接播放),5MB 上限(8 小节 webm 实际约 150-800KB),
-- MIME 包含 audio/mp4 是为了兼容 iOS Safari 的 MediaRecorder 输出
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('takes', 'takes', true, 5242880,
        array['audio/webm','audio/ogg','audio/mp4','audio/wav','audio/x-m4a'])
on conflict (id) do update set public = true;

-- 模板预置音频切片桶(PRD 冷启动机制:房主录制的 drum/bass 等高品质 Loop 补位)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('template-assets', 'template-assets', true, 10485760,
        array['audio/mpeg','audio/webm','audio/ogg','audio/wav','audio/mp4','audio/x-m4a'])
on conflict (id) do update set public = true;

-- takes:公开读;登录用户可上传(且第一级目录必须是真实存在的房间);只能删自己的文件
create policy "takes_bucket_public_read" on storage.objects
  for select using (bucket_id = 'takes');
create policy "takes_bucket_insert_auth" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'takes'
    and (storage.foldername(name))[1]::uuid in (select id from public.rooms));
create policy "takes_bucket_delete_own" on storage.objects
  for delete to authenticated using (bucket_id = 'takes' and owner = auth.uid());

-- template-assets:公开读;文件由项目主理人在 Supabase 后台以管理员身份上传,无需写策略
create policy "template_assets_bucket_public_read" on storage.objects
  for select using (bucket_id = 'template-assets');
