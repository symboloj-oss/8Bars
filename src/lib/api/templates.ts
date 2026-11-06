import { getSupabaseBrowser } from '../supabase/client';
import { getChordDetail } from '../../data/chords';
import { RoomTemplate } from '../../types/music';

// 模板数据访问:全部来自 Supabase templates 表(公开读)
// 行 → RoomTemplate 映射:progressionDetails 由和弦库派生,colorScheme 由 accent_color 映射

const ACCENT_SCHEMES: Record<string, RoomTemplate['colorScheme']> = {
  amber: { accent: 'amber', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  indigo: { accent: 'indigo', border: 'border-indigo-500/30', bg: 'bg-indigo-500/10' },
  rose: { accent: 'rose', border: 'border-rose-500/30', bg: 'bg-rose-500/10' },
  emerald: { accent: 'emerald', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  orange: { accent: 'orange', border: 'border-orange-500/30', bg: 'bg-orange-500/10' },
};

function rowToTemplate(row: {
  id: string;
  title: string;
  tagline: string;
  bpm: number;
  key: string;
  genre: string;
  icon: string;
  accent_color: string;
  progression: string[];
  drum_groove: string;
  bass_line_type: string;
  chords_strum_type: string;
  melody_hook_type: string;
}): RoomTemplate {
  return {
    id: row.id,
    title: row.title,
    tagline: row.tagline,
    bpm: row.bpm,
    key: row.key,
    genre: row.genre,
    icon: row.icon,
    colorScheme: ACCENT_SCHEMES[row.accent_color] || ACCENT_SCHEMES.amber,
    progression: row.progression,
    // 和弦详情由前端乐理库派生(数据只存和弦名)
    progressionDetails: row.progression.map((name) => getChordDetail(name)),
    drumGroove: row.drum_groove as RoomTemplate['drumGroove'],
    bassLineType: row.bass_line_type as RoomTemplate['bassLineType'],
    chordsStrumType: row.chords_strum_type as RoomTemplate['chordsStrumType'],
    melodyHookType: row.melody_hook_type as RoomTemplate['melodyHookType'],
  };
}

// 拉取全部模板(按 sort_order 排序)。失败抛出,由调用方决定兜底策略
export async function listTemplates(): Promise<RoomTemplate[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToTemplate);
}
