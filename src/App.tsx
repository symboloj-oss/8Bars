/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { RoomState, RoomTemplate, SlotInfo, SlotType, SlotTake, MusicianInfo } from './types/music';
import { CommunityRoom } from './types/community';
import { ROOM_TEMPLATES, createDefaultSlots } from './data/templates';
import { INITIAL_COMMUNITY_ROOMS } from './data/communityRooms';
import { audioEngine, TransportState } from './services/audioEngine';
import { useTheme } from './hooks/useTheme';
import { useI18n } from './i18n/useI18n';
import { RoomHeader } from './components/RoomHeader';
import { TapeLoopVisualizer } from './components/TapeLoopVisualizer';
import { FourSlotsGrid } from './components/FourSlotsGrid';
import { PracticeTunerLab } from './components/PracticeTunerLab';
import { StudioRecordingModal } from './components/StudioRecordingModal';
import { BandShareCardModal } from './components/BandShareCardModal';
import { CreateRoomModal } from './components/CreateRoomModal';
import { ChordReferenceDrawer } from './components/ChordReferenceDrawer';
import { BandPlazaView } from './components/BandPlazaView';
import { PublishRoomModal } from './components/PublishRoomModal';
import { Users, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

const STORAGE_KEY = '8bars_current_room_v2';
const COMM_STORAGE_KEY = '8bars_comm_rooms_v1';

export default function App() {
  const { theme, toggleTheme, isDark } = useTheme();
  const { lang, setLang, t } = useI18n();

  // Navigation tab: 'studio' (合奏录音棚) vs 'plaza' (乐队广场)
  const [activeMainTab, setActiveMainTab] = useState<'studio' | 'plaza'>('studio');

  // Community rooms state
  const [communityRooms, setCommunityRooms] = useState<CommunityRoom[]>(() => {
    try {
      const saved = localStorage.getItem(COMM_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read community rooms', e);
    }
    return INITIAL_COMMUNITY_ROOMS;
  });

  // Current active template
  const [template, setTemplate] = useState<RoomTemplate>(ROOM_TEMPLATES[0]);

  // Current room state
  const [room, setRoom] = useState<RoomState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const tmpl = ROOM_TEMPLATES.find((t) => t.id === parsed.templateId) || ROOM_TEMPLATES[0];
        return {
          ...parsed,
          slots: parsed.slots.map((s: SlotInfo) => ({
            ...s,
            audioBlob: undefined,
            audioBlobUrl: undefined,
            takes: s.takes || [],
            activeTakeIndex: s.activeTakeIndex || 0,
          })),
        };
      }
    } catch (e) {
      console.warn('Could not read from local storage', e);
    }

    const defaultTmpl = ROOM_TEMPLATES[0];
    return {
      id: 'room-friday-pop-01',
      title: '周五夜流行 (Pop in C)',
      templateId: defaultTmpl.id,
      bpm: defaultTmpl.bpm,
      createdAt: new Date().toISOString(),
      creatorName: '阿杰 (吉他手)',
      slots: createDefaultSlots(defaultTmpl),
      progression: defaultTmpl.progression,
    };
  });

  // Transport state
  const [transportState, setTransportState] = useState<TransportState>({
    isPlaying: false,
    currentBar: 0,
    currentBeat: 0,
    currentChord: template.progression[0],
    nextChord: template.progression[1],
    progress: 0,
    elapsedSeconds: 0,
    totalSeconds: (32 * 60) / template.bpm,
  });

  // Track meter levels
  const [meterLevels, setMeterLevels] = useState<Record<SlotType, number>>({
    drums: 0,
    bass: 0,
    chords: 0,
    melody: 0,
  });

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
    audioEngine.setTemplateAndSlots(curTemplate, room.slots);
  }, [room.templateId]);

  // Subscribe to transport state
  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((state) => {
      setTransportState(state);
    });
    return unsubscribe;
  }, []);

  // Poll VU meters during playback
  useEffect(() => {
    let animId: number;
    const pollMeters = () => {
      if (transportState.isPlaying) {
        setMeterLevels({
          drums: audioEngine.getTrackMeter('drums'),
          bass: audioEngine.getTrackMeter('bass'),
          chords: audioEngine.getTrackMeter('chords'),
          melody: audioEngine.getTrackMeter('melody'),
        });
      } else {
        setMeterLevels({ drums: 0, bass: 0, chords: 0, melody: 0 });
      }
      animId = requestAnimationFrame(pollMeters);
    };
    animId = requestAnimationFrame(pollMeters);
    return () => cancelAnimationFrame(animId);
  }, [transportState.isPlaying]);

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

  // Save community rooms to localStorage
  useEffect(() => {
    try {
      const serializableComm = communityRooms.map((cr) => ({
        ...cr,
        slots: cr.slots.map((s) => ({
          ...s,
          audioBlob: undefined,
          audioBlobUrl: undefined,
          takes: (s.takes || []).map((t) => ({ ...t, audioBlob: undefined, audioBlobUrl: undefined })),
        })),
      }));
      localStorage.setItem(COMM_STORAGE_KEY, JSON.stringify(serializableComm));
    } catch (e) {
      console.warn('Failed to save community rooms', e);
    }
  }, [communityRooms]);

  // Handlers
  const handleTogglePlay = async () => {
    audioEngine.togglePlay();
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

  const handleCreateRoom = (templateId: string, customTitle: string, creatorName: string) => {
    const chosenTemplate = ROOM_TEMPLATES.find((t) => t.id === templateId) || ROOM_TEMPLATES[0];
    audioEngine.stop();

    const newSlots = createDefaultSlots(chosenTemplate);

    const newRoom: RoomState = {
      id: `room-${Date.now()}`,
      title: customTitle,
      templateId: chosenTemplate.id,
      bpm: chosenTemplate.bpm,
      createdAt: new Date().toISOString(),
      creatorName,
      slots: newSlots,
      progression: chosenTemplate.progression,
    };

    setRoom(newRoom);
    setTemplate(chosenTemplate);
  };

  const handleExportWav = async () => {
    try {
      setIsExportingWav(true);
      const wavBlob = await audioEngine.exportMixdownWav();
      const downloadUrl = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `8Bars_${room.title.replace(/\s+/g, '_')}_8小节合奏.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error('Failed to export mixdown', e);
    } finally {
      setIsExportingWav(false);
    }
  };

  const handleSelectCommunityRoom = (commRoom: CommunityRoom) => {
    audioEngine.stop();
    const chosenTemplate = ROOM_TEMPLATES.find((t) => t.id === commRoom.templateId) || ROOM_TEMPLATES[0];

    const newRoomState: RoomState = {
      id: commRoom.id,
      title: commRoom.title,
      templateId: chosenTemplate.id,
      bpm: commRoom.bpm,
      createdAt: commRoom.createdAt,
      creatorName: commRoom.creatorName,
      slots: commRoom.slots && commRoom.slots.length === 4 ? commRoom.slots : createDefaultSlots(chosenTemplate),
      progression: commRoom.progression,
    };

    setRoom(newRoomState);
    setTemplate(chosenTemplate);
    audioEngine.setTemplateAndSlots(chosenTemplate, newRoomState.slots);
    setActiveMainTab('studio');
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.5 },
    });
  };

  const handlePublishRoom = (newRoom: CommunityRoom) => {
    setCommunityRooms((prev) => [newRoom, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#fbfbfd] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col justify-between selection:bg-[#ff5522]/20 selection:text-zinc-900 dark:selection:text-white transition-colors duration-200">
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
              t={t}
            />
          ) : (
            /* 4-Track Jam Studio View */
            <div className="px-4 sm:px-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
              {/* Module 1: 4-Track Tape Loop Deck */}
              <section>
                <TapeLoopVisualizer
                  slots={room.slots}
                  transportState={transportState}
                  progression={template.progression}
                  bpm={template.bpm}
                  t={t}
                />
              </section>

              {/* Module 2: The 4 Fixed Slots Grid with Multi-Take selector */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-white/6 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#ff5522]" />
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight font-mono uppercase">
                      {t('slots.title')}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    {t('slots.subtitle')}
                  </span>
                </div>

                <FourSlotsGrid
                  slots={room.slots}
                  isPlaying={transportState.isPlaying}
                  meterLevels={meterLevels}
                  onClaimSlot={handleClaimSlot}
                  onToggleMute={handleToggleMute}
                  onToggleSolo={handleToggleSolo}
                  onVolumeChange={handleVolumeChange}
                  onSelectTake={handleSelectTake}
                  t={t}
                />
              </section>

              {/* Module 3: Musician Prep Lab (Strum Pad & 440Hz Tuner Reference) */}
              <section>
                <PracticeTunerLab
                  progression={template.progression}
                  progressionDetails={template.progressionDetails}
                  currentBeat={transportState.currentBeat}
                  isPlaying={transportState.isPlaying}
                  t={t}
                />
              </section>

              {/* Module 4: Preset Styles & Progression Switcher */}
              <section className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-white/8 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm dark:shadow-xl transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#ff5522]/10 border border-[#ff5522]/30 flex items-center justify-center text-[#ff5522] shrink-0 font-mono text-xs font-bold">
                    8B
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white font-mono uppercase">
                      {t('templates.stripTitle')}
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {t('templates.stripSubtitle')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 font-mono">
                  {ROOM_TEMPLATES.map((tmpl) => {
                    const isCurrent = tmpl.id === room.templateId;
                    return (
                      <motion.button
                        key={tmpl.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (!isCurrent) {
                            handleCreateRoom(tmpl.id, tmpl.title.split(' ')[0] + ' 8小节', '乐手');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors shadow-2xs ${
                          isCurrent
                            ? 'bg-[#ff5522] text-white shadow-md shadow-[#ff5522]/20'
                            : 'bg-zinc-100 dark:bg-[#18181d] border border-zinc-200 dark:border-white/6 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:border-zinc-300 dark:hover:border-white/12'
                        }`}
                      >
                        {tmpl.title.split(' ')[0]} ({tmpl.bpm} BPM)
                      </motion.button>
                    );
                  })}
                </div>
              </section>

              {/* Module 5: Interactive Chord Fretboard & Piano Cheatsheet with Audio Preview */}
              <section>
                <ChordReferenceDrawer progression={template.progression} t={t} />
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Clean Minimalist Hardware Footer */}
      <footer className="mt-12 border-t border-zinc-200/80 dark:border-white/6 bg-white/60 dark:bg-[#08080a] py-6 px-4 sm:px-8 select-none transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-800 dark:text-zinc-200">「8BARS」</span>
            <span>/</span>
            <span>{t('footer.brand')}</span>
          </div>

          <div className="flex items-center gap-6">
            <span>{t('footer.rule1')}</span>
            <span>{t('footer.rule2')}</span>
            <span>{t('footer.rule3')}</span>
          </div>
        </div>
      </footer>

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
