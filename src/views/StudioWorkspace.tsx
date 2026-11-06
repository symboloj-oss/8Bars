"use client";

// 录音棚工作区:Livehouse 舞台(乐手站位+大播放键)→ 磁带盘 → 席位混音卡 → 练习实验室 → 和弦速查
import { RoomState, RoomTemplate, SlotInfo, SlotType } from '../types/music';
import { ROOM_TEMPLATES } from '../data/templates';
import { TransportState } from '../services/audioEngine';
import { StageHero } from '../components/StageHero';
import { TapeLoopVisualizer } from '../components/TapeLoopVisualizer';
import { FourSlotsGrid } from '../components/FourSlotsGrid';
import { PracticeTunerLab } from '../components/PracticeTunerLab';
import { ChordReferenceDrawer } from '../components/ChordReferenceDrawer';
import { Button } from '../components/ui/button';
import { Users, Download, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface StudioWorkspaceProps {
  room: RoomState;
  template: RoomTemplate;
  transportState: TransportState;
  meterLevels: Record<SlotType, number>;
  t: (key: string, params?: Record<string, string | number>) => string;
  onTogglePlay: () => void;
  onClaimSlot: (slot: SlotInfo) => void;
  onToggleMute: (slotType: SlotType) => void;
  onToggleSolo: (slotType: SlotType) => void;
  onVolumeChange: (slotType: SlotType, volume: number) => void;
  onSelectTake: (slotType: SlotType, takeIndex: number) => void;
  onSwitchTemplate: (template: RoomTemplate) => void;
  onExportWav: () => void;
  isExporting: boolean;
  onOpenCreateModal: () => void;
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  room,
  template,
  transportState,
  meterLevels,
  t,
  onTogglePlay,
  onClaimSlot,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onSelectTake,
  onSwitchTemplate,
  onExportWav,
  isExporting,
  onOpenCreateModal,
}) => {
  return (
    <div className="w-full flex flex-col gap-6">
      {/* Module 1: Livehouse 舞台 —— 乐手站位 + 大播放键 */}
      <StageHero
        room={room}
        template={template}
        transportState={transportState}
        t={t}
        onTogglePlay={onTogglePlay}
        onClaimSlot={onClaimSlot}
      />

      {/* Module 2: 主控台 —— 4 轨磁带盘 */}
      <TapeLoopVisualizer
        slots={room.slots}
        transportState={transportState}
        progression={template.progression}
        bpm={template.bpm}
        t={t}
      />

      {/* 模板风格切换 + 工具按钮:轻量一行 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto font-mono min-w-0">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0 whitespace-nowrap">
            {t('templates.stripTitle')}
          </span>
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
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                  isCurrent
                    ? 'bg-[#ff5522] text-white shadow-primary'
                    : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                {tmpl.title.split(' ')[0]} ({tmpl.bpm} BPM)
              </motion.button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onExportWav} disabled={isExporting} title={t('header.exportWav')}>
            <Download className="text-zinc-400" />
            <span className="hidden sm:inline">{isExporting ? t('header.exporting') : t('header.exportWav')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenCreateModal}>
            <Plus className="text-zinc-400" />
            <span className="hidden sm:inline">{t('header.newRoom')}</span>
          </Button>
        </div>
      </div>

      {/* Module 2: 席位网格(核心操作区) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2.5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#ff5522]" />
            <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white tracking-tight">
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

      {/* Module 4: Interactive Chord Fretboard & Piano Cheatsheet with Audio Preview */}
      <section>
        <ChordReferenceDrawer progression={template.progression} t={t} />
      </section>

      {/* Clean Minimalist Hardware Footer */}
      <footer className="mt-8 border-t border-subtle bg-white/60 dark:bg-zinc-950 py-6 px-4 sm:px-8 select-none transition-colors duration-200">
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
