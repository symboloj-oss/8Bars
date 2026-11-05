"use client";
import React from 'react';
import { SlotInfo } from '../types/music';
import { TransportState } from '../services/audioEngine';
import { Disc } from 'lucide-react';
import { motion } from 'motion/react';

interface TapeLoopVisualizerProps {
  slots: SlotInfo[];
  transportState: TransportState;
  progression: string[];
  bpm: number;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const TapeLoopVisualizer: React.FC<TapeLoopVisualizerProps> = ({
  slots,
  transportState,
  progression,
  bpm,
  t = (k) => k,
}) => {
  const { isPlaying, currentBar, currentBeat, progress } = transportState;

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border border-subtle rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-card dark:shadow-card-dark select-none relative overflow-hidden transition-colors duration-200">
      {/* Top console bar: Tape Deck Head */}
      <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400 border-b border-subtle pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-300 font-bold">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#ff5522]' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
            <span>{t('tape.title')}</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-700">/</span>
          <span>{t('tape.loopInfo')}</span>
          <span className="text-zinc-300 dark:text-zinc-700">/</span>
          <span>{bpm} BPM</span>
        </div>

        {/* Real-time Bar / Beat Counter */}
        <div className="flex items-center gap-2">
          <span className="bg-zinc-100 dark:bg-white/6 border border-subtle px-2 py-0.5 rounded text-zinc-800 dark:text-zinc-100 font-bold tabular-nums">
            BAR 0{currentBar + 1} : BEAT 0{currentBeat + 1}
          </span>
          <span className={`${isPlaying ? 'text-[#ff5522]' : 'text-zinc-400 dark:text-zinc-500'} font-bold`}>
            {isPlaying ? `● ${t('tape.play')}` : `■ ${t('tape.stop')}`}
          </span>
        </div>
      </div>

      {/* Center: The 8-Bar Tape Loop Scanner */}
      <div className="relative w-full bg-zinc-50 dark:bg-black/30 border border-subtle rounded-xl p-3 flex flex-col gap-2">
        {/* Playhead position bar */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[#ff5522] z-20 pointer-events-none transition-all duration-75 shadow-[0_0_8px_#ff5522]"
          style={{ left: `${Math.max(0.5, Math.min(99.5, progress * 100))}%` }}
        >
          <div className="w-2.5 h-2.5 bg-[#ff5522] -ml-1 -top-1 rounded-xs absolute rotate-45" />
        </div>

        {/* 4 Tracks Tape Strips */}
        {slots.map((slot, sIdx) => {
          const isHuman = slot.isCustomTake;
          return (
            <div
              key={slot.id}
              className="flex items-center gap-3 h-8 relative group"
            >
              {/* Track Label */}
              <div className="w-24 shrink-0 flex items-center justify-between font-mono text-[11px] text-zinc-500 dark:text-zinc-400 pl-1">
                <span className="font-bold text-zinc-800 dark:text-zinc-300">TRK 0{sIdx + 1}</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[50px]">
                  {slot.roleName.split(' ')[0]}
                </span>
              </div>

              {/* 8 Bars Segments */}
              <div className="flex-1 h-full grid grid-cols-8 gap-1 relative bg-white dark:bg-zinc-900 rounded-md p-1 border border-subtle">
                {progression.map((chord, barIdx) => {
                  const isCurrent = isPlaying && currentBar === barIdx;
                  return (
                    <div
                      key={`bar-${sIdx}-${barIdx}`}
                      className={`h-full rounded-xs flex items-center justify-center font-mono text-[10px] transition-colors relative overflow-hidden ${
                        isCurrent
                          ? isHuman
                            ? 'bg-[#ff5522]/20 dark:bg-[#ff5522]/25 text-[#ff5522] dark:text-white font-bold border border-[#ff5522]/50'
                            : 'bg-zinc-900/10 dark:bg-white/10 text-zinc-900 dark:text-white font-bold border border-zinc-900/20 dark:border-white/20'
                          : 'bg-zinc-50 dark:bg-[#18181e] text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {/* Only show chord symbol on chord/melody tracks */}
                      {sIdx === 2 || sIdx === 3 ? (
                        <span className="opacity-90">{chord}</span>
                      ) : (
                        <div className="flex gap-0.5 opacity-40">
                          <span className="w-1 h-1 rounded-full bg-current" />
                          <span className="w-1 h-1 rounded-full bg-current" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Track Status Badge */}
              <div className="w-16 shrink-0 text-right font-mono text-[10px]">
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    isHuman
                      ? 'bg-[#ff5522]/15 text-[#ff5522] dark:text-[#ff6633] font-bold border border-[#ff5522]/30'
                      : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {isHuman ? t('tape.human') : t('tape.aiStem')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Bar: 磁带走带指示(精简,仅播放时显示状态) */}
      <div className="flex items-center justify-between text-xs font-mono text-zinc-400 dark:text-zinc-500 pt-1">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <motion.div
              animate={{ rotate: isPlaying ? 360 : 0 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            >
              <Disc className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            </motion.div>
            {t('tape.feedReel')}
          </span>
          <span className="flex items-center gap-1.5">
            <motion.div
              animate={{ rotate: isPlaying ? 360 : 0 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            >
              <Disc className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            </motion.div>
            {t('tape.takeupReel')}
          </span>
        </div>

        <span>{t('tape.latencySync')}</span>
      </div>
    </div>
  );
};
