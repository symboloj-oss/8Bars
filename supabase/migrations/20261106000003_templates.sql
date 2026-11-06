-- 模板表:和弦模板(内容数据,公开读)
-- 前端不再硬编码模板,加新模板只需插行,无需发版
create table public.templates (
  id text primary key,
  title text not null,
  tagline text not null default '',
  bpm integer not null,
  key text not null default 'C Major',
  genre text not null default '',
  icon text not null default 'Sparkles',
  accent_color text not null default 'amber',
  progression text[] not null,
  drum_groove text not null default '',
  bass_line_type text not null default '',
  chords_strum_type text not null default '',
  melody_hook_type text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.templates enable row level security;

-- 读公开;写仅服务端(经 Supabase CLI / MCP 管理)
create policy "templates 公开读"
  on public.templates for select
  using (true);

-- 种子数据:4 个预置模板(与前端旧硬编码一致,确定性可重放)
insert into public.templates
  (id, title, tagline, bpm, key, genre, icon, accent_color, progression,
   drum_groove, bass_line_type, chords_strum_type, melody_hook_type, sort_order)
values
  ('friday-pop',
   '周五夜流行 (Friday Pop)',
   '金牌卡农流行走向,阳光律动,初学者最好上手的万能 8 小节',
   90, 'C Major', 'Pop / Indie', 'Sparkles', 'amber',
   array['C','G','Am','F','C','G','Am','F'],
   'pop_groove', 'pop_driving', 'pop_acoustic', 'pop_synth', 1),
  ('midnight-jazz',
   '微醺爵士小憩 (Midnight Lo-Fi)',
   '2-5-1 经典爵士走向与 Lo-Fi 摇摆鼓点,咖啡馆式松弛氛围',
   80, 'C Major (Jazz Modal)', 'Lo-Fi / Jazz Hop', 'Moon', 'indigo',
   array['Dm7','G7','Cmaj7','A7','Dm7','G7','Cmaj7','A7'],
   'jazz_lofi', 'walking_swing', 'rhodes_chill', 'jazz_horn', 2),
  ('retro-funk',
   '复古放克律动 (Retro Funk 8-Bar)',
   '跳跃切分切音与放克贝斯 Slap,自带摇摆身体的强劲律动',
   104, 'E Minor', 'Funk / Groove', 'Flame', 'rose',
   array['Em7','A7','Em7','B7','Em7','A7','Em7','B7'],
   'funk_slap', 'funk_syncopated', 'funk_skank', 'funk_whistle', 3),
  ('indie-folk',
   '民谣公路 (Indie Folk Road)',
   '木吉他扫弦与温暖根音,风吹过麦浪的治愈系旋律走向',
   86, 'G Major', 'Folk / Acoustic', 'Sun', 'emerald',
   array['G','D','Em','C','G','D','Em','C'],
   'folk_acoustic', 'folk_warm', 'folk_strum', 'folk_lead', 4)
on conflict (id) do nothing;
