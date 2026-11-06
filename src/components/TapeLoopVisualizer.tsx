"use client";
import React from 'react';
import { SlotInfo } from '../types/music';
import { TransportState } from '../services/audioEngine';
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
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-5 sm:p-6 flex flex-col gap-5 shadow-card dark:shadow-card-dark select-none relative overflow-hidden transition-colors duration-200">
      {/* 顶栏:循环标题 + 实时小节拍数 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#ff5522] animate-pulse' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
          <h3 className="font-display text-base font-bold tracking-tight text-zinc-900 dark:text-white">
            {t('tape.title')}
          </h3>
          <span className="text-xs font-mono font-medium text-zinc-400 dark:text-zinc-500">
            {bpm} BPM
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold font-mono tabular-nums text-zinc-900 dark:text-white bg-zinc-50 dark:bg-white/8 px-3 py-1.5 rounded-lg">
            {currentBar + 1}<span className="text-zinc-400 font-medium"> / {progression.length}</span>
          </span>
          <span className={`text-xs font-bold ${isPlaying ? 'text-[#ff5522]' : 'text-zinc-400 dark:text-zinc-500'}`}>
            {isPlaying ? t('tape.play') : t('tape.stop')}
          </span>
        </div>
      </div>

      {/* 中央:8 小节磁带扫描器 */}
      <div className="relative w-full bg-zinc-50 dark:bg-black/30 rounded-xl p-4 flex flex-col gap-2.5">
        {/* Playhead position bar */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[#ff5522] z-20 pointer-events-none transition-all duration-75 shadow-[0_0_10px_#ff5522]"
          style={{ left: `${Math.max(0.5, Math.min(99.5, progress * 100))}%` }}
        >
          <div className="w-3 h-3 bg-[#ff5522] -ml-1.25 -top-1 rounded-full absolute" />
        </div>

        {/* 4 轨磁带条 */}
        {slots.map((slot, sIdx) => {
          const isHuman = slot.isCustomTake;
          return (
            <div key={slot.id} className="flex items-center gap-3 h-11 relative">
              {/* 轨道名 */}
              <div className="w-16 shrink-0 text-right">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {t('role.' + slot.type) || slot.roleName.split(' ')[0]}
                </span>
              </div>

              {/* 8 小节格 */}
              <div className="flex-1 h-full grid grid-cols-8 gap-1.5 relative bg-white dark:bg-zinc-800/60 rounded-lg p-1">
                {progression.map((chord, barIdx) => {
                  const isCurrent = isPlaying && currentBar === barIdx;
                  return (
                    <div
                      key={`bar-${sIdx}-${barIdx}`}
                      className={`h-full rounded-md flex items-center justify-center transition-colors relative overflow-hidden ${
                        isCurrent
                          ? isHuman
                            ? 'bg-[#ff5522]/20 dark:bg-[#ff5522]/25 text-[#ff5522] dark:text-white font-bold'
                            : 'bg-zinc-900/8 dark:bg-white/15 text-zinc-900 dark:text-white font-bold'
                          : 'bg-zinc-50 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {/* 和弦/旋律轨显示和弦名,鼓/贝斯显示节奏点 */}
                      {sIdx === 2 || sIdx === 3 ? (
                        <span className={`font-mono ${isCurrent ? 'text-[11px]' : 'text-[10px]'}`}>{chord}</span>
                      ) : (
                        <div className="flex gap-0.5 opacity-50">
                          <span className="w-1 h-1 rounded-full bg-current" />
                          <span className="w-1 h-1 rounded-full bg-current" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 状态 */}
              <div className="w-14 shrink-0 text-right">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isHuman
                      ? 'bg-[#ff5522]/15 text-[#ff5522] dark:text-[#ff6633]'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {isHuman ? t('tape.human') : t('tape.aiStem')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
