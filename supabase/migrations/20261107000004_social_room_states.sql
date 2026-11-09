-- 8Bars 社交闭环数据状态：房间发布生命周期与原子创建。

alter table public.rooms
  add column if not exists status text not null default 'draft',
  add column if not exists published_at timestamptz;

alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms add constraint rooms_status_check
  check (status in ('draft', 'published', 'archived'));

update public.rooms
set status = 'published', published_at = coalesce(published_at, created_at)
where recruitment_call <> '' and status = 'draft';

create index if not exists rooms_status_created_at_idx
  on public.rooms (status, created_at desc);

create or replace function public.create_room_with_slots(
  p_title text,
  p_template_id text,
  p_bpm smallint,
  p_progression text[],
  p_creator_name text,
  p_creator_avatar text,
  p_slots jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_room_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if jsonb_array_length(p_slots) <> 4 then
    raise exception 'a room must contain exactly four slots';
  end if;

  insert into public.rooms (
    title, template_id, bpm, progression,
    creator_uid, creator_name, creator_avatar
  ) values (
    p_title, p_template_id, p_bpm, p_progression,
    auth.uid(), p_creator_name, coalesce(nullif(p_creator_avatar, ''), '🎸')
  ) returning id into v_room_id;

  insert into public.slots (room_id, slot_type, volume, latency_offset_ms)
  select v_room_id, slot.slot_type,
         coalesce(slot.volume, 0.85),
         coalesce(slot.latency_offset_ms, -80)
  from jsonb_to_recordset(p_slots) as slot(
    slot_type text,
    volume real,
    latency_offset_ms smallint
  );

  return v_room_id;
end;
$$;

grant execute on function public.create_room_with_slots(text, text, smallint, text[], text, text, jsonb)
  to authenticated;
