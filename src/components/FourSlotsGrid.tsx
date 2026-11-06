"use client";
import React from 'react';
import { SlotInfo, SlotType } from '../types/music';
import { getCharacterForSlot } from '../data/characters';
import { audioEngine } from '../services/audioEngine';
import {
  Mic,
  Volume2,
  Bot,
  User,
  GitBranch,
  Music,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

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

// 乐队席位卡:每个人物像乐队成员一样"站在台上"
// 人物主视觉 + 演奏状态律动 + 底部光条 + 认领按钮
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
      {slots.map((slot) => {
        const isHuman = slot.isCustomTake;
        const meter = meterLevels[slot.type] || 0;
        const character = getCharacterForSlot(slot.type);

        return (
          <motion.div
            key={slot.id}
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative rounded-2xl overflow-hidden select-none shadow-card dark:shadow-card-dark transition-colors duration-150 flex flex-col"
          >
            {/* 人物主视觉(舞台位) */}
            <div className="relative aspect-[4/4.4] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-950">
              <motion.img
                src={character.imageUrl}
                alt={character.name}
                animate={
                  isPlaying && !slot.isMuted
                    ? { scale: [1, 1.03, 1], y: [0, -4, 0] }
                    : { scale: 1, y: 0 }
                }
                transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
                className={`w-full h-full object-cover object-top transition-all duration-300 ${
                  slot.isMuted ? 'opacity-30 grayscale' : 'opacity-100'
                }`}
              />

              {/* 舞台聚光:播放时点亮,颜色取角色 accent */}
              <div
                className="absolute inset-x-0 bottom-0 h-2/5 pointer-events-none transition-opacity duration-500"
                style={{
                  background: `linear-gradient(to top, ${character.accentColor}30, transparent)`,
                  opacity: isPlaying && !slot.isMuted ? 1 : 0.15,
                }}
              />

              {/* 状态徽章(左上) */}
              <div className="absolute top-2.5 left-2.5">
                <Badge
                  variant={isHuman ? 'default' : 'secondary'}
                  className={`text-[10px] px-2 py-0.5 rounded-full gap-1 backdrop-blur-md ${
                    isHuman
                      ? 'bg-[#ff5522] text-white hover:bg-[#ff5522] font-bold border-transparent shadow-sm'
                      : 'bg-white/85 dark:bg-black/60 text-zinc-500 dark:text-zinc-300 font-medium border-transparent'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isHuman ? 'bg-white' : 'bg-zinc-400 dark:bg-zinc-400'}`} />
                  {isHuman ? t('slots.taken') : t('slots.aiSession')}
                </Badge>
              </div>

              {/* 试听按钮(右上) */}
              <Button
                variant="secondary"
                size="icon-sm"
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
                title={`试听 ${character.name} 的演奏`}
                className="absolute top-2.5 right-2.5 bg-white/85 dark:bg-black/60 backdrop-blur-md border-transparent hover:bg-white dark:hover:bg-black/75 shadow-sm"
              >
                <Music />
              </Button>

              {/* 名字与人设(左下) */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2 pointer-events-none">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-white drop-shadow-md leading-none">
                    {character.name}
                  </span>
                  <span className="text-[10px] text-white/85 drop-shadow-sm">
                    {t('role.' + slot.type) || slot.roleName}
                  </span>
                </div>
                {/* 演奏中光条 */}
                {isPlaying && !slot.isMuted && (
                  <motion.span
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ repeat: Infinity, duration: 1.1 }}
                    className="text-[10px] font-bold text-white bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded-full"
                  >
                    ♪
                  </motion.span>
                )}
              </div>
            </div>

            {/* 信息区 */}
            <div className="bg-white dark:bg-zinc-900 p-3.5 flex flex-col gap-2.5 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1.5">
                  {isHuman ? (
                    <User className="w-3.5 h-3.5 text-[#ff5522] shrink-0" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                  )}
                  {slot.musician.name}
                </span>
                {/* 版本切换(仅多版本时) */}
                {slot.takes && slot.takes.length > 1 && (
                  <div className="flex items-center gap-1">
                    {slot.takes.map((take, tIdx) => {
                      const isActive = slot.activeTakeIndex === tIdx;
                      return (
                        <button
                          key={take.id}
                          onClick={() => onSelectTake && onSelectTake(slot.type, tIdx)}
                          title={take.title}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            isActive ? 'bg-[#ff5522]' : 'bg-zinc-200 dark:bg-white/15 hover:bg-zinc-300 dark:hover:bg-white/30'
                          }`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* VU 光条 + 混音行 */}
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 bg-zinc-100 dark:bg-black/50 rounded-full overflow-hidden">
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

                {/* M / S 轻量开关 */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => onToggleMute(slot.type)}
                    title={t('slots.mute')}
                    className={`w-6 h-6 rounded-full text-[10px] font-bold transition-colors flex items-center justify-center ${
                      slot.isMuted
                        ? 'bg-rose-500 text-white'
                        : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/8'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => onToggleSolo(slot.type)}
                    title={t('slots.solo')}
                    className={`w-6 h-6 rounded-full text-[10px] font-bold transition-colors flex items-center justify-center ${
                      slot.isSolo
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-black'
                        : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/8'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>

              {/* 音量滑杆(轻量) */}
              <div className="flex items-center gap-2">
                <Volume2 className="w-3 h-3 text-zinc-400 dark:text-zinc-500 shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={slot.volume}
                  onChange={(e) => onVolumeChange(slot.type, Number(e.target.value))}
                  className="w-full h-1 accent-[#ff5522] cursor-pointer"
                />
              </div>

              {/* 认领/重录按钮 */}
              <Button
                variant={isHuman ? 'secondary' : 'default'}
                onClick={() => onClaimSlot(slot)}
                className="w-full mt-1"
              >
                <Mic />
                {isHuman ? t('slots.fork') : t('slots.claim')}
              </Button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
