"use client";
import React, { useState } from 'react';
import { RoomState, RoomTemplate, SlotInfo } from '../types/music';
import { ROOM_TEMPLATES } from '../data/templates';
import { TransportState } from '../services/audioEngine';
import { getCharacterForSlot } from '../data/characters';
import { BandFigure } from './BandFigures';
import { Play, Pause, Download, ChevronDown, Music2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';

// 虚拟乐队舞台(跟随明暗主题)
// 深色 = Livehouse 夜场;明亮 = 日间排练室
interface StageHeroProps {
  room: RoomState;
  template: RoomTemplate;
  transportState: TransportState;
  isDark: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  onTogglePlay: () => void;
  onSelectSlot: (slot: SlotInfo) => void;
  onSwitchTemplate: (template: RoomTemplate) => void;
  onExportWav: () => void;
  isExporting: boolean;
}

const SLOT_SHORT: Record<string, string> = {
  drums: '架子鼓',
  bass: '贝斯',
  chords: '吉他',
  melody: '主唱',
};

export const StageHero: React.FC<StageHeroProps> = ({
  room,
  template,
  transportState,
  isDark,
  t,
  onTogglePlay,
  onSelectSlot,
  onSwitchTemplate,
  onExportWav,
  isExporting,
}) => {
  const { isPlaying, currentBar, progress } = transportState;
  const [configSlot, setConfigSlot] = useState<SlotInfo | null>(null);

  // 明暗配色
  const c = {
    bg: isDark ? '#0e0b10' : '#f7f3ee',
    glow: isDark
      ? 'radial-gradient(ellipse 70% 55% at 50% 42%, rgba(255,110,50,0.10) 0%, rgba(255,90,40,0.04) 45%, transparent 75%)'
      : 'radial-gradient(ellipse 70% 55% at 50% 42%, rgba(255,120,60,0.10) 0%, rgba(255,110,50,0.05) 45%, transparent 75%)',
    title: isDark ? '#f5eef2' : '#29221f',
    sub: isDark ? '#8e858f' : '#8f8278',
    note: isDark ? 'rgba(251,146,60,0.25)' : 'rgba(234,88,12,0.35)',
    pill: isDark
      ? 'bg-white/[0.06] border-white/10 text-[#cfc7d1]'
      : 'bg-white/90 border-zinc-200/80 text-zinc-600',
    labelIdle: isDark
      ? 'bg-white/[0.06] border-white/10 text-[#cfc7d1]'
      : 'bg-white/90 border-zinc-200/80 text-zinc-600',
    dock: isDark ? 'bg-[#17121a]/90 border-white/[0.07]' : 'bg-white/85 border-zinc-200/70',
    dockChip: isDark
      ? 'bg-white/[0.05] hover:bg-white/[0.09] text-[#9b919e] hover:text-white'
      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800',
    card: isDark ? 'bg-black/30 border-white/5' : 'bg-zinc-100 border-zinc-200/70',
    cardLabel: isDark ? '#756b78' : '#9a8d84',
    cardValue: isDark ? '#e1d9e4' : '#3d352f',
    eqBox: isDark ? 'bg-black/25 border-white/5' : 'bg-zinc-100 border-zinc-200/70',
    modal: isDark ? 'bg-[#1e1720] border-white/10' : 'bg-white border-zinc-200',
    modalText: isDark ? 'text-zinc-300' : 'text-zinc-600',
    figShadow: isDark ? '' : 'drop-shadow-[0_10px_18px_rgba(60,40,20,0.28)]',
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden select-none flex flex-col" style={{ background: c.bg }}>
      {/* 中央一束暖光 */}
      <div className="absolute inset-0 pointer-events-none transition-colors duration-500" style={{ background: c.glow }} />

      {/* 浮动音符 */}
      <span className="note-particle absolute top-[22%] left-[12%] text-2xl" style={{ color: c.note }}>♪</span>
      <span className="note-particle absolute top-[30%] right-[14%] text-3xl" style={{ color: c.note, animationDelay: '1.4s' }}>♫</span>

      {/* ================= 舞台中心 ================= */}
      <main className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 min-h-0">
        {/* 房间名 */}
        <div className="text-center pt-[64px] sm:pt-[58px] pb-1 shrink-0">
          <h1 className="font-display text-xl md:text-3xl font-bold tracking-tight truncate" style={{ color: c.title }}>
            {room.title}
          </h1>
          <p className="text-[11px] sm:text-xs mt-1.5 font-normal tracking-wide" style={{ color: c.sub }}>
            {template.genre} · {template.key} 调 · {template.bpm} BPM
          </p>
        </div>

        {/* 4 位乐手 */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="w-full grid grid-cols-4 gap-2 sm:gap-8 items-end justify-items-center">
            {room.slots.map((slot) => {
              const character = getCharacterForSlot(slot.type);
              const isHuman = slot.isCustomTake;
              return (
                <div
                  key={slot.id}
                  className="flex flex-col items-center group cursor-pointer w-full"
                  onClick={() => setConfigSlot(slot)}
                >
                  {/* 乐手插画 */}
                  <div className={`relative w-full max-w-[130px] sm:max-w-[160px] aspect-[5/6] transition-transform group-hover:scale-105 ${c.figShadow}`}>
                    <motion.div
                      animate={isPlaying && !slot.isMuted ? { y: [0, -8, 0] } : { y: 0 }}
                      transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }}
                      className={`w-full h-full ${slot.isMuted ? 'grayscale opacity-40' : ''}`}
                    >
                      <BandFigure slotType={slot.type} className="w-full h-full" />
                    </motion.div>

                    {/* 演奏中:脚下角色色光晕 */}
                    <div
                      className="absolute -bottom-2 inset-x-3 h-3 rounded-full blur-md transition-opacity duration-500"
                      style={{
                        background: character.accentColor,
                        opacity: isPlaying && !slot.isMuted ? 0.55 : 0,
                      }}
                    />
                  </div>

                  {/* 名字 + 乐器标签 */}
                  <div className="mt-2.5 flex flex-col items-center gap-1">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md transition-colors ${c.labelIdle} ${
                        isHuman ? '!bg-[#ff5a36]/20 !border-[#ff5a36]/50 !text-[#ff5a36]' : ''
                      }`}
                    >
                      {SLOT_SHORT[slot.type]}
                      {isHuman && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff5a36] ml-1.5 align-middle" />}
                    </span>
                    <span className="text-xs font-bold" style={{ color: character.accentColor }}>
                      {character.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 播放控制行 */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 pb-3 shrink-0">
          {/* 进度 */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium backdrop-blur-md ${c.pill}`}>
            <span className={`font-bold font-mono tabular-nums ${isDark ? 'text-white' : 'text-zinc-800'}`}>
              {currentBar + 1}<span className={c.cardLabel}>/8</span>
            </span>
            <span className="w-px h-3.5 bg-current opacity-15" />
            <span className="font-bold font-mono tabular-nums text-[#ff6b47]">
              {Math.round(progress * 100)}%
            </span>
          </div>

          {/* 播放主键 */}
          <button
            onClick={onTogglePlay}
            title={isPlaying ? t('header.pause') : t('header.play')}
            className="p-4 rounded-full text-white flex items-center justify-center transition-all active:scale-90 hover:scale-105 shadow-[0_0_28px_rgba(255,90,54,0.45)]"
            style={{ background: 'linear-gradient(135deg, #ff471e, #ff6b47)' }}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
            ) : (
              <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current translate-x-0.5" />
            )}
          </button>

          {/* 导出 */}
          <button
            onClick={onExportWav}
            disabled={isExporting}
            title={t('header.exportWav')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium backdrop-blur-md transition active:scale-95 disabled:opacity-50 ${c.pill} ${isDark ? 'hover:bg-white/[0.1]' : 'hover:bg-white'}`}
          >
            <Download className="w-3.5 h-3.5 opacity-70" />
            <span className="hidden sm:inline">{isExporting ? t('header.exporting') : t('header.exportWav')}</span>
          </button>
        </div>

        {/* ================= 底部 Dock 控制台 ================= */}
        <div className={`w-full rounded-[24px] backdrop-blur-2xl border px-4 sm:px-6 py-3 sm:py-3.5 mb-4 sm:mb-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 shrink-0 ${c.dock}`}>
          {/* 模板 chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            {ROOM_TEMPLATES.map((tmpl) => {
              const isCurrent = tmpl.id === room.templateId;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    if (!isCurrent) {
                      onSwitchTemplate(tmpl);
                    }
                  }}
                  className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition shrink-0 ${
                    isCurrent
                      ? 'bg-gradient-to-r from-[#ff5a36] to-[#ff7347] text-white font-bold shadow-[0_2px_10px_rgba(255,90,54,0.25)]'
                      : c.dockChip
                  }`}
                >
                  <Music2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{tmpl.title.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* 调性 / 速度 / 频谱柱 */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className={`rounded-xl px-3 sm:px-4 py-1.5 min-w-[78px] sm:min-w-[90px] border ${c.card}`}>
              <div className="text-[9px] font-normal leading-tight" style={{ color: c.cardLabel }}>调性</div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs font-bold" style={{ color: c.cardValue }}>{template.key}</span>
                <ChevronDown className="w-3 h-3 ml-1.5" style={{ color: c.cardLabel }} />
              </div>
            </div>

            <div className={`rounded-xl px-3 sm:px-4 py-1.5 min-w-[78px] sm:min-w-[90px] border ${c.card}`}>
              <div className="text-[9px] font-normal leading-tight" style={{ color: c.cardLabel }}>速度</div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs font-bold" style={{ color: c.cardValue }}>
                  {template.bpm} <span className="text-[10px] font-normal" style={{ color: c.cardLabel }}>BPM</span>
                </span>
                <ChevronDown className="w-3 h-3 ml-1.5" style={{ color: c.cardLabel }} />
              </div>
            </div>

            {/* 频谱柱(播放时跳动) */}
            <div className={`hidden sm:flex items-end gap-1 h-9 px-3 py-1.5 rounded-xl border ${isPlaying ? 'playing' : ''} ${c.eqBox}`}>
              <span className="eq-bar w-1 rounded-full bg-[#ff5a36] h-2" />
              <span className="eq-bar w-1 rounded-full bg-[#ff6e3b] h-5" style={{ animationDelay: '0.1s' }} />
              <span className="eq-bar w-1 rounded-full bg-[#ff8642] h-4" style={{ animationDelay: '0.25s' }} />
              <span className="eq-bar w-1 rounded-full bg-[#c9b8c0] h-2.5" style={{ animationDelay: '0.15s' }} />
              <span className="eq-bar w-1 rounded-full bg-[#b3a2ab] h-6" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        </div>
      </main>

      {/* ================= 乐器配置弹窗 ================= */}
      {configSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfigSlot(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className={`relative w-full max-w-sm border rounded-3xl p-6 shadow-2xl ${c.modal}`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-800'}`}>
                {SLOT_SHORT[configSlot.type]} · {getCharacterForSlot(configSlot.type).name}
              </h3>
              <button
                onClick={() => setConfigSlot(null)}
                className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-800'}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${isDark ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
                <span className={c.modalText}>当前演奏者</span>
                <span className="text-[#ff5a36] font-medium">
                  {configSlot.musician.name.split(' ')[0]}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#ff5a36]/10 border border-[#ff5a36]/20 text-[11px] text-[#ff8e73] leading-relaxed">
                {t('studio.headphoneDesc')}
              </div>
            </div>

            <Button
              className="w-full py-2.5 rounded-2xl bg-[#ff5a36] hover:bg-[#ff6e4d] text-white font-bold text-xs shadow-lg"
              onClick={() => {
                const slot = configSlot;
                setConfigSlot(null);
                onSelectSlot(slot);
              }}
            >
              {t('slots.claim')}
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
