"use client";

// /room/[id] 房间页客户端容器:加载云端房间 + 远端音频 → 渲染录音棚工作区
// 伴奏音频回退:真人 Take → 模板伴奏切片 → 程序伴奏;主旋律默认留空
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RoomState, RoomTemplate, SlotInfo, SlotType, SlotTake } from '../types/music';
import { createDefaultSlots } from '../data/templates';
import { getTemplateAsset } from '../data/templateAssets';
import { listTemplates } from '../lib/api/templates';
import { audioEngine } from '../services/audioEngine';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n/useI18n';
import { useTransport } from '../hooks/useAudioEngine';
import { getRoomBundle, groupTakes, saveTake, activateTakeIfEmpty, setActiveTake, updateRoomRecruitment, createRoom } from '../lib/api/rooms';
import { getSupabaseBrowser } from '../lib/supabase/client';
import { StageHero } from '../components/StageHero';
import { roomToRoomState, publicAudioUrl, slotAvatar } from '../lib/api/mappers';
import { downloadRoomWav } from '../lib/exportWav';
import { RoomHeader } from '../components/RoomHeader';
import { StudioRecordingModal } from '../components/StudioRecordingModal';
import { BandShareCardModal } from '../components/BandShareCardModal';
import { PublishRoomModal } from '../components/PublishRoomModal';
import { AnimatePresence } from 'motion/react';

interface RoomViewProps {
  roomId: string;
}

export const RoomView: React.FC<RoomViewProps> = ({ roomId }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { lang, setLang, t } = useI18n();
  const router = useRouter();

  const [room, setRoom] = useState<RoomState | null>(null);
  const [template, setTemplate] = useState<RoomTemplate | null>(null);
  const [templates, setTemplates] = useState<RoomTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadFailed, setLoadFailed] = useState<boolean>(false);

  const [activeRecordingSlot, setActiveRecordingSlot] = useState<SlotInfo | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [isExportingWav, setIsExportingWav] = useState<boolean>(false);
  const [roomNotice, setRoomNotice] = useState<string | null>(null);
  const roomRef = useRef<RoomState | null>(null);

  const transportState = useTransport();

  // 进入房间:先渲染 UI(数据到达即完成加载),音频引擎接管放后台执行。
  // 注意:绝不能 await 引擎初始化再渲染——无用户手势时 Tone.start()
  // 会一直挂起(浏览器自动播放策略),会把整个页面锁死在加载态。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 并行:房间数据 + 模板列表(模板来自 Supabase templates 表)
        const [bundle, tmplList] = await Promise.all([
          getRoomBundle(roomId),
          listTemplates().catch(() => [] as RoomTemplate[]),
        ]);
        if (cancelled) return;
        if (!bundle) {
          setLoadFailed(true);
          return;
        }
        const tmpl =
          tmplList.find((t) => t.id === bundle.room.template_id) || null;
        if (!tmpl) {
          setLoadFailed(true);
          return;
        }
        const state = roomToRoomState(bundle.room, bundle.slots, groupTakes(bundle.takes));

        setRoom(state);
        setTemplate(tmpl);
        setTemplates(tmplList);
        setLoading(false);

        // 后台:引擎接管 → 并行加载音频(真人 take 优先,模板预置切片兜底)
        audioEngine
          .setTemplateAndSlots(tmpl, state.slots, bundle.room.bpm)
          .then(async () => {
            // 一级:真人 take
            await Promise.all(
              state.slots
                .filter((s) => s.occupancy === 'human' && s.activeTakeId && s.takes.find((take) => take.id === s.activeTakeId)?.audioBlobUrl)
                .map((s) =>
                  audioEngine
                    .setSlotAudioFromUrl(s.type, s.takes.find((take) => take.id === s.activeTakeId)!.audioBlobUrl!)
                    .catch((e) => console.warn('席位音频加载失败', s.type, e))
                )
            );
            // 二级:模板预置伴奏切片(主旋律不自动预填)
            await Promise.all(
              state.slots
                .filter((s) => s.type !== 'melody' && s.audioSource !== 'human' && getTemplateAsset(bundle.room.template_id, s.type))
                .map(async (s) => {
                  const assetUrl = getTemplateAsset(bundle.room.template_id, s.type)!;
                  try {
                    await audioEngine.setSlotAudioFromUrl(s.type, assetUrl);
                    setRoom((prev) => {
                      if (!prev) return prev;
                      const updatedSlots = prev.slots.map((x) =>
                        x.type === s.type
                          ? { ...x, isCustomTake: true, occupancy: 'system' as const, audioSource: 'template' as const }
                          : x
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

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    if (!roomNotice) return;
    const timer = setTimeout(() => setRoomNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [roomNotice]);

  // 同房间的新增 Take 和当前版本切换实时同步到舞台。
  useEffect(() => {
    if (loading || !room) return;
    const supabase = getSupabaseBrowser();
    const slotIds = new Set(room.slots.map((slot) => slot.id));
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let refreshInFlight = false;
    let refreshQueued = false;

    const refreshRoom = async () => {
      try {
        const bundle = await getRoomBundle(roomId);
        if (!bundle) return;
        const nextRoom = roomToRoomState(bundle.room, bundle.slots, groupTakes(bundle.takes));
        const previousRoom = roomRef.current;
        const changedSlots = nextRoom.slots.filter((slot) =>
          previousRoom?.slots.find((previous) => previous.id === slot.id)?.activeTakeId !== slot.activeTakeId
        );

        const loadedSlots: SlotInfo[] = [];
        for (const slot of changedSlots) {
          const activeTake = slot.takes.find((take) => take.id === slot.activeTakeId);
          const templateAudio = slot.type !== 'melody'
            ? getTemplateAsset(nextRoom.templateId, slot.type)
            : undefined;
          try {
            if (activeTake?.audioBlobUrl) {
              await audioEngine.setSlotAudioFromUrl(slot.type, activeTake.audioBlobUrl);
            } else if (activeTake?.audioBlob) {
              await audioEngine.setSlotAudio(slot.type, activeTake.audioBlob, activeTake.latencyOffsetMs);
            } else if (activeTake) {
              throw new Error('当前 Take 没有可播放的音频地址');
            } else if (templateAudio) {
              await audioEngine.setSlotAudioFromUrl(slot.type, templateAudio);
            } else {
              audioEngine.removeSlotAudio(slot.type);
            }
            loadedSlots.push(slot);
          } catch (e) {
            console.warn('协作音频更新失败', slot.type, e);
            for (const loadedSlot of loadedSlots) {
              const previousSlot = previousRoom?.slots.find((previous) => previous.id === loadedSlot.id);
              const previousTake = previousSlot?.takes.find((take) => take.id === previousSlot.activeTakeId);
              const previousTemplateAudio = previousSlot && previousSlot.type !== 'melody'
                ? getTemplateAsset(previousRoom?.templateId ?? '', previousSlot.type)
                : undefined;
              try {
                if (previousTake?.audioBlobUrl) {
                  await audioEngine.setSlotAudioFromUrl(loadedSlot.type, previousTake.audioBlobUrl);
                } else if (previousTake?.audioBlob) {
                  await audioEngine.setSlotAudio(loadedSlot.type, previousTake.audioBlob, previousTake.latencyOffsetMs);
                } else if (previousTemplateAudio) {
                  await audioEngine.setSlotAudioFromUrl(loadedSlot.type, previousTemplateAudio);
                } else {
                  audioEngine.removeSlotAudio(loadedSlot.type);
                }
              } catch (rollbackError) {
                console.warn('恢复协作切换前的音频失败', loadedSlot.type, rollbackError);
              }
            }
            setRoomNotice(t('room.remoteTakeLoadFailed'));
            return;
          }
        }

        roomRef.current = nextRoom;
        setRoom(nextRoom);
        audioEngine.updateSlots(nextRoom.slots);
      } catch (e) {
        console.warn('同步房间录音失败', e);
      }
    };

    const refresh = async () => {
      if (refreshInFlight) {
        refreshQueued = true;
        return;
      }
      refreshInFlight = true;
      try {
        do {
          refreshQueued = false;
          await refreshRoom();
        } while (refreshQueued);
      } finally {
        refreshInFlight = false;
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void refresh(), 120);
    };

    let channel = supabase.channel(`room-${roomId}-takes`);
    for (const slotId of slotIds) {
      channel = channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'takes',
        filter: `slot_id=eq.${slotId}`,
      }, scheduleRefresh);
    }
    channel = channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'slots',
      filter: `room_id=eq.${roomId}`,
    }, scheduleRefresh);
    channel.subscribe();
    void refresh();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [roomId, loading, t]);

  // ---- 播放/席位/混音控制(访客会话内状态,不写库) ----

  const handleTogglePlay = useCallback(async () => {
    setRoomNotice(null);
    try {
      await audioEngine.togglePlay();
    } catch (e) {
      console.warn('播放失败(可能浏览器阻止了音频自动播放)', e);
      setRoomNotice(t('room.playFailed'));
    }
  }, [t]);

  const handleClaimSlot = useCallback((slot: SlotInfo) => {
    audioEngine.stop();
    setActiveRecordingSlot(slot);
  }, []);

  // 保存录音:先上云端(takes 桶 + takes 行),再本地乐观更新
  const handleSaveRecording = useCallback(
    async (slotType: SlotType, blob: Blob, latencyOffsetMs: number, musicianName: string) => {
      const targetSlot = room?.slots.find((s) => s.type === slotType);
      if (!room || !targetSlot) throw new Error('房间尚未加载完成，请重试。');
      const previousHumanCount = room.slots.filter((slot) => slot.occupancy === 'human').length;
      const targetWasHuman = targetSlot.occupancy === 'human';

      const saved = await saveTake({
        roomId: room.id,
        slotId: targetSlot.id,
        blob,
        latencyOffsetMs,
        musicianName,
        musicianAvatar: slotAvatar(slotType),
      });
      const newTake: SlotTake = {
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

      const latestTargetSlot = roomRef.current?.slots.find((slot) => slot.id === targetSlot.id) ?? targetSlot;
      let activeTakeId = latestTargetSlot.activeTakeId ?? targetSlot.activeTakeId ?? null;
      if (!activeTakeId && newTake.audioBlobUrl) {
        try {
          activeTakeId = await activateTakeIfEmpty(targetSlot.id, newTake.id);
        } catch (e) {
          console.warn('设置当前录音失败,保留本地候选', e);
        }
      }
      const isNewTakeActive = activeTakeId === newTake.id;
      let activeAudioLoaded = true;
      const selectedTake = isNewTakeActive
        ? newTake
        : latestTargetSlot.takes.find((take) => take.id === activeTakeId);
      const templateAudio = !selectedTake && slotType !== 'melody'
        ? getTemplateAsset(room.templateId, slotType)
        : undefined;
      try {
        if (selectedTake?.audioBlobUrl) {
          await audioEngine.setSlotAudioFromUrl(slotType, selectedTake.audioBlobUrl);
        } else if (selectedTake?.audioBlob) {
          await audioEngine.setSlotAudio(slotType, selectedTake.audioBlob, selectedTake.latencyOffsetMs);
        } else if (templateAudio) {
          await audioEngine.setSlotAudioFromUrl(slotType, templateAudio);
        } else {
          audioEngine.removeSlotAudio(slotType);
        }
      } catch (e) {
        activeAudioLoaded = false;
        audioEngine.removeSlotAudio(slotType);
        console.warn('当前播放音轨加载失败', e);
      }

      const completedLineup = isNewTakeActive && !targetWasHuman && previousHumanCount === 3;

      setRoom((prev) => {
        if (!prev) return prev;
        const updatedSlots = prev.slots.map((s) => {
          if (s.type === slotType) {
            const nextTakes = [newTake, ...s.takes.filter((tk) => tk.id !== newTake.id)];
            const activeTake = activeTakeId ? nextTakes.find((take) => take.id === activeTakeId) : undefined;
            return {
              ...s,
              occupancy: activeTake ? 'human' as const : s.occupancy,
              audioSource: activeTake ? 'human' as const : s.audioSource,
              isCustomTake: !!activeTake || s.isCustomTake,
              isMuted: activeTake ? false : s.isMuted,
              latencyOffsetMs: activeTake ? activeTake.latencyOffsetMs : s.latencyOffsetMs,
              musician: activeTake?.musician ?? s.musician,
              takes: nextTakes,
              activeTakeId,
              activeTakeIndex: activeTake ? nextTakes.findIndex((take) => take.id === activeTake.id) : s.activeTakeIndex,
            };
          }
          return s;
        });
        audioEngine.updateSlots(updatedSlots);
        return { ...prev, slots: updatedSlots };
      });

      if (!activeAudioLoaded) {
        setRoomNotice(t('room.takeSavedAudioLoadFailed'));
      } else if (completedLineup) {
        setRoomNotice('四个席位都已有人参与，乐队阵容已齐');
      } else if (!isNewTakeActive && newTake.audioBlobUrl) {
        setRoomNotice('录音已保存为候选版本，当前播放版本保持不变');
      } else if (isNewTakeActive) {
        setRoomNotice('录音已保存并设为当前播放版本');
      }
    },
    [room, t]
  );

  const handleSetActiveTake = useCallback(async (slot: SlotInfo, take: SlotTake) => {
    setRoomNotice(null);
    let didLoadSelectionAudio = false;
    try {
      if (take.audioBlobUrl) {
        await audioEngine.setSlotAudioFromUrl(slot.type, take.audioBlobUrl);
      } else if (take.audioBlob) {
        await audioEngine.setSlotAudio(slot.type, take.audioBlob, take.latencyOffsetMs);
      } else {
        throw new Error('该录音没有可播放的音频');
      }
      didLoadSelectionAudio = true;
      await setActiveTake(slot.id, take.id);
      setRoom((prev) => {
        if (!prev) return prev;
        const slots = prev.slots.map((current) => current.id === slot.id
          ? {
              ...current,
              activeTakeId: take.id,
              activeTakeIndex: current.takes.findIndex((candidate) => candidate.id === take.id),
              occupancy: 'human' as const,
              audioSource: 'human' as const,
              isCustomTake: true,
              isMuted: false,
              latencyOffsetMs: take.latencyOffsetMs,
              musician: take.musician,
            }
          : current);
        audioEngine.updateSlots(slots);
        return { ...prev, slots };
      });
      setRoomNotice('已切换当前播放版本');
    } catch (e) {
      console.warn('切换播放版本失败', e);
      if (didLoadSelectionAudio) {
        const currentSlot = roomRef.current?.slots.find((candidate) => candidate.id === slot.id) ?? slot;
        const previousTake = currentSlot.takes.find((candidate) => candidate.id === currentSlot.activeTakeId);
        const templateAudio = currentSlot.type !== 'melody'
          ? getTemplateAsset(roomRef.current?.templateId ?? '', currentSlot.type)
          : undefined;
        try {
          if (previousTake?.audioBlobUrl) {
            await audioEngine.setSlotAudioFromUrl(currentSlot.type, previousTake.audioBlobUrl);
          } else if (previousTake?.audioBlob) {
            await audioEngine.setSlotAudio(currentSlot.type, previousTake.audioBlob, previousTake.latencyOffsetMs);
          } else if (templateAudio) {
            await audioEngine.setSlotAudioFromUrl(currentSlot.type, templateAudio);
          } else {
            audioEngine.removeSlotAudio(currentSlot.type);
          }
        } catch (rollbackError) {
          console.warn('恢复原播放版本失败', rollbackError);
        }
      }
      setRoomNotice(t('room.takeSwitchFailed'));
    }
  }, [t]);

  // 发布:房间行已存在,只更新招募信息
  const handlePublishRoom = useCallback(
    async (newRoom: { contactInfo: string; recruitmentCall: string; tags: string[]; genre?: string }) => {
      if (!room) throw new Error('房间尚未加载完成');
      await updateRoomRecruitment(room.id, newRoom);
      setRoomNotice('已发布到乐队广场');
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
          slots: createDefaultSlots(),
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
    setRoomNotice(null);
    try {
      setIsExportingWav(true);
      await downloadRoomWav(room.title);
    } catch (e) {
      console.error('导出失败', e);
      setRoomNotice(t('room.exportFailed'));
    } finally {
      setIsExportingWav(false);
    }
  }, [room, t]);

  // ---- 渲染 ----

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white dark:bg-zinc-950 text-zinc-500 font-mono">
        <div className="w-10 h-10 rounded-2xl border-2 border-[#ff5522]/30 border-t-[#ff5522] animate-spin" />
        <span className="text-xs">正在装载 8 小节乐队…</span>
      </div>
    );
  }

  if (loadFailed || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 font-mono">
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

  if (!template) return null;

  return (
    <div className={`min-h-screen flex flex-col justify-between selection:bg-[#ff5522]/20 transition-colors duration-200 ${isDark ? 'bg-[#120f12]' : 'bg-[#f7f3ef]'}`}>
      <div>
        {roomNotice && (
          <div role="status" className="fixed left-1/2 top-20 z-[70] -translate-x-1/2 rounded-full border border-white/10 bg-[#21191f]/95 px-4 py-2 text-center text-xs font-medium text-white shadow-xl">
            {roomNotice}
          </div>
        )}
        {/* 房间页 = 全屏舞台,header 悬浮 */}
        <div className="absolute top-0 inset-x-0 z-50">
          <RoomHeader
            isDark={isDark}
            lang={lang}
            onSetLang={setLang}
            t={t}
            variant="stage"
            onToggleTheme={toggleTheme}
            onBackToPlaza={() => router.push('/')}
          />
        </div>

        <main className="w-full">
          <StageHero
            room={room}
            template={template}
            templates={templates}
            transportState={transportState}
            isDark={isDark}
            t={t}
            onTogglePlay={handleTogglePlay}
            onSelectSlot={handleClaimSlot}
            onSetActiveTake={handleSetActiveTake}
            onSwitchTemplate={handleSwitchTemplate}
            onExportWav={handleExportWav}
            onOpenShareModal={() => setIsShareModalOpen(true)}
            onOpenPublishModal={() => setIsPublishModalOpen(true)}
            isExporting={isExportingWav}
          />
        </main>
      </div>

      {/* Recording Studio Modal */}
      <AnimatePresence>
        {activeRecordingSlot && (
          <StudioRecordingModal
            key={activeRecordingSlot.id}
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
