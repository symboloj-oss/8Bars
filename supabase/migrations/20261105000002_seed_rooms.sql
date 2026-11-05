-- ============================================================
-- 种子数据:4 个官方示例房间(来自原 src/data/communityRooms.ts)
-- 幂等:确定性 UUID + on conflict do nothing,重复执行不会产生重复数据
-- 注意修正:原 TS 数据的 templateId 与模板库不匹配,这里已对齐真实模板 id;
--          bpm 保留原值(76/82),引擎以 rooms.bpm 为权威值播放
-- ============================================================

-- 房间 1:周五下班解压卡农 (friday-pop, 90 BPM, 12分钟前)
insert into public.rooms (id, title, template_id, bpm, progression, creator_name, creator_avatar,
                          genre, contact_info, recruitment_call, tags, likes_count, is_seed, created_at)
values ('10000000-0000-4000-8000-000000000001', '周五下班解压卡农 (Pop Friday)', 'friday-pop', 90,
        array['C','G','Am','F','C','G','Am','F'],
        '阿杰 (木吉他手)', '🎸', '流行卡农 / Pop Canon', '微信: guitar_ajie99',
        '木吉他扫弦已录好,急求一位贝斯老哥稳住根音,再来个主奏独奏!新手绝对友好!',
        array['新手友好','急缺贝斯','卡农走向','扫弦'], 38, true, now() - interval '12 minutes')
on conflict (id) do nothing;

insert into public.slots (id, room_id, slot_type, volume, latency_offset_ms) values
  ('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'drums',  0.85, -80),
  ('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', 'bass',   0.80, -80),
  ('20000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', 'chords', 0.90, -75),
  ('20000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', 'melody', 0.75, -80)
on conflict (id) do nothing;

-- 人类席位各 1 条 take;AI 替补席位不插 take(播放时回退 AI 合成)
insert into public.takes (id, slot_id, musician_name, musician_avatar, is_ai, audio_path, latency_offset_ms, created_at) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000011',
   '鼓手大明', '🥁', false, null, -80, now() - interval '25 minutes'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000013',
   '阿杰 (房主)', '🎸', false, null, -75, now() - interval '12 minutes')
on conflict (id) do nothing;

-- 房间 2:微醺落日海风 (midnight-jazz, 76 BPM, 35分钟前)
insert into public.rooms (id, title, template_id, bpm, progression, creator_name, creator_avatar,
                          genre, contact_info, recruitment_call, tags, likes_count, is_seed, created_at)
values ('10000000-0000-4000-8000-000000000002', '微醺落日海风 (Sunset Lo-Fi)', 'midnight-jazz', 76,
        array['Dm7','G7','Cmaj7','Am7','Dm7','G7','Cmaj7','Am7'],
        '落日键盘手 @Mona', '🎹', '深夜 Lo-Fi / Jazz Hop', '小红书: @mona_keys',
        'Lo-Fi 七和弦电钢琴已经铺好暖垫,低音和主唱位置都空着,戴耳机录一段15秒就能合体!',
        array['微醺LoFi','爵士和弦','急缺主唱','急缺贝斯'], 54, true, now() - interval '35 minutes')
on conflict (id) do nothing;

insert into public.slots (id, room_id, slot_type, volume, latency_offset_ms) values
  ('20000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000002', 'drums',  0.85, -80),
  ('20000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000002', 'bass',   0.80, -80),
  ('20000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000002', 'chords', 0.90, -80),
  ('20000000-0000-4000-8000-000000000024', '10000000-0000-4000-8000-000000000002', 'melody', 0.75, -80)
on conflict (id) do nothing;

insert into public.takes (id, slot_id, musician_name, musician_avatar, is_ai, audio_path, latency_offset_ms, created_at) values
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000021',
   'BeatsMaker', '🥁', false, null, -80, now() - interval '40 minutes'),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000023',
   '落日键盘手 @Mona', '🎹', false, null, -80, now() - interval '35 minutes')
on conflict (id) do nothing;

-- 房间 3:公路民谣旅行者 (indie-folk, 82 BPM, 1小时前,四席全满)
insert into public.rooms (id, title, template_id, bpm, progression, creator_name, creator_avatar,
                          genre, contact_info, recruitment_call, tags, likes_count, is_seed, created_at)
values ('10000000-0000-4000-8000-000000000003', '公路民谣旅行者 (Highway Folk 8Bars)', 'indie-folk', 82,
        array['G','D','Em','C','G','D','Em','C'],
        '民谣小林', '🌾', '公路民谣 / Acoustic Folk', '微信: folkguitar_lin',
        '全员 4 轨已全满!完整乐队出炉!来听听我们的 8 小节,或者点击任意席位 Fork 录制你的版本!',
        array['4人全满','精选乐队','可Fork','原声民谣'], 92, true, now() - interval '1 hour')
on conflict (id) do nothing;

insert into public.slots (id, room_id, slot_type, volume, latency_offset_ms) values
  ('20000000-0000-4000-8000-000000000031', '10000000-0000-4000-8000-000000000003', 'drums',  0.85, -80),
  ('20000000-0000-4000-8000-000000000032', '10000000-0000-4000-8000-000000000003', 'bass',   0.85, -80),
  ('20000000-0000-4000-8000-000000000033', '10000000-0000-4000-8000-000000000003', 'chords', 0.90, -80),
  ('20000000-0000-4000-8000-000000000034', '10000000-0000-4000-8000-000000000003', 'melody', 0.90, -80)
on conflict (id) do nothing;

insert into public.takes (id, slot_id, musician_name, musician_avatar, is_ai, audio_path, latency_offset_ms, created_at) values
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000031',
   '木箱大飞', '🪵', false, null, -80, now() - interval '1 hour'),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000032',
   '老陈', '🎸', false, null, -80, now() - interval '1 hour'),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000033',
   '民谣小林', '🌾', false, null, -80, now() - interval '1 hour'),
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000034',
   '流浪阿南', '🎙️', false, null, -80, now() - interval '50 minutes')
on conflict (id) do nothing;

-- 房间 4:放克律动列车 (retro-funk, 104 BPM, 2小时前,只有贝斯真人)
insert into public.rooms (id, title, template_id, bpm, progression, creator_name, creator_avatar,
                          genre, contact_info, recruitment_call, tags, likes_count, is_seed, created_at)
values ('10000000-0000-4000-8000-000000000004', '放克律动列车 (Neon Funk Groove)', 'retro-funk', 104,
        array['Em9','A7','Em9','A7','Cmaj7','Bm7','Am7','B7'],
        'SlapKing @放克大叔', '🕺', '复古放克 / Retro Funk', 'Discord: @funk_uncle',
        '104 BPM 跳跃切分!需要一位鼓手打出扎实十六分音符,再来把电吉他挂切音效果!',
        array['急缺鼓手','急缺吉他','切分律动','放克'], 27, true, now() - interval '2 hours')
on conflict (id) do nothing;

insert into public.slots (id, room_id, slot_type, volume, latency_offset_ms) values
  ('20000000-0000-4000-8000-000000000041', '10000000-0000-4000-8000-000000000004', 'drums',  0.85, -80),
  ('20000000-0000-4000-8000-000000000042', '10000000-0000-4000-8000-000000000004', 'bass',   0.95, -80),
  ('20000000-0000-4000-8000-000000000043', '10000000-0000-4000-8000-000000000004', 'chords', 0.80, -80),
  ('20000000-0000-4000-8000-000000000044', '10000000-0000-4000-8000-000000000004', 'melody', 0.75, -80)
on conflict (id) do nothing;

insert into public.takes (id, slot_id, musician_name, musician_avatar, is_ai, audio_path, latency_offset_ms, created_at) values
  ('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000042',
   'SlapKing @放克大叔', '🕺', false, null, -80, now() - interval '2 hours')
on conflict (id) do nothing;
