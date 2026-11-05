"use client";
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
            className={`relative rounded-2xl border border-subtle transition-colors duration-150 flex flex-col justify-between overflow-hidden p-4 select-none shadow-card dark:shadow-none ${
              isHuman
                ? 'bg-white dark:bg-zinc-900 border-[#ff5522]/40 ring-1 ring-[#ff5522]/20'
                : 'bg-white dark:bg-zinc-900 hover:border-subtle-strong'
            }`}
          >
            {/* Top row: 角色名 & 状态徽章 */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h4 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
                  {t('role.' + slot.type) || slot.roleName}
                </h4>

                {/* Status Badge */}
                <div
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1.5 shrink-0 ${
                    isHuman
                      ? 'bg-[#ff5522]/10 text-[#ff5522] border border-[#ff5522]/30 font-bold'
                      : 'bg-zinc-100 dark:bg-white/6 text-zinc-500 dark:text-zinc-400 border border-subtle'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isHuman ? 'bg-[#ff5522]' : 'bg-zinc-400 dark:bg-zinc-500'}`} />
                  {isHuman ? t('slots.taken') : t('slots.aiSession')}
                </div>
              </div>

              {/* Virtual Band Character Card */}
              {(() => {
                const character = getCharacterForSlot(slot.type);
                return (
                  <div className="relative rounded-xl overflow-hidden bg-zinc-100 dark:bg-black/40 border border-subtle group transition-all">
                    {/* Character Artwork with Groove Animation */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
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
                          className="absolute inset-0 pointer-events-none ring-2 ring-inset opacity-70 animate-pulse rounded-xl"
                          style={{ borderColor: character.accentColor }}
                        />
                      )}

                      {/* Floating Name Pill */}
                      <div className="absolute bottom-2 left-2 pointer-events-none">
                        <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-white text-[10px] font-bold font-mono flex items-center gap-1.5 border border-white/10">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: character.accentColor }}
                          />
                          <span>{character.name}</span>
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
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 dark:bg-black/70 backdrop-blur-md text-zinc-600 dark:text-zinc-300 hover:text-[#ff5522] border border-subtle flex items-center justify-center shadow-sm transition-colors"
                      >
                        <Music className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>

                    {/* Musician + VU Meter compact strip */}
                    <div className="px-3 py-2 bg-white/90 dark:bg-zinc-900/95 border-t border-subtle flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1.5">
                          {isHuman ? (
                            <User className="w-3.5 h-3.5 text-[#ff5522] shrink-0" />
                          ) : (
                            <Bot className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                          )}
                          {slot.musician.name}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0">
                          {slot.musician.recordedAt || t('slots.justNow')}
                        </span>
                      </div>

                      {/* Real-time Hardware LED VU Meter */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0">
                          {t('slots.level')}
                        </span>
                        <div className="h-1 flex-1 bg-zinc-100 dark:bg-black/60 rounded-full overflow-hidden border border-subtle">
                          <motion.div
                            className={`h-full rounded-full transition-all duration-75 ${
                              slot.isMuted
                                ? 'bg-zinc-300 dark:bg-zinc-700 w-0'
                                : isPlaying && meter > 0.02
                                ? 'bg-[#ff5522] shadow-[0_0_6px_#ff5522]'
                                : 'bg-zinc-300 dark:bg-zinc-700 w-1'
                            }`}
                            style={{
                              width: slot.isMuted ? '0%' : isPlaying ? `${Math.max(4, meter * 100)}%` : '4%',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Takes / Fork Switcher (if multiple takes exist) */}
              {slot.takes && slot.takes.length > 1 && (
                <div className="my-2.5 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-zinc-400" />
                      {t('slots.takes')}
                    </span>
                    <span>{t('slots.totalTakes', { count: slot.takes.length })}</span>
                  </div>
                  <div className="flex gap-1 overflow-x-auto p-1 bg-zinc-50 dark:bg-black/40 rounded-lg border border-subtle">
                    {slot.takes.map((take, tIdx) => {
                      const isActive = slot.activeTakeIndex === tIdx;
                      return (
                        <motion.button
                          key={take.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onSelectTake && onSelectTake(slot.type, tIdx)}
                          className={`px-2 py-1 rounded-md text-[10px] font-mono whitespace-nowrap transition-colors ${
                            isActive
                              ? 'bg-[#ff5522] text-white font-bold shadow-sm'
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
            </div>

            {/* Bottom Controls: Mixer strip + Big Action Button */}
            <div>
              {/* Mixer Channel: Mute / Solo / Fader */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-subtle mb-3">
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => onToggleMute(slot.type)}
                    title={t('slots.mute')}
                    className={`w-7 h-6 rounded-md font-bold transition-colors flex items-center justify-center ${
                      slot.isMuted
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-zinc-100 dark:bg-white/6 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-subtle'
                    }`}
                  >
                    M
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => onToggleSolo(slot.type)}
                    title={t('slots.solo')}
                    className={`w-7 h-6 rounded-md font-bold transition-colors flex items-center justify-center ${
                      slot.isSolo
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-black font-extrabold shadow-sm'
                        : 'bg-zinc-100 dark:bg-white/6 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-subtle'
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
                    className="w-full h-1 accent-[#ff5522] cursor-pointer bg-zinc-200 dark:bg-zinc-700 rounded-lg"
                  />
                </div>
              </div>

              {/* Action Button: Claim / Overwrite */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onClaimSlot(slot)}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  isHuman
                    ? 'btn-secondary'
                    : 'btn-primary'
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
