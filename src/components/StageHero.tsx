"use client";
import React from 'react';
import { RoomState, RoomTemplate, SlotInfo } from '../types/music';
import { TransportState } from '../services/audioEngine';
import { getCharacterForSlot } from '../data/characters';
import { Play, Pause } from 'lucide-react';
import { motion } from 'motion/react';

interface StageHeroProps {
  room: RoomState;
  template: RoomTemplate;
  transportState: TransportState;
  t: (key: string, params?: Record<string, string | number>) => string;
  onTogglePlay: () => void;
  onClaimSlot: (slot: SlotInfo) => void;
}

// Livehouse 舞台区:深色沉浸式(不随明暗主题切换)
// 4 位乐手站在发光地台上,顶部聚光灯,居中大播放键,浮动音符
export const StageHero: React.FC<StageHeroProps> = ({
  room,
  template,
  transportState,
  t,
  onTogglePlay,
  onClaimSlot,
}) => {
  const { isPlaying, currentBar, currentBeat, progress } = transportState;

  return (
    <div className={`relative rounded-2xl overflow-hidden select-none shadow-card-dark ${isPlaying ? 'playing' : ''}`}>
      {/* 舞台底色:深色径向渐变 */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 22%, #34221f 0%, #171317 58%, #0d0b0d 100%)' }}
      />

      {/* 顶部暖光聚光光束 */}
      <div
        className="absolute -top-10 inset-x-0 h-[420px] mx-auto w-3/4 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(255,140,60,0.30) 0%, rgba(255,120,40,0.08) 45%, transparent 75%)',
          clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
        }}
      />

      {/* 浮动音符粒子 */}
      <span className="note-particle absolute top-8 left-[8%] text-orange-400/40 text-2xl">♪</span>
      <span className="note-particle absolute top-16 right-[12%] text-amber-300/40 text-3xl" style={{ animationDelay: '1.2s' }}>♫</span>
      <span className="note-particle absolute top-24 left-[24%] text-orange-300/30 text-xl" style={{ animationDelay: '0.7s' }}>♩</span>
      <span className="note-particle absolute top-10 right-[30%] text-amber-400/25 text-lg" style={{ animationDelay: '2s' }}>♪</span>

      {/* 内容 */}
      <div className="relative z-10 px-4 sm:px-8 pt-6 pb-8 flex flex-col items-center gap-6">
        {/* 舞台标题 */}
        <div className="text-center">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-md">
            {room.title}
          </h2>
          <p className="text-[11px] sm:text-xs text-orange-200/70 mt-1 font-medium tracking-wide">
            {template.genre} · {template.key} 调 · {template.bpm} BPM
          </p>
        </div>

        {/* 4 位乐手站位(桌面横排 / 移动端 2×2) */}
        <div className="relative w-full flex items-end justify-center gap-3 sm:gap-6 md:gap-10 flex-wrap">
          {room.slots.map((slot, idx) => {
            const character = getCharacterForSlot(slot.type);
            const isHuman = slot.isCustomTake;
            return (
              <motion.div
                key={slot.id}
                whileHover={{ y: -4 }}
                onClick={() => onClaimSlot(slot)}
                className="flex flex-col items-center cursor-pointer group"
                style={{ width: 'min(160px, 42%)' }}
              >
                {/* 悬浮标签:乐器名 + 状态 */}
                <div
                  className={`mb-2 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all backdrop-blur-md shadow-lg border ${
                    isHuman
                      ? 'bg-orange-500/90 border-orange-400 text-white'
                      : 'bg-black/50 border-white/15 text-zinc-200 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-400'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isHuman ? 'bg-white' : 'bg-zinc-400'}`} />
                  <span>{t('role.' + slot.type) || slot.roleName.split(' ')[0]}</span>
                </div>

                {/* 乐手本体 */}
                <div className="musician-figure relative w-full aspect-[3/3.6] flex items-center justify-center">
                  <div
                    className="w-full h-full rounded-2xl border border-white/12 flex items-end justify-center overflow-hidden relative transition-transform group-hover:scale-[1.04]"
                    style={{
                      background: `linear-gradient(to bottom, ${character.accentColor}26, transparent 65%)`,
                    }}
                  >
                    <motion.img
                      src={character.imageUrl}
                      alt={character.name}
                      animate={
                        isPlaying && !slot.isMuted
                          ? { y: [0, -6, 0] }
                          : { y: 0 }
                      }
                      transition={{ repeat: Infinity, duration: 0.9, ease: 'easeInOut' }}
                      className={`w-full h-full object-cover object-top transition-all duration-300 ${
                        slot.isMuted ? 'opacity-30 grayscale' : ''
                      }`}
                    />

                    {/* 演奏中角色色光 */}
                    <div
                      className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none transition-opacity duration-500"
                      style={{
                        background: `linear-gradient(to top, ${character.accentColor}55, transparent)`,
                        opacity: isPlaying && !slot.isMuted ? 1 : 0,
                      }}
                    />

                    {/* 名字 */}
                    <div className="absolute bottom-2 inset-x-0 text-center">
                      <span className="text-xs font-bold text-white drop-shadow-md">
                        {character.name}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 舞台地台光 */}
        <div
          className="absolute bottom-24 w-full max-w-3xl h-24 pointer-events-none -z-0 scale-y-50 opacity-90"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,125,45,0.28) 0%, rgba(255,115,35,0.06) 50%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* 居中播放控制组 */}
        <div className="flex items-center justify-center gap-4 sm:gap-5 z-20 mt-2">
          {/* 小节进度(左) */}
          <div className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-full px-4 py-2 backdrop-blur-md">
            <span className="text-sm font-bold font-mono tabular-nums text-white">
              {currentBar + 1}<span className="text-white/40 font-medium">/8</span>
            </span>
            <span className="w-px h-4 bg-white/15" />
            <span className="text-sm font-bold font-mono tabular-nums text-orange-400">
              {Math.round(progress * 100)}%
            </span>
          </div>

          {/* 巨大橙色发光播放主键 */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.9 }}
            onClick={onTogglePlay}
            title={isPlaying ? t('header.pause') : t('header.play')}
            className="relative rounded-full p-5 sm:p-6 text-white transition-all"
            style={{
              background: isPlaying
                ? 'linear-gradient(135deg, #e11d48, #ef4444)'
                : 'linear-gradient(135deg, #f97316, #f59e0b)',
              boxShadow: isPlaying
                ? '0 0 40px rgba(244,63,94,0.65)'
                : '0 0 40px rgba(249,115,22,0.65)',
            }}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
            ) : (
              <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current translate-x-0.5" />
            )}
          </motion.button>

          {/* 状态文字(右) */}
          <div className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-full px-4 py-2 backdrop-blur-md">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-orange-400 animate-pulse' : 'bg-white/30'}`} />
            <span className="text-xs font-bold text-white">
              {isPlaying ? t('tape.play') : t('tape.stop')}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-white/40 font-medium">
          {t('slots.subtitle')}
        </p>
      </div>
    </div>
  );
};
