"use client";

// 录音棚工作区:4 轨磁带盘 + 席位网格 + 练习实验室 + 模板切换条 + 和弦速查
// 从 HomeApp 抽出,供首页与 /room/[id] 房间页共用(UI 与原来完全一致)
import { RoomState, RoomTemplate, SlotInfo, SlotType } from '../types/music';
import { ROOM_TEMPLATES } from '../data/templates';
import { TransportState } from '../services/audioEngine';
import { TapeLoopVisualizer } from '../components/TapeLoopVisualizer';
import { FourSlotsGrid } from '../components/FourSlotsGrid';
import { PracticeTunerLab } from '../components/PracticeTunerLab';
import { ChordReferenceDrawer } from '../components/ChordReferenceDrawer';
import { Users } from 'lucide-react';
import { motion } from 'motion/react';

interface StudioWorkspaceProps {
  room: RoomState;
  template: RoomTemplate;
  transportState: TransportState;
  meterLevels: Record<SlotType, number>;
  t: (key: string, params?: Record<string, string | number>) => string;
  onClaimSlot: (slot: SlotInfo) => void;
  onToggleMute: (slotType: SlotType) => void;
  onToggleSolo: (slotType: SlotType) => void;
  onVolumeChange: (slotType: SlotType, volume: number) => void;
  onSelectTake: (slotType: SlotType, takeIndex: number) => void;
  onSwitchTemplate: (template: RoomTemplate) => void;
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  room,
  template,
  transportState,
  meterLevels,
  t,
  onClaimSlot,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onSelectTake,
  onSwitchTemplate,
}) => {
  return (
    <div className="w-full flex flex-col gap-6">
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
        <div className="flex items-center justify-between border-b border-subtle pb-2.5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#ff5522]" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">
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
          onClaimSlot={onClaimSlot}
          onToggleMute={onToggleMute}
          onToggleSolo={onToggleSolo}
          onVolumeChange={onVolumeChange}
          onSelectTake={onSelectTake}
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
      <section className="bg-white dark:bg-zinc-900 border border-subtle rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-card dark:shadow-card-dark transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#ff5522]/10 border border-[#ff5522]/25 flex items-center justify-center text-[#ff5522] shrink-0 font-mono text-xs font-bold">
            8B
          </div>
          <div className="flex flex-col">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
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
                    onSwitchTemplate(tmpl);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isCurrent
                    ? 'bg-[#ff5522] text-white shadow-primary'
                    : 'bg-zinc-100 dark:bg-white/6 border border-subtle text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:border-subtle-strong'
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

      {/* Clean Minimalist Hardware Footer */}
      <footer className="mt-12 border-t border-subtle bg-white/60 dark:bg-zinc-950 py-6 px-4 sm:px-8 select-none transition-colors duration-200">
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
    </div>
  );
};
