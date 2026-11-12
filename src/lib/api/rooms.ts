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
    // 只有明确发布且填写招募信息的房间进入广场。
    .eq('status', 'published')
    .neq('recruitment_call', '')
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
  await ensureAnonymousUser();
  const supabase = getSupabaseBrowser();

  const slots = input.slots.map((s) => ({
    slot_type: s.type,
    volume: s.volume,
    latency_offset_ms: s.latencyOffsetMs,
  }));
  const { data: roomId, error } = await supabase.rpc('create_room_with_slots', {
    p_title: input.title,
    p_template_id: input.templateId,
    p_bpm: input.bpm,
    p_progression: input.progression,
    p_creator_name: input.creatorName,
    p_creator_avatar: input.creatorAvatar || '🎸',
    p_slots: slots,
  });
  if (error || !roomId) throw new Error('创建房间失败: ' + (error?.message || '未知错误'));

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('created_at')
    .eq('id', roomId)
    .single();
  if (roomError || !room) throw new Error('创建房间失败: 无法读取房间时间');

  return { id: roomId, createdAt: room.created_at };
}

/** 发布/更新房间的招募信息(房间行必须已存在且由本人创建) */
export async function updateRoomRecruitment(
  roomId: string,
  input: { genre?: string; contactInfo: string; recruitmentCall: string; tags: string[] }
): Promise<void> {
  await ensureAnonymousUser();
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from('rooms')
    .update({
      genre: input.genre,
      contact_info: input.contactInfo,
      recruitment_call: input.recruitmentCall,
      tags: input.tags,
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', roomId)
    .select('id')
    .maybeSingle();
  if (error) throw new Error('发布房间失败: ' + error.message);
  if (!data) throw new Error('发布房间失败: 当前身份不是房主或房间已不存在');
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
  // Storage 桶按基础 MIME 校验;MediaRecorder 可能返回 audio/webm;codecs=opus。
  const contentType = (input.blob.type || 'audio/webm').split(';', 1)[0];
  const { error: uploadErr } = await supabase.storage
    .from('takes')
    .upload(filePath, input.blob, { contentType });
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
    const { error: cleanupErr } = await supabase.storage.from('takes').remove([filePath]);
    if (cleanupErr) {
      console.warn('take 记录写入失败,且孤儿音频清理失败:', cleanupErr.message);
    }
    throw new Error('保存录音失败: ' + (takeErr?.message || '未知错误'));
  }
  return take;
}

/** 首条有效录音自动成为当前版本；并发上传时仅一个 Take 能完成首次激活。 */
export async function activateTakeIfEmpty(slotId: string, takeId: string): Promise<string | null> {
  await ensureAnonymousUser();
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from('slots')
    .update({ active_take_id: takeId })
    .eq('id', slotId)
    .is('active_take_id', null)
    .select('active_take_id')
    .maybeSingle();
  if (error) {
    // 在迁移尚未部署的旧环境里保留录音上传能力，前端会继续按最新版本回退。
    if (error.message.includes('active_take_id')) return null;
    throw new Error('设置当前录音失败: ' + error.message);
  }
  if (data?.active_take_id) return data.active_take_id;

  const { data: slot, error: readError } = await supabase
    .from('slots')
    .select('active_take_id')
    .eq('id', slotId)
    .maybeSingle();
  if (readError) throw new Error('读取当前录音失败: ' + readError.message);
  return slot?.active_take_id ?? null;
}

/** 明确切换当前播放版本；数据库复合外键确保 Take 属于该席位。 */
export async function setActiveTake(slotId: string, takeId: string): Promise<void> {
  await ensureAnonymousUser();
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from('slots')
    .update({ active_take_id: takeId })
    .eq('id', slotId)
    .select('id')
    .maybeSingle();
  if (error) throw new Error('切换播放版本失败: ' + error.message);
  if (!data) throw new Error('切换播放版本失败: 席位不存在或当前身份无权操作');
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
