"use client";
import React, { useState, useRef, useEffect } from 'react';
import { RoomState, RoomTemplate } from '../types/music';
import { TransportState } from '../services/audioEngine';
import { SupportedLang, SUPPORTED_LANGS } from '../i18n/translations';
import {
  Play,
  Pause,
  Share2,
  Download,
  Plus,
  Sun,
  Moon,
  Globe,
  ChevronDown,
  Disc3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RoomHeaderProps {
  room: RoomState;
  template: RoomTemplate;
  transportState: TransportState;
  isDark: boolean;
  lang: SupportedLang;
  onSetLang: (lang: SupportedLang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  onToggleTheme: () => void;
  onTogglePlay: () => void;
  onOpenShareModal: () => void;
  onOpenCreateModal: () => void;
  onExportWav: () => void;
  isExporting: boolean;
  activeTab: 'studio' | 'plaza';
  onSelectTab: (tab: 'studio' | 'plaza') => void;
  openRoomsCount?: number;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  room,
  template,
  transportState,
  isDark,
  lang,
  onSetLang,
  t,
  onToggleTheme,
  onTogglePlay,
  onOpenShareModal,
  onOpenCreateModal,
  onExportWav,
  isExporting,
  activeTab,
  onSelectTab,
  openRoomsCount = 0,
}) => {
  const humanTakeCount = room.slots.filter((s) => s.isCustomTake).length;
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Close language dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLangLabel = SUPPORTED_LANGS.find((l) => l.code === lang)?.label || '简体中文';
  const currentLangShort = SUPPORTED_LANGS.find((l) => l.code === lang)?.shortLabel || '简';

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Top Bar Contract (Wordmark - Tab Switcher - Navigation - Primary Action + Theme Toggle + Language) */}
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:gap-6 px-4 sm:px-8 py-2.5 sm:py-3.5 border-b border-subtle bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 select-none transition-colors duration-200">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <motion.div
            whileHover={{ rotate: 8, scale: 1.05 }}
            className="w-7 h-7 rounded-lg bg-[#ff5522] flex items-center justify-center text-white font-mono font-black text-xs shadow-md shadow-[#ff5522]/20"
          >
            8B
          </motion.div>
          <span className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap">
            8Bars <span className="hidden sm:inline text-zinc-400 dark:text-zinc-500 font-mono text-xs font-normal">/ {t('brand.subtitle')}</span>
          </span>
        </div>

        {/* Zone 2: Segmented Main View Tabs (Studio vs Plaza) */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-subtle text-xs">
          <button
            onClick={() => onSelectTab('studio')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'studio'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>{t('plaza.tabStudio')}</span>
          </button>

          <button
            onClick={() => onSelectTab('plaza')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 relative ${
              activeTab === 'plaza'
                ? 'bg-[#ff5522] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t('plaza.tabPlaza')}</span>
            {openRoomsCount > 0 && (
              <span className={`w-2 h-2 rounded-full ${activeTab === 'plaza' ? 'bg-white' : 'bg-[#ff5522] animate-pulse'}`} />
            )}
          </button>
        </div>

        {/* Zone 3: Language Selector + Theme Switch + Primary CTA */}
        <div className="flex items-center gap-2 shrink-0 w-full justify-end sm:w-auto">
          {/* Language Selector Dropdown */}
          <div className="relative" ref={langMenuRef}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsLangMenuOpen((v) => !v)}
              className="btn-secondary py-1.5 px-2.5 text-xs"
            >
              <Globe className="w-3.5 h-3.5 text-zinc-400" />
              <span>{currentLangShort}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </motion.button>

            <AnimatePresence>
              {isLangMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-32 bg-white dark:bg-zinc-900 border border-subtle rounded-xl shadow-raise py-1 z-50 overflow-hidden text-xs"
                >
                  {SUPPORTED_LANGS.map((item) => {
                    const isSelected = item.code === lang;
                    return (
                      <button
                        key={item.code}
                        onClick={() => {
                          onSetLang(item.code);
                          setIsLangMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-[#ff5522]/10 text-[#ff5522] font-semibold'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/6'
                        }`}
                      >
                        <span>{item.label}</span>
                        {isSelected && <span className="text-[10px] text-[#ff5522]">✓</span>}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Light / Dark Mode Toggle */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onToggleTheme}
            title={isDark ? t('header.themeLight') : t('header.themeDark')}
            className="btn-secondary p-2"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-600" />
            )}
          </motion.button>

          {/* Primary CTA */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={onOpenShareModal}
            className="btn-primary"
          >
            <Share2 className="w-3.5 h-3.5" />
            {t('header.recruitCard')}
          </motion.button>
        </div>
      </header>

      {/* Main Room Console Hero Card (Only displayed in Studio mode) */}
      {activeTab === 'studio' && (
        <div className="px-4 sm:px-8 w-full max-w-7xl mx-auto">
          <div className="relative rounded-2xl border border-subtle bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-card dark:shadow-card-dark flex flex-col md:flex-row items-stretch justify-between gap-6 overflow-hidden transition-colors duration-200">
            {/* Left: Song Meta & Transport Actions */}
          <div className="flex flex-col justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-2">
                <span className="px-1.5 py-0.5 rounded-md bg-[#ff5522]/10 text-[#ff5522] text-[10px] font-bold border border-[#ff5522]/20">
                  {t('header.studioLabel')}
                </span>
                <span className="text-zinc-300 dark:text-zinc-600">/</span>
                <span>{template.key} 调</span>
                <span className="text-zinc-300 dark:text-zinc-600">/</span>
                <span>{t('header.loopLen')}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                {room.title}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-xl leading-relaxed">
                {template.tagline} {t('header.tagline')}
              </p>
            </div>

            {/* Master Transport & Big Play Button */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={onTogglePlay}
                className={`py-3 px-6 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all ${
                  transportState.isPlaying
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                    : 'btn-primary'
                }`}
              >
                {transportState.isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    {t('header.pause')}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    {t('header.play')}
                  </>
                )}
              </motion.button>

              {/* Bar and Beat Realtime Status Indicator */}
              <div className="bg-zinc-50 dark:bg-black/30 border border-subtle rounded-xl px-4 py-2 flex items-center gap-3 font-mono text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{t('header.position')}</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-200 tabular-nums">
                    {t('header.bar', { bar: transportState.currentBar + 1 })} · {t('header.beat', { beat: transportState.currentBeat + 1 })}
                  </span>
                </div>
                <div className="h-6 w-px bg-zinc-200 dark:bg-white/8" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{t('header.cycle')}</span>
                  <span className="text-sm font-bold text-[#ff5522] tabular-nums">
                    {Math.round(transportState.progress * 100)}%
                  </span>
                </div>
              </div>

              {/* Utility actions */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onExportWav}
                disabled={isExporting}
                title={t('header.exportWav')}
                className="btn-secondary py-2.5 px-3.5"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                {isExporting ? t('header.exporting') : t('header.exportWav')}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onOpenCreateModal}
                className="btn-secondary py-2.5 px-3.5"
              >
                <Plus className="w-3.5 h-3.5 text-zinc-400" />
                {t('header.newRoom')}
              </motion.button>
            </div>
          </div>

          {/* Right: 8-Bar Chord Sequence display */}
          <div className="flex flex-col justify-between bg-zinc-50 dark:bg-black/30 p-4 rounded-xl border border-subtle md:w-80 shrink-0 transition-colors duration-200">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-zinc-800 dark:text-zinc-300 font-semibold">{t('header.progression')}</span>
              <span className="text-[#ff5522] font-semibold">
                {template.progression.slice(0, 4).join('-')}
              </span>
            </div>

            {/* 8-bar minimal blocks with spring animation */}
            <div className="grid grid-cols-4 gap-1.5 my-2">
              {template.progression.map((chordName, idx) => {
                const isActive = transportState.isPlaying && transportState.currentBar === idx;
                return (
                  <motion.div
                    key={`header-chord-${idx}`}
                    animate={isActive ? { scale: 1.05 } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`py-2 px-1 rounded-lg text-center font-mono text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-[#ff5522] text-white shadow-primary'
                        : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-subtle'
                    }`}
                  >
                    <div className="text-[9px] opacity-50">#{idx + 1}</div>
                    {chordName}
                  </motion.div>
                );
              })}
            </div>

            {/* Cold-start info strip */}
            <div className="mt-2 pt-2 border-t border-subtle flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>{t('header.aiActive')}</span>
              <span className="text-zinc-700 dark:text-zinc-400 tabular-nums">
                {room.slots.filter((s) => s.isCustomTake).length}/4
              </span>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
