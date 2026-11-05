"use client";

// /room/[id] 房间页客户端容器:加载云端房间 + 远端音频 → 渲染录音棚工作区
// 音频解析三级回退:真人 Take(有音频)→ 模板预置切片(阶段后续)→ AI 合成兜底
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RoomState, RoomTemplate, SlotInfo, SlotType, SlotTake, MusicianInfo } from '../types/music';
import { ROOM_TEMPLATES, createDefaultSlots } from '../data/templates';
import { getTemplateAsset } from '../data/templateAssets';
import { audioEngine } from '../services/audioEngine';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n/useI18n';
import { useTransport, useMeterLevels } from '../hooks/useAudioEngine';
import { getRoomBundle, groupTakes, saveTake, updateRoomRecruitment, createRoom } from '../lib/api/rooms';
import { roomToRoomState, publicAudioUrl, slotAvatar } from '../lib/api/mappers';
import { downloadRoomWav } from '../lib/exportWav';
import { RoomHeader } from '../components/RoomHeader';
import { StudioWorkspace } from './StudioWorkspace';
import { StudioRecordingModal } from '../components/StudioRecordingModal';
import { BandShareCardModal } from '../components/BandShareCardModal';
import { PublishRoomModal } from '../components/PublishRoomModal';
import { AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface RoomViewProps {
  roomId: string;
}

export const RoomView: React.FC<RoomViewProps> = ({ roomId }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { lang, setLang, t } = useI18n();
  const router = useRouter();

  const [room, setRoom] = useState<RoomState | null>(null);
  const [template, setTemplate] = useState<RoomTemplate>(ROOM_TEMPLATES[0]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadFailed, setLoadFailed] = useState<boolean>(false);

  const [activeRecordingSlot, setActiveRecordingSlot] = useState<SlotInfo | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [isExportingWav, setIsExportingWav] = useState<boolean>(false);

  const transportState = useTransport();
  const meterLevels = useMeterLevels(transportState.isPlaying);

  // 进入房间:先渲染 UI(数据到达即完成加载),音频引擎接管放后台执行。
  // 注意:绝不能 await 引擎初始化再渲染——无用户手势时 Tone.start()
  // 会一直挂起(浏览器自动播放策略),会把整个页面锁死在加载态。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bundle = await getRoomBundle(roomId);
        if (cancelled) return;
        if (!bundle) {
          setLoadFailed(true);
          return;
        }
        const tmpl = ROOM_TEMPLATES.find((t) => t.id === bundle.room.template_id) || ROOM_TEMPLATES[0];
        const state = roomToRoomState(bundle.room, bundle.slots, groupTakes(bundle.takes));

        setRoom(state);
        setTemplate(tmpl);
        setLoading(false);

        // 后台:引擎接管 → 并行加载音频(真人 take 优先,模板预置切片兜底)
        audioEngine
          .setTemplateAndSlots(tmpl, state.slots, bundle.room.bpm)
          .then(async () => {
            // 一级:真人 take
            await Promise.all(
              state.slots
                .filter((s) => s.isCustomTake && s.takes[0]?.audioBlobUrl)
                .map((s) =>
                  audioEngine
                    .setSlotAudioFromUrl(s.type, s.takes[0].audioBlobUrl!)
                    .catch((e) => console.warn('席位音频加载失败', s.type, e))
                )
            );
            // 二级:模板预置音频切片(无真人 take 时)
            await Promise.all(
              state.slots
                .filter((s) => !s.isCustomTake && getTemplateAsset(bundle.room.template_id, s.type))
                .map(async (s) => {
                  const assetUrl = getTemplateAsset(bundle.room.template_id, s.type)!;
                  try {
                    await audioEngine.setSlotAudioFromUrl(s.type, assetUrl);
                    setRoom((prev) => {
                      if (!prev) return prev;
                      const updatedSlots = prev.slots.map((x) =>
                        x.type === s.type ? { ...x, isCustomTake: true } : x
                      );
                      audioEngine.updateSlots(updatedSlots);
                      return { ...prev, slots: updatedSlots };
                    });
                  } catch (e) {
                    console.warn('模板音频加载失败,回退 AI 合成', s.type, e);
                  }
                })
            );
          })
          .catch((e) => console.warn('音频引擎加载失败', e));
      } catch (e) {
        console.warn('房间加载失败', e);
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // ---- 播放/席位/混音控制(访客会话内状态,不写库) ----

  const handleTogglePlay = useCallback(async () => {
    try {
      await audioEngine.togglePlay();
    } catch (e) {
      console.warn('播放失败(可能浏览器阻止了音频自动播放)', e);
    }
  }, []);

  const handleClaimSlot = useCallback((slot: SlotInfo) => {
    audioEngine.pause();
    setActiveRecordingSlot(slot);
  }, []);

  const handleToggleMute = useCallback((slotType: SlotType) => {
    setRoom((prev) => {
      if (!prev) return prev;
      const updatedSlots = prev.slots.map((s) =>
        s.type === slotType ? { ...s, isMuted: !s.isMuted } : s
      );
      audioEngine.updateSlots(updatedSlots);
      return { ...prev, slots: updatedSlots };
    });
  }, []);

  const handleToggleSolo = useCallback((slotType: SlotType) => {
    setRoom((prev) => {
      if (!prev) return prev;
      const targetSlot = prev.slots.find((s) => s.type === slotType);
      const isCurrentlySolo = !!targetSlot?.isSolo;
      const updatedSlots = prev.slots.map((s) =>
        s.type === slotType ? { ...s, isSolo: !isCurrentlySolo } : { ...s, isSolo: false }
      );
      audioEngine.updateSlots(updatedSlots);
      return { ...prev, slots: updatedSlots };
    });
  }, []);

  const handleVolumeChange = useCallback((slotType: SlotType, volume: number) => {
    setRoom((prev) => {
      if (!prev) return prev;
      const updatedSlots = prev.slots.map((s) => (s.type === slotType ? { ...s, volume } : s));
      audioEngine.updateSlots(updatedSlots);
      return { ...prev, slots: updatedSlots };
    });
  }, []);

  // 切换 Take:AI take 清空音频;真人 take 有 URL 则从远端加载
  const handleSelectTake = useCallback(
    async (slotType: SlotType, takeIndex: number) => {
      const targetSlot = room?.slots.find((s) => s.type === slotType);
      const chosenTake = targetSlot?.takes[takeIndex];
      if (!targetSlot || !chosenTake) return;

      if (chosenTake.isAI) {
        audioEngine.removeSlotAudio(slotType);
      } else if (chosenTake.audioBlobUrl) {
        try {
          await audioEngine.setSlotAudioFromUrl(slotType, chosenTake.audioBlobUrl);
        } catch (e) {
          console.warn('Take 音频加载失败', e);
        }
      }

      setRoom((prev) => {
        if (!prev) return prev;
        const updatedSlots = prev.slots.map((s) => {
          if (s.type === slotType) {
            return {
              ...s,
              musician: chosenTake.musician,
              isCustomTake: !chosenTake.isAI && !!chosenTake.audioBlobUrl,
              latencyOffsetMs: chosenTake.latencyOffsetMs,
              activeTakeIndex: takeIndex,
            };
          }
          return s;
        });
        audioEngine.updateSlots(updatedSlots);
        return { ...prev, slots: updatedSlots };
      });
    },
    [room]
  );

  // 保存录音:先上云端(takes 桶 + takes 行),再本地乐观更新
  const handleSaveRecording = useCallback(
    async (slotType: SlotType, blob: Blob, latencyOffsetMs: number, musicianName: string) => {
      const targetSlot = room?.slots.find((s) => s.type === slotType);
      if (!room || !targetSlot) return;

      await audioEngine.setSlotAudio(slotType, blob, latencyOffsetMs);

      let newTake: SlotTake;
      try {
        const saved = await saveTake({
          roomId: room.id,
          slotId: targetSlot.id,
          blob,
          latencyOffsetMs,
          musicianName,
          musicianAvatar: slotAvatar(slotType),
        });
        newTake = {
          id: saved.id,
          title: `Take · @${saved.musician_name}`,
          musician: {
            name: saved.musician_name,
            avatar: saved.musician_avatar,
            isAI: false,
            instrumentTitle: '云端实录 (8小节已对齐)',
            recordedAt: '刚刚录制',
          },
          audioBlobUrl: saved.audio_path ? publicAudioUrl(saved.audio_path) : undefined,
          latencyOffsetMs: saved.latency_offset_ms,
          isAI: false,
          createdAt: '刚刚录制',
        };
      } catch (e) {
        console.warn('录音上传失败,仅保留本地', e);
        const localMusician: MusicianInfo = {
          name: musicianName,
          avatar: slotAvatar(slotType),
          isAI: false,
          instrumentTitle: '现场麦克风录制 (8小节已对齐)',
          recordedAt: '刚刚录制',
        };
        newTake = {
          id: `take-${Date.now()}`,
          title: `Take ${targetSlot.takes.length + 1} · @${musicianName}`,
          musician: localMusician,
          audioBlob: blob,
          latencyOffsetMs,
          isAI: false,
          createdAt: '刚刚录制',
        };
      }

      setRoom((prev) => {
        if (!prev) return prev;
        const updatedSlots = prev.slots.map((s) => {
          if (s.type === slotType) {
            return {
              ...s,
              isCustomTake: true,
              isMuted: false,
              latencyOffsetMs,
              musician: newTake.musician,
              takes: [newTake, ...s.takes.filter((tk) => tk.id !== newTake.id)],
              activeTakeIndex: 0,
            };
          }
          return s;
        });
        audioEngine.updateSlots(updatedSlots);

        // 4 席全真人 → 撒花(北极星指标:合奏拼图完成)
        const humanTakes = updatedSlots.filter((st) => st.isCustomTake).length;
        if (humanTakes === 4) {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }
        return { ...prev, slots: updatedSlots };
      });
    },
    [room]
  );

  // 发布:房间行已存在,只更新招募信息
  const handlePublishRoom = useCallback(
    async (newRoom: { contactInfo: string; recruitmentCall: string; tags: string[]; genre?: string }) => {
      if (!room) return;
      try {
        await updateRoomRecruitment(room.id, newRoom);
      } catch (e) {
        console.warn('发布失败', e);
      }
    },
    [room]
  );

  // 切换模板:新建一个该模板的房间并跳转
  const handleSwitchTemplate = useCallback(
    async (tmpl: RoomTemplate) => {
      try {
        const { id } = await createRoom({
          title: tmpl.title.split(' ')[0] + ' 8小节',
          templateId: tmpl.id,
          bpm: tmpl.bpm,
          progression: tmpl.progression,
          creatorName: '乐手',
          slots: createDefaultSlots(tmpl),
        });
        router.replace(`/room/${id}`);
      } catch (e) {
        console.warn('创建房间失败', e);
      }
    },
    [router]
  );

  const handleExportWav = useCallback(async () => {
    if (!room) return;
    try {
      setIsExportingWav(true);
      await downloadRoomWav(room.title);
    } catch (e) {
      console.error('导出失败', e);
    } finally {
      setIsExportingWav(false);
    }
  }, [room]);

  // ---- 渲染 ----

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-mono">
        <div className="w-10 h-10 rounded-2xl border-2 border-[#ff5522]/30 border-t-[#ff5522] animate-spin" />
        <span className="text-xs">正在装载 8 小节乐队…</span>
      </div>
    );
  }

  if (loadFailed || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 font-mono">
        <span className="text-4xl">🎚️</span>
        <p className="text-sm">房间不存在或已被删除</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-xl bg-[#ff5522] text-white text-xs font-bold hover:bg-[#ff4410] transition-colors"
        >
          返回乐队广场
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between selection:bg-[#ff5522]/20 selection:text-zinc-900 dark:selection:text-white transition-colors duration-200">
      <div className="flex flex-col gap-6">
        <RoomHeader
          room={room}
          template={template}
          transportState={transportState}
          isDark={isDark}
          lang={lang}
          onSetLang={setLang}
          t={t}
          activeTab="studio"
          onSelectTab={(tab) => {
            if (tab === 'plaza') router.push('/');
          }}
          openRoomsCount={0}
          onToggleTheme={toggleTheme}
          onTogglePlay={handleTogglePlay}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onOpenCreateModal={() => router.push('/')}
          onExportWav={handleExportWav}
          isExporting={isExportingWav}
        />

        <main className="px-4 sm:px-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
          <StudioWorkspace
            room={room}
            template={template}
            transportState={transportState}
            meterLevels={meterLevels}
            t={t}
            onClaimSlot={handleClaimSlot}
            onToggleMute={handleToggleMute}
            onToggleSolo={handleToggleSolo}
            onVolumeChange={handleVolumeChange}
            onSelectTake={handleSelectTake}
            onSwitchTemplate={handleSwitchTemplate}
          />
        </main>
      </div>

      {/* Recording Studio Modal */}
      <AnimatePresence>
        {activeRecordingSlot && (
          <StudioRecordingModal
            isOpen={!!activeRecordingSlot}
            onClose={() => setActiveRecordingSlot(null)}
            targetSlot={activeRecordingSlot}
            allSlots={room.slots}
            template={template}
            onSaveRecording={handleSaveRecording}
            t={t}
          />
        )}
      </AnimatePresence>

      {/* Band Share Card Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <BandShareCardModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            room={room}
            template={template}
            t={t}
          />
        )}
      </AnimatePresence>

      {/* Publish to Community Plaza Modal */}
      <AnimatePresence>
        {isPublishModalOpen && (
          <PublishRoomModal
            isOpen={isPublishModalOpen}
            onClose={() => setIsPublishModalOpen(false)}
            room={room}
            template={template}
            onPublish={handlePublishRoom}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
