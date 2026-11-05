"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoomState, RoomTemplate, SlotInfo, SlotType, SlotTake, MusicianInfo } from '../types/music';
import { CommunityRoom } from '../types/community';
import { ROOM_TEMPLATES, createDefaultSlots } from '../data/templates';
import { audioEngine } from '../services/audioEngine';
import { listPublishedRooms, createRoom, updateRoomRecruitment } from '../lib/api/rooms';
import { downloadRoomWav } from '../lib/exportWav';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n/useI18n';
import { useTransport, useMeterLevels } from '../hooks/useAudioEngine';
import { RoomHeader } from '../components/RoomHeader';
import { StudioWorkspace } from './StudioWorkspace';
import { StudioRecordingModal } from '../components/StudioRecordingModal';
import { BandShareCardModal } from '../components/BandShareCardModal';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { BandPlazaView } from '../components/BandPlazaView';
import { PublishRoomModal } from '../components/PublishRoomModal';
import { AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

const STORAGE_KEY = '8bars_current_room_v2';

// Deterministic default room: fixed createdAt so SSR and the first client render match.
// Real timestamps only appear on client-created rooms. (LocalStorage 方案将在接入 Supabase 后移除)
const DEFAULT_ROOM: RoomState = {
  id: 'room-friday-pop-01',
  title: '周五夜流行 (Pop in C)',
  templateId: ROOM_TEMPLATES[0].id,
  bpm: ROOM_TEMPLATES[0].bpm,
  createdAt: '2026-01-01T00:00:00.000Z',
  creatorName: '阿杰 (吉他手)',
  slots: createDefaultSlots(ROOM_TEMPLATES[0]),
  progression: ROOM_TEMPLATES[0].progression,
};

export default function App() {
  const { theme, toggleTheme, isDark } = useTheme();
  const { lang, setLang, t } = useI18n();
  const router = useRouter();

  // Navigation tab: 'studio' (合奏录音棚) vs 'plaza' (乐队广场)
  const [activeMainTab, setActiveMainTab] = useState<'studio' | 'plaza'>('studio');

  // Community rooms state(来自 Supabase,首次加载显示骨架屏)
  const [communityRooms, setCommunityRooms] = useState<CommunityRoom[]>([]);
  const [plazaLoading, setPlazaLoading] = useState<boolean>(true);

  // Current active template
  const [template, setTemplate] = useState<RoomTemplate>(ROOM_TEMPLATES[0]);

  // Current room state
  const [room, setRoom] = useState<RoomState>(DEFAULT_ROOM);

  // Hydrate room & community rooms from localStorage on the client only —
  // reading storage during render would cause SSR hydration mismatch.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setRoom({
          ...parsed,
          slots: parsed.slots.map((s: SlotInfo) => ({
            ...s,
            audioBlob: undefined,
            audioBlobUrl: undefined,
            takes: s.takes || [],
            activeTakeIndex: s.activeTakeIndex || 0,
          })),
        });
      }
    } catch (e) {
      console.warn('Could not read from local storage', e);
    }
  }, []);

  // Transport 状态与 VU 表头:共用音频引擎桥接 hooks(与 RoomView 一致)
  const transportState = useTransport();
  const meterLevels = useMeterLevels(transportState.isPlaying);

  // Modals state
  const [activeRecordingSlot, setActiveRecordingSlot] = useState<SlotInfo | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [isExportingWav, setIsExportingWav] = useState<boolean>(false);

  // Synchronize audio engine when template or room changes
  useEffect(() => {
    const curTemplate = ROOM_TEMPLATES.find((t) => t.id === room.templateId) || ROOM_TEMPLATES[0];
    setTemplate(curTemplate);
    // 音频引擎初始化/重排失败绝不能打断 UI,只告警
    audioEngine.setTemplateAndSlots(curTemplate, room.slots).catch((e) =>
      console.warn('音频引擎加载模板失败', e)
    );
  }, [room.templateId]);

  // Save room state to localStorage
  useEffect(() => {
    try {
      const serializableRoom = {
        ...room,
        slots: room.slots.map((s) => ({
          ...s,
          audioBlob: undefined,
          audioBlobUrl: undefined,
          takes: s.takes.map((t) => ({ ...t, audioBlob: undefined, audioBlobUrl: undefined })),
        })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableRoom));
    } catch (e) {
      console.warn('Failed to save room', e);
    }
  }, [room]);

  // 乐队广场:从 Supabase 拉取真实数据(房间+席位+take)
  useEffect(() => {
    listPublishedRooms()
      .then((list) => setCommunityRooms(list))
      .catch((e) => console.warn('广场加载失败', e))
      .finally(() => setPlazaLoading(false));
  }, []);

  // Handlers
  const handleTogglePlay = async () => {
    try {
      await audioEngine.togglePlay();
    } catch (e) {
      console.warn('播放失败(可能浏览器阻止了音频自动播放)', e);
    }
  };

  const handleClaimSlot = (slot: SlotInfo) => {
    audioEngine.pause();
    setActiveRecordingSlot(slot);
  };

  const handleToggleMute = (slotType: SlotType) => {
    setRoom((prev) => {
      const updatedSlots = prev.slots.map((s) =>
        s.type === slotType ? { ...s, isMuted: !s.isMuted } : s
      );
      audioEngine.updateSlots(updatedSlots);
      return { ...prev, slots: updatedSlots };
    });
  };

  const handleToggleSolo = (slotType: SlotType) => {
    setRoom((prev) => {
      const targetSlot = prev.slots.find((s) => s.type === slotType);
      const isCurrentlySolo = !!targetSlot?.isSolo;
      const updatedSlots = prev.slots.map((s) =>
        s.type === slotType
          ? { ...s, isSolo: !isCurrentlySolo }
          : { ...s, isSolo: false }
      );
      audioEngine.updateSlots(updatedSlots);
      return { ...prev, slots: updatedSlots };
    });
  };

  const handleVolumeChange = (slotType: SlotType, volume: number) => {
    setRoom((prev) => {
      const updatedSlots = prev.slots.map((s) =>
        s.type === slotType ? { ...s, volume } : s
      );
      audioEngine.updateSlots(updatedSlots);
      return { ...prev, slots: updatedSlots };
    });
  };

  // Switch between takes for a slot (Multi-Take / Fork)
  const handleSelectTake = async (slotType: SlotType, takeIndex: number) => {
    const targetSlot = room.slots.find((s) => s.type === slotType);
    if (!targetSlot || !targetSlot.takes[takeIndex]) return;

    const chosenTake = targetSlot.takes[takeIndex];

    if (chosenTake.isAI) {
      audioEngine.removeSlotAudio(slotType);
    } else if (chosenTake.audioBlob) {
      await audioEngine.setSlotAudio(slotType, chosenTake.audioBlob, chosenTake.latencyOffsetMs);
    }

    setRoom((prev) => {
      const updatedSlots = prev.slots.map((s) => {
        if (s.type === slotType) {
          return {
            ...s,
            musician: chosenTake.musician,
            isCustomTake: !chosenTake.isAI,
            latencyOffsetMs: chosenTake.latencyOffsetMs,
            activeTakeIndex: takeIndex,
          };
        }
        return s;
      });
      audioEngine.updateSlots(updatedSlots);
      return { ...prev, slots: updatedSlots };
    });
  };

  const handleSaveRecording = async (
    slotType: SlotType,
    blob: Blob,
    latencyOffsetMs: number,
    musicianName: string
  ) => {
    await audioEngine.setSlotAudio(slotType, blob, latencyOffsetMs);

    const newMusician: MusicianInfo = {
      name: musicianName,
      avatar: slotType === 'drums' ? '🥁' : slotType === 'bass' ? '🎸' : slotType === 'chords' ? '🎹' : '🎙️',
      isAI: false,
      instrumentTitle: '现场麦克风录制 (8小节已对齐)',
      recordedAt: '刚刚录制',
    };

    setRoom((prev) => {
      const updatedSlots = prev.slots.map((s) => {
        if (s.type === slotType) {
          const newTake: SlotTake = {
            id: `take-${Date.now()}`,
            title: `Take ${s.takes.length + 1} · @${musicianName}`,
            musician: newMusician,
            audioBlob: blob,
            latencyOffsetMs,
            isAI: false,
            createdAt: '刚刚录制',
          };

          const newTakes = [newTake, ...s.takes];

          return {
            ...s,
            isCustomTake: true,
            isMuted: false,
            latencyOffsetMs,
            musician: newMusician,
            takes: newTakes,
            activeTakeIndex: 0,
          };
        }
        return s;
      });

      audioEngine.updateSlots(updatedSlots);

      // Check if all 4 slots are human takes!
      const humanTakes = updatedSlots.filter((st) => st.isCustomTake).length;
      if (humanTakes === 4) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      }

      return { ...prev, slots: updatedSlots };
    });
  };

  // 创建房间:写入 Supabase 拿到真实 id → 跳转分享直达页;联网失败退回本地沙盒
  const handleCreateRoom = async (templateId: string, customTitle: string, creatorName: string) => {
    const chosenTemplate = ROOM_TEMPLATES.find((t) => t.id === templateId) || ROOM_TEMPLATES[0];
    audioEngine.stop();

    try {
      const { id } = await createRoom({
        title: customTitle,
        templateId: chosenTemplate.id,
        bpm: chosenTemplate.bpm,
        progression: chosenTemplate.progression,
        creatorName,
        slots: createDefaultSlots(chosenTemplate),
      });
      router.push(`/room/${id}`);
      return;
    } catch (e) {
      console.warn('创建房间失败,退回本地沙盒', e);
    }

    // 本地兜底(旧行为):离线也能玩
    const newRoom: RoomState = {
      id: `room-${Date.now()}`,
      title: customTitle,
      templateId: chosenTemplate.id,
      bpm: chosenTemplate.bpm,
      createdAt: new Date().toISOString(),
      creatorName,
      slots: createDefaultSlots(chosenTemplate),
      progression: chosenTemplate.progression,
    };
    setRoom(newRoom);
    setTemplate(chosenTemplate);
  };

  const handleExportWav = async () => {
    try {
      setIsExportingWav(true);
      await downloadRoomWav(room.title);
    } catch (e) {
      console.error('Failed to export mixdown', e);
    } finally {
      setIsExportingWav(false);
    }
  };

  // 进入广场房间:直达分享页 /room/[id](由 RoomView 负责加载与播放)
  const handleSelectCommunityRoom = (commRoom: CommunityRoom) => {
    audioEngine.stop();
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.5 },
    });
    router.push(`/room/${commRoom.id}`);
  };

  // 发布到广场:房间行 + 招募信息写入 Supabase,再刷新列表
  const handlePublishRoom = async (newRoom: CommunityRoom) => {
    try {
      const tmpl = ROOM_TEMPLATES.find((t) => t.id === newRoom.templateId) || ROOM_TEMPLATES[0];
      const { id } = await createRoom({
        title: newRoom.title,
        templateId: newRoom.templateId,
        bpm: newRoom.bpm,
        progression: newRoom.progression,
        creatorName: newRoom.creatorName,
        creatorAvatar: newRoom.creatorAvatar,
        slots: newRoom.slots && newRoom.slots.length === 4 ? newRoom.slots : createDefaultSlots(tmpl),
      });
      await updateRoomRecruitment(id, {
        genre: newRoom.genre,
        contactInfo: newRoom.contactInfo,
        recruitmentCall: newRoom.recruitmentCall,
        tags: newRoom.tags,
      });
      const list = await listPublishedRooms();
      setCommunityRooms(list);
    } catch (e) {
      console.warn('发布房间失败', e);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between selection:bg-[#ff5522]/20 selection:text-zinc-900 dark:selection:text-white transition-colors duration-200">
      {/* Top Header & Master Controls */}
      <div className="flex flex-col gap-6">
        <RoomHeader
          room={room}
          template={template}
          transportState={transportState}
          isDark={isDark}
          lang={lang}
          onSetLang={setLang}
          t={t}
          activeTab={activeMainTab}
          onSelectTab={setActiveMainTab}
          openRoomsCount={communityRooms.filter((r) => r.humanSlotsCount < 4).length}
          onToggleTheme={toggleTheme}
          onTogglePlay={handleTogglePlay}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onExportWav={handleExportWav}
          isExporting={isExportingWav}
        />

        {/* Main Content Area */}
        <main className="w-full flex flex-col gap-6">
          {activeMainTab === 'plaza' ? (
            /* Community Virtual Band Plaza View */
            <BandPlazaView
              rooms={communityRooms}
              currentRoomId={room.id}
              onSelectRoom={handleSelectCommunityRoom}
              onOpenPublishModal={() => setIsPublishModalOpen(true)}
              loading={plazaLoading}
              t={t}
            />
          ) : (
            /* 4-Track Jam Studio View */
            <div className="px-4 sm:px-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
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
                onSwitchTemplate={(tmpl) => handleCreateRoom(tmpl.id, tmpl.title.split(' ')[0] + ' 8小节', '乐手')}
              />
            </div>
          )}
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

      {/* Create Room Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateRoomModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onCreateRoom={handleCreateRoom}
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
}
