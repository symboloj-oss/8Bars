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
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-card dark:shadow-card-dark select-none relative overflow-hidden transition-colors duration-200">
      {/* 顶栏:循环信息 + 实时小节拍数 */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2 font-medium">
          <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#ff5522]' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
          <span className="font-bold text-zinc-900 dark:text-white">
            {t('tape.title')}
          </span>
          <span>· {bpm} BPM</span>
        </div>

        <div className="flex items-center gap-2 tabular-nums">
          <span className="bg-zinc-50 dark:bg-white/8 px-2.5 py-1 rounded-lg text-zinc-800 dark:text-zinc-100 font-bold">
            {t('header.bar', { bar: currentBar + 1 })} · {t('header.beat', { beat: currentBeat + 1 })}
          </span>
          <span className={`${isPlaying ? 'text-[#ff5522]' : 'text-zinc-400 dark:text-zinc-500'} font-bold`}>
            {isPlaying ? t('tape.play') : t('tape.stop')}
          </span>
        </div>
      </div>

      {/* 中央:8 小节磁带扫描器 */}
      <div className="relative w-full bg-zinc-50 dark:bg-black/30 rounded-xl p-3 flex flex-col gap-2">
        {/* Playhead position bar */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[#ff5522] z-20 pointer-events-none transition-all duration-75 shadow-[0_0_8px_#ff5522]"
          style={{ left: `${Math.max(0.5, Math.min(99.5, progress * 100))}%` }}
        >
          <div className="w-2.5 h-2.5 bg-[#ff5522] -ml-1 -top-1 rounded-xs absolute rotate-45" />
        </div>

        {/* 4 轨磁带条 */}
        {slots.map((slot, sIdx) => {
          const isHuman = slot.isCustomTake;
          return (
            <div key={slot.id} className="flex items-center gap-3 h-8 relative">
              {/* 轨道名 */}
              <div className="w-16 shrink-0 text-right font-mono text-[11px]">
                <span className="font-bold text-zinc-800 dark:text-zinc-300">
                  {t('role.' + slot.type) || slot.roleName.split(' ')[0]}
                </span>
              </div>

              {/* 8 小节格 */}
              <div className="flex-1 h-full grid grid-cols-8 gap-1 relative bg-white dark:bg-zinc-800/60 rounded-md p-1">
                {progression.map((chord, barIdx) => {
                  const isCurrent = isPlaying && currentBar === barIdx;
                  return (
                    <div
                      key={`bar-${sIdx}-${barIdx}`}
                      className={`h-full rounded-xs flex items-center justify-center font-mono text-[10px] transition-colors relative overflow-hidden ${
                        isCurrent
                          ? isHuman
                            ? 'bg-[#ff5522]/25 dark:bg-[#ff5522]/30 text-[#ff5522] dark:text-white font-bold'
                            : 'bg-zinc-900/10 dark:bg-white/15 text-zinc-900 dark:text-white font-bold'
                          : 'bg-zinc-50 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {/* 和弦/旋律轨显示和弦符号 */}
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

              {/* 状态 */}
              <div className="w-16 shrink-0 text-right font-mono text-[10px]">
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    isHuman
                      ? 'bg-[#ff5522]/15 text-[#ff5522] dark:text-[#ff6633] font-bold'
                      : 'bg-zinc-100 dark:bg-white/8 text-zinc-500 dark:text-zinc-400'
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
