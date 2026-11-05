import React, { useState } from 'react';
import { SlotInfo, SlotType, SlotTake } from '../types/music';
import { getCharacterForSlot, BandCharacter } from '../data/characters';
import { audioEngine } from '../services/audioEngine';
import {
  Mic,
  Volume2,
  VolumeX,
  Radio,
  RotateCcw,
  Bot,
  User,
  Sliders,
  CheckCircle2,
  GitBranch,
  Sparkles,
  Music,
} from 'lucide-react';
import { motion } from 'motion/react';

interface FourSlotsGridProps {
  slots: SlotInfo[];
  isPlaying: boolean;
  meterLevels: Record<SlotType, number>;
  onClaimSlot: (slot: SlotInfo) => void;
  onToggleMute: (slotType: SlotType) => void;
  onToggleSolo: (slotType: SlotType) => void;
  onVolumeChange: (slotType: SlotType, volume: number) => void;
  onSelectTake?: (slotType: SlotType, takeIndex: number) => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const FourSlotsGrid: React.FC<FourSlotsGridProps> = ({
  slots,
  isPlaying,
  meterLevels,
  onClaimSlot,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onSelectTake,
  t = (k) => k,
}) => {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {slots.map((slot, sIdx) => {
        const isHuman = slot.isCustomTake;
        const meter = meterLevels[slot.type] || 0;

        return (
          <motion.div
            key={slot.id}
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`relative rounded-2xl border transition-colors duration-150 flex flex-col justify-between overflow-hidden p-4.5 select-none shadow-sm dark:shadow-none ${
              isHuman
                ? 'bg-white dark:bg-[#151519] border-[#ff5522]/40 shadow-[0_4px_20px_rgba(255,85,34,0.06)] ring-1 ring-[#ff5522]/20'
                : 'bg-white dark:bg-[#121215] border-zinc-200/90 dark:border-white/8 hover:border-zinc-300 dark:hover:border-white/16'
            }`}
          >
            {/* Top row: Track Code & Status Badge */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                    <span className="font-bold text-zinc-800 dark:text-zinc-300">TRK 0{sIdx + 1}</span>
                    <span>/</span>
                    <span className="uppercase text-zinc-500 dark:text-zinc-400">{slot.type}</span>
                  </div>
                  <h4 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight mt-0.5">
                    {t('role.' + slot.type) || slot.roleName}
                  </h4>
                </div>

                {/* Status Badge */}
                <div
                  className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1.5 ${
                    isHuman
                      ? 'bg-[#ff5522]/10 text-[#ff5522] border border-[#ff5522]/30 font-bold'
                      : 'bg-zinc-100 dark:bg-white/6 text-zinc-500 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/8'
                  }`}
                >
                  {isHuman ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff5522]" />
                      {t('slots.taken')}
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                      {t('slots.aiSession')}
                    </>
                  )}
                </div>
              </div>

              {/* Virtual Band Character Card */}
              {(() => {
                const character = getCharacterForSlot(slot.type);
                return (
                  <div className="relative rounded-2xl overflow-hidden bg-zinc-100 dark:bg-[#0c0c0f] border border-zinc-200/90 dark:border-white/8 my-2 group transition-all shadow-2xs">
                    {/* Character Artwork with Groove Animation */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden flex items-center justify-center bg-zinc-100 dark:bg-[#15151a]">
                      <motion.img
                        src={character.imageUrl}
                        alt={character.name}
                        animate={
                          isPlaying && !slot.isMuted
                            ? {
                                scale: [1, 1.025, 1],
                                y: [0, -3, 0],
                              }
                            : { scale: 1, y: 0 }
                        }
                        transition={{
                          repeat: Infinity,
                          duration: 1.1,
                          ease: 'easeInOut',
                        }}
                        className={`w-full h-full object-cover object-top transition-all duration-300 group-hover:scale-105 ${
                          slot.isMuted ? 'opacity-35 grayscale' : 'opacity-100'
                        }`}
                      />

                      {/* Playing Aura Border when active */}
                      {isPlaying && !slot.isMuted && (
                        <div
                          className="absolute inset-0 pointer-events-none ring-2 ring-inset opacity-80 animate-pulse rounded-2xl"
                          style={{ borderColor: character.accentColor }}
                        />
                      )}

                      {/* Floating Name & Species Pill */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
                        <span className="px-2 py-0.5 rounded-lg bg-black/80 dark:bg-black/90 backdrop-blur-md text-white text-[10px] font-bold font-mono shadow-md flex items-center gap-1.5 border border-white/10">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: character.accentColor }}
                          />
                          <span>{character.name}</span>
                        </span>

                        <span className="px-2 py-0.5 rounded-lg bg-white/90 dark:bg-[#1a1a20]/90 backdrop-blur-md text-zinc-800 dark:text-zinc-200 text-[9px] font-mono border border-zinc-200/80 dark:border-white/10 shrink-0">
                          {character.species.split(' ')[0]}
                        </span>
                      </div>

                      {/* Quick Instrument Sound Audition Button */}
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (slot.type === 'drums') {
                            audioEngine.playCountInBeat(1);
                          } else if (slot.type === 'bass') {
                            await audioEngine.playPitchReference('E2');
                          } else {
                            await audioEngine.previewChord(['C4', 'E4', 'G4']);
                          }
                        }}
                        title={`试听 ${character.name} 原声音色`}
                        className="absolute top-2 right-2 w-7 h-7 rounded-xl bg-white/90 dark:bg-black/70 backdrop-blur-md text-zinc-700 dark:text-zinc-300 hover:text-[#ff5522] border border-zinc-200 dark:border-white/10 flex items-center justify-center shadow-xs transition-colors"
                      >
                        <Music className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>

                    {/* Character Personality Quote Strip */}
                    <div className="px-3 py-1.5 bg-white/90 dark:bg-[#121216]/95 border-t border-zinc-200/70 dark:border-white/6 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-600 dark:text-zinc-400 truncate pr-2 italic">
                        {character.quote}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Musician Current Take Info */}
              <div className="bg-zinc-50 dark:bg-[#0b0b0e] rounded-xl p-2.5 border border-zinc-200/70 dark:border-white/6 my-1.5 flex flex-col gap-1 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1.5">
                    {isHuman ? (
                      <User className="w-3.5 h-3.5 text-[#ff5522]" />
                    ) : (
                      <Bot className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                    )}
                    {slot.musician.name}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0">
                    {slot.musician.recordedAt || t('slots.justNow')}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono line-clamp-1">
                  {slot.musician.instrumentTitle}
                </p>
              </div>

              {/* Takes / Fork Switcher (if multiple takes exist) */}
              {slot.takes && slot.takes.length > 1 && (
                <div className="my-2 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-zinc-400" />
                      {t('slots.takes')}
                    </span>
                    <span>{t('slots.totalTakes', { count: slot.takes.length })}</span>
                  </div>
                  <div className="flex gap-1 overflow-x-auto p-1 bg-zinc-100 dark:bg-[#09090c] rounded-lg border border-zinc-200 dark:border-white/4">
                    {slot.takes.map((take, tIdx) => {
                      const isActive = slot.activeTakeIndex === tIdx;
                      return (
                        <motion.button
                          key={take.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onSelectTake && onSelectTake(slot.type, tIdx)}
                          className={`px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap transition-colors ${
                            isActive
                              ? 'bg-[#ff5522] text-white font-bold shadow-xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white/60 dark:bg-white/4 hover:bg-white dark:hover:bg-white/8'
                          }`}
                        >
                          {take.title}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Real-time Hardware LED VU Meter */}
              <div className="my-2.5 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                  <span>{t('slots.level')}</span>
                  <span className={isPlaying && !slot.isMuted ? 'text-[#ff5522] font-bold' : 'text-zinc-400 dark:text-zinc-500'}>
                    {slot.isMuted ? t('slots.levelMuted') : isPlaying ? t('slots.levelActive') : t('slots.levelReady')}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-100 dark:bg-[#08080a] rounded-full overflow-hidden p-0.5 border border-zinc-200/80 dark:border-white/4">
                  <motion.div
                    className={`h-full rounded-full transition-all duration-75 ${
                      slot.isMuted
                        ? 'bg-zinc-300 dark:bg-zinc-800 w-0'
                        : isPlaying && meter > 0.02
                        ? 'bg-[#ff5522] shadow-[0_0_6px_#ff5522]'
                        : 'bg-zinc-300 dark:bg-zinc-800 w-1'
                    }`}
                    style={{
                      width: slot.isMuted ? '0%' : isPlaying ? `${Math.max(4, meter * 100)}%` : '4%',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Controls: Mixer strip + Big Action Button */}
            <div>
              {/* Mixer Channel: Mute / Solo / Fader */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200/80 dark:border-white/6 mb-3">
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => onToggleMute(slot.type)}
                    className={`px-2 py-1 rounded font-bold transition-colors ${
                      slot.isMuted
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-zinc-100 dark:bg-[#18181e] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/6'
                    }`}
                  >
                    M
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => onToggleSolo(slot.type)}
                    className={`px-2 py-1 rounded font-bold transition-colors ${
                      slot.isSolo
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-black font-extrabold shadow-xs'
                        : 'bg-zinc-100 dark:bg-[#18181e] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/6'
                    }`}
                  >
                    S
                  </motion.button>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-1.5 flex-1 max-w-[110px]">
                  <Volume2 className="w-3 h-3 text-zinc-400 dark:text-zinc-500 shrink-0" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={slot.volume}
                    onChange={(e) => onVolumeChange(slot.type, Number(e.target.value))}
                    className="w-full h-1 accent-[#ff5522] cursor-pointer bg-zinc-200 dark:bg-zinc-800 rounded-lg"
                  />
                </div>
              </div>

              {/* Action Button: Claim / Overwrite */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onClaimSlot(slot)}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                  isHuman
                    ? 'bg-zinc-100 dark:bg-[#1c1c22] hover:bg-zinc-200 dark:hover:bg-[#25252c] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10'
                    : 'bg-[#ff5522] hover:bg-[#ff4410] text-white shadow-[#ff5522]/20'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                {isHuman ? t('slots.fork') : t('slots.claim')}
              </motion.button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
