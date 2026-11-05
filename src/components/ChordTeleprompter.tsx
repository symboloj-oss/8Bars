"use client";
import React from 'react';
import { ChordDetail } from '../types/music';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChordTeleprompterProps {
  currentBar: number; // 0 to 7
  currentBeat: number; // 0 to 3
  progression: string[];
  progressionDetails: ChordDetail[];
  currentChordDetail: ChordDetail;
  nextChordDetail: ChordDetail;
  isRecording?: boolean;
  isPlaying?: boolean;
  bpm: number;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const ChordTeleprompter: React.FC<ChordTeleprompterProps> = ({
  currentBar,
  currentBeat,
  progression,
  progressionDetails,
  currentChordDetail,
  nextChordDetail,
  isRecording = false,
  isPlaying = false,
  bpm,
  t = (k) => k,
}) => {
  return (
    <div className="w-full flex flex-col gap-3">
      {/* 8-bar segmented timeline ribbon */}
      <div className="grid grid-cols-8 gap-1.5 w-full bg-zinc-100 dark:bg-[#0a0a0d] p-2 rounded-xl border border-zinc-200/80 dark:border-white/6 transition-colors duration-200">
        {progression.map((chordName, barIdx) => {
          const isCurrent = isPlaying && currentBar === barIdx;
          const isPast = isPlaying && currentBar > barIdx;
          return (
            <motion.div
              key={`bar-seg-${barIdx}`}
              animate={isCurrent ? { scale: 1.05 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className={`flex flex-col items-center justify-between p-1.5 rounded-lg border text-center transition-colors ${
                isCurrent
                  ? 'bg-[#ff5522]/20 border-[#ff5522] text-[#ff5522] dark:text-white shadow-xs font-bold'
                  : isPast
                  ? 'bg-zinc-200/40 dark:bg-[#121215]/40 border-zinc-200 dark:border-white/4 text-zinc-400 dark:text-zinc-600 opacity-60'
                  : 'bg-white dark:bg-[#15151a] border-zinc-200/80 dark:border-white/6 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between w-full px-0.5">
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                  #{barIdx + 1}
                </span>
                {isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff5522] animate-ping" />
                )}
              </div>
              <span className="font-bold text-sm tracking-tight my-0.5 font-mono">
                {chordName}
              </span>
              {/* 4 small beat ticks */}
              <div className="flex gap-0.5 mt-0.5">
                {[0, 1, 2, 3].map((b) => (
                  <div
                    key={`b-${b}`}
                    className={`w-1 h-1 rounded-full transition-colors ${
                      isCurrent && currentBeat >= b
                        ? 'bg-[#ff5522]'
                        : 'bg-zinc-300 dark:bg-zinc-700/60'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main prominent teleprompter focus card */}
      <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-200 shadow-sm ${
        isRecording
          ? 'bg-gradient-to-r from-rose-50/50 dark:from-[#240e08] via-white dark:via-[#141418] to-white dark:to-[#121215] border-[#ff5522]/60 shadow-lg shadow-[#ff5522]/10'
          : 'bg-white dark:bg-[#121215] border-zinc-200/90 dark:border-white/8'
      }`}>
        {/* Left: Current Chord Hero with spring transition */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#ff5522]">
                {isRecording ? t('studio.recording') : t('teleprompter.currentBar')}
              </span>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                {t('header.bar', { bar: currentBar + 1 })}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={currentChordDetail.name}
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-zinc-900 dark:text-white"
                >
                  {currentChordDetail.name}
                </motion.span>
              </AnimatePresence>
              <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-medium">
                {currentChordDetail.displayName}
              </span>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
              {t('teleprompter.feeling')}: {currentChordDetail.feeling}
            </span>
          </div>
        </div>

        {/* Center: Live 4-beat rhythm meter */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1.5">
            {t('teleprompter.rhythm', { bpm })}
          </span>
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map((b) => {
              const isActive = isPlaying && currentBeat === b;
              return (
                <motion.div
                  key={`beat-indicator-${b}`}
                  animate={isActive ? { scale: 1.12, y: -2 } : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className={`w-9 h-11 rounded-xl flex flex-col items-center justify-center font-mono font-bold transition-colors ${
                    isActive
                      ? 'bg-[#ff5522] text-white shadow-md shadow-[#ff5522]/30'
                      : 'bg-zinc-100 dark:bg-[#18181d] text-zinc-500 border border-zinc-200 dark:border-white/6'
                  }`}
                >
                  <span className="text-sm">{b + 1}</span>
                  <span className="text-[9px] opacity-70">{t('header.beat', { beat: '' }).trim()}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right: Upcoming next chord preview */}
        <div className="flex items-center gap-3 bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/6 px-4 py-3 rounded-xl shrink-0 transition-colors duration-200">
          <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
          <div className="flex flex-col">
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">
              {t('teleprompter.upcoming')}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-zinc-800 dark:text-zinc-200">
                {nextChordDetail.name}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {t('header.bar', { bar: ((currentBar + 1) % 8) + 1 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
