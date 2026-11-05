import type { CommunityRoom } from '../../types/community';
import type { RoomState, SlotInfo } from '../../types/music';
import { getSupabaseBrowser } from '../supabase/client';
import { ensureAnonymousUser } from '../supabase/auth';
import { RoomRow, SlotRow, TakeRow, rowToCommunityRoom, roomToRoomState } from './mappers';

// 房间 + 席位 + take 的完整快照(进入房间页时一次拉全)
export interface RoomBundle {
  room: RoomRow;
  slots: SlotRow[];
  takes: TakeRow[];
}

/** 按 slot_id 分组 takes(保持 created_at 降序) */
export function groupTakes(takes: TakeRow[]): Map<string, TakeRow[]> {
  const map = new Map<string, TakeRow[]>();
  for (const t of takes) {
    const list = map.get(t.slot_id) || [];
    list.push(t);
    map.set(t.slot_id, list);
  }
  return map;
}

/** 拉取乐队广场列表:先取房间 → 批量取席位 → 按 slot_id 批量取 take(三次批量查询,避免 N+1) */
export async function listPublishedRooms(): Promise<CommunityRoom[]> {
  const supabase = getSupabaseBrowser();
  const { data: roomRows, error: roomErr } = await supabase
    .from('rooms')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (roomErr || !roomRows || roomRows.length === 0) return [];

  const roomIds = roomRows.map((r) => r.id);
  const { data: slotRows, error: slotErr } = await supabase
    .from('slots')
    .select('*')
    .in('room_id', roomIds);
  if (slotErr) return [];

  const slotIds = (slotRows || []).map((s) => s.id);
  if (slotIds.length === 0) return [];

  const { data: takeRows } = await supabase
    .from('takes')
    .select('*')
    .in('slot_id', slotIds)
    .order('created_at', { ascending: false });

  const takesBySlotId = groupTakes(takeRows || []);

  return roomRows.map((r) => {
    const slots = (slotRows || []).filter((s) => s.room_id === r.id);
    return rowToCommunityRoom(r, slots, takesBySlotId);
  });
}

/** 拉取单个房间的完整数据(房间页用) */
export async function getRoomBundle(roomId: string): Promise<RoomBundle | null> {
  const supabase = getSupabaseBrowser();
  const { data: room, error: roomErr } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle();
  if (roomErr || !room) return null;

  const { data: slots, error: slotErr } = await supabase
    .from('slots')
    .select('*')
    .eq('room_id', roomId);
  if (slotErr) return null;

  const slotIds = (slots || []).map((s) => s.id);
  if (slotIds.length === 0) return { room, slots: [], takes: [] };

  const { data: takes, error: takeErr } = await supabase
    .from('takes')
    .select('*')
    .in('slot_id', slotIds)
    .order('created_at', { ascending: false });
  if (takeErr) return null;

  return { room, slots: slots || [], takes: takes || [] };
}

/** 创建房间:房间行 + 4 个席位行(匿名登录后以设备身份创建) */
export async function createRoom(input: {
  title: string;
  templateId: string;
  bpm: number;
  progression: string[];
  creatorName: string;
  creatorAvatar?: string;
  slots: SlotInfo[];
}): Promise<{ id: string; createdAt: string }> {
  const uid = await ensureAnonymousUser();
  const supabase = getSupabaseBrowser();

  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .insert({
      title: input.title,
      template_id: input.templateId,
      bpm: input.bpm,
      progression: input.progression,
      creator_uid: uid,
      creator_name: input.creatorName,
      creator_avatar: input.creatorAvatar || '🎸',
    })
    .select()
    .single();
  if (roomErr || !room) throw new Error('创建房间失败: ' + (roomErr?.message || '未知错误'));

  const { error: slotErr } = await supabase.from('slots').insert(
    input.slots.map((s) => ({
      room_id: room.id,
      slot_type: s.type,
      volume: s.volume,
      latency_offset_ms: s.latencyOffsetMs,
    }))
  );
  if (slotErr) console.warn('席位初始化失败(房间仍可用):', slotErr.message);

  return { id: room.id, createdAt: room.created_at };
}

/** 发布/更新房间的招募信息(房间行必须已存在且由本人创建) */
export async function updateRoomRecruitment(
  roomId: string,
  input: { genre?: string; contactInfo: string; recruitmentCall: string; tags: string[] }
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase
    .from('rooms')
    .update({
      genre: input.genre,
      contact_info: input.contactInfo,
      recruitment_call: input.recruitmentCall,
      tags: input.tags,
    })
    .eq('id', roomId);
  if (error) throw new Error('发布房间失败: ' + error.message);
}

/** 保存录音:先传音频到 storage,再插 take 行 */
export async function saveTake(input: {
  roomId: string;
  slotId: string;
  blob: Blob;
  latencyOffsetMs: number;
  musicianName: string;
  musicianAvatar: string;
}): Promise<TakeRow> {
  const uid = await ensureAnonymousUser();
  const supabase = getSupabaseBrowser();

  // 先传后插:路径 {roomId}/{uuid}.webm
  const filePath = `${input.roomId}/${crypto.randomUUID()}.webm`;
  const { error: uploadErr } = await supabase.storage
    .from('takes')
    .upload(filePath, input.blob, { contentType: input.blob.type || 'audio/webm' });
  if (uploadErr) throw new Error('音频上传失败: ' + uploadErr.message);

  const { data: take, error: takeErr } = await supabase
    .from('takes')
    .insert({
      slot_id: input.slotId,
      musician_uid: uid,
      musician_name: input.musicianName,
      musician_avatar: input.musicianAvatar,
      is_ai: false,
      audio_path: filePath,
      latency_offset_ms: input.latencyOffsetMs,
    })
    .select()
    .single();
  if (takeErr || !take) {
    console.warn('take 记录写入失败(音频已上传,遗留孤儿文件):', takeErr?.message);
    throw new Error('保存录音失败: ' + (takeErr?.message || '未知错误'));
  }
  return take;
}

/** 点赞/取消点赞:走数据库 RPC(原子计数 + 去重) */
export async function toggleLikeRoom(roomId: string): Promise<{ likesCount: number; liked: boolean }> {
  await ensureAnonymousUser();
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.rpc('toggle_like', { p_room_id: roomId });
  if (error || !data) throw new Error('点赞失败: ' + (error?.message || '未知错误'));
  // RPC 返回单行 [likes_count, liked]
  return { likesCount: (data as any).likes_count, liked: (data as any).liked };
}
