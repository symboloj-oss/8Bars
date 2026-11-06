import type { Database } from '../../types/database';
import type { CommunityRoom } from '../../types/community';
import type { RoomState, SlotInfo, SlotTake, SlotType } from '../../types/music';
import { createDefaultSlots } from '../../data/templates';

export type RoomRow = Database['public']['Tables']['rooms']['Row'];
export type SlotRow = Database['public']['Tables']['slots']['Row'];
export type TakeRow = Database['public']['Tables']['takes']['Row'];

/** takes 桶的公开访问 URL(免签名,RLS 公开读) */
export function publicAudioUrl(audioPath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/takes/${audioPath}`;
}

/** ISO 时间 → 中文相对时间(刚刚/12分钟前/1小时前/2天前) */
export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

/** 席位类型的默认头像(与录音保存时的映射保持一致) */
export function slotAvatar(slotType: SlotType): string {
  return slotType === 'drums' ? '🥁' : slotType === 'bass' ? '🎸' : slotType === 'chords' ? '🎹' : '🎙️';
}

/**
 * 把数据库的 slots + takes 行组装成前端的 SlotInfo[]。
 * 以 createDefaultSlots 的 AI 替补人设打底,再叠加数据库里的真人 take。
 * takesBySlotId 需按 created_at 降序(最新在前)。
 */
export function buildSlotInfos(
  slotRows: SlotRow[],
  takesBySlotId: Map<string, TakeRow[]>
): SlotInfo[] {
  const base = createDefaultSlots(); // 提供 TRACK 编号/角色文案/AI 替补 take
  const baseByType = new Map(base.map((s) => [s.type, s]));

  const ordered = ['drums', 'bass', 'chords', 'melody'] as SlotType[];
  const slotByType = new Map(slotRows.map((r) => [r.slot_type as SlotType, r]));

  return ordered
    .map((type) => {
      const row = slotByType.get(type);
      const b = baseByType.get(type);
      if (!row || !b) return null;

      const takeRows = takesBySlotId.get(row.id) || [];
      const humanTakes: SlotTake[] = takeRows.map((t) => ({
        id: t.id,
        title: `Take · @${t.musician_name}`,
        musician: {
          name: t.musician_name,
          avatar: t.musician_avatar,
          isAI: false,
          instrumentTitle: '云端实录 (8小节已对齐)',
          recordedAt: relTime(t.created_at),
        },
        audioBlobUrl: t.audio_path ? publicAudioUrl(t.audio_path) : undefined,
        latencyOffsetMs: t.latency_offset_ms,
        isAI: false,
        createdAt: relTime(t.created_at),
      }));

      // 有真人 take 且确实带音频才算"已接管";仅有元数据的种子席位回退 AI 合成发声
      const latest = humanTakes[0];
      const hasRealAudio = !!latest?.audioBlobUrl;

      return {
        ...b,
        id: row.id,
        volume: row.volume,
        isMuted: row.is_muted,
        isSolo: row.is_solo,
        latencyOffsetMs: row.latency_offset_ms,
        isCustomTake: hasRealAudio,
        musician: latest ? latest.musician : b.musician,
        takes: humanTakes.length ? [...humanTakes, ...b.takes] : b.takes,
        activeTakeIndex: 0,
      };
    })
    .filter((s): s is SlotInfo => s !== null);
}

/** 数据库行 → RoomState(房间页播放/录音用) */
export function roomToRoomState(
  roomRow: RoomRow,
  slotRows: SlotRow[],
  takesBySlotId: Map<string, TakeRow[]>
): RoomState {
  return {
    id: roomRow.id,
    title: roomRow.title,
    templateId: roomRow.template_id,
    bpm: roomRow.bpm,
    createdAt: roomRow.created_at,
    creatorName: roomRow.creator_name,
    slots: buildSlotInfos(slotRows, takesBySlotId),
    progression: roomRow.progression,
  };
}

/**
 * 数据库行 → CommunityRoom(乐队广场卡片用)。
 * humanSlotsCount / vacantRoles 是派生数据:由 takes 分组现场计算,不存列。
 */
export function rowToCommunityRoom(
  roomRow: RoomRow,
  slotRows: SlotRow[],
  takesBySlotId: Map<string, TakeRow[]>
): CommunityRoom {
  const allTypes: SlotType[] = ['drums', 'bass', 'chords', 'melody'];
  const occupied = new Set<SlotType>();
  for (const s of slotRows) {
    const takes = takesBySlotId.get(s.id) || [];
    if (takes.length > 0) occupied.add(s.slot_type as SlotType);
  }

  return {
    id: roomRow.id,
    title: roomRow.title,
    templateId: roomRow.template_id,
    genre: roomRow.genre,
    bpm: roomRow.bpm,
    progression: roomRow.progression,
    creatorName: roomRow.creator_name,
    creatorAvatar: roomRow.creator_avatar,
    contactInfo: roomRow.contact_info,
    recruitmentCall: roomRow.recruitment_call,
    tags: roomRow.tags,
    humanSlotsCount: occupied.size,
    vacantRoles: allTypes.filter((t) => !occupied.has(t)),
    likesCount: roomRow.likes_count,
    createdAt: relTime(roomRow.created_at),
    isOfficialSeed: roomRow.is_seed,
    slots: buildSlotInfos(slotRows, takesBySlotId),
  };
}
