"use client";
import React, { useState, useRef, useEffect } from 'react';
import { RoomState, RoomTemplate } from '../types/music';
import { TransportState } from '../services/audioEngine';
import { SupportedLang, SUPPORTED_LANGS } from '../i18n/translations';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
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
  const currentLangLabel = SUPPORTED_LANGS.find((l) => l.code === lang)?.label || '简体中文';
  const currentLangShort = SUPPORTED_LANGS.find((l) => l.code === lang)?.shortLabel || '简';

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Top Bar Contract (Wordmark - Tab Switcher - Navigation - Primary Action + Theme Toggle + Language) */}
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:gap-6 px-4 sm:px-8 py-2.5 sm:py-3.5 border-b border-subtle bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 select-none transition-colors duration-200">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#ff5522] flex items-center justify-center text-white font-mono font-black text-xs shadow-md shadow-[#ff5522]/20">
            8B
          </div>
          <span className="font-display text-base font-bold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap">
            8Bars <span className="hidden sm:inline text-zinc-400 dark:text-zinc-500 text-xs font-normal">/ {t('brand.subtitle')}</span>
          </span>
        </div>

        {/* Zone 2: Segmented Main View Tabs (Studio vs Plaza) */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
          <Button
            variant={activeTab === 'studio' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onSelectTab('studio')}
            className={`rounded-lg ${activeTab === 'studio' ? 'shadow-sm' : 'text-zinc-500'}`}
          >
            <Disc3 />
            <span>{t('plaza.tabStudio')}</span>
          </Button>

          <Button
            variant={activeTab === 'plaza' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onSelectTab('plaza')}
            className={`rounded-lg relative ${activeTab !== 'plaza' ? 'text-zinc-500' : ''}`}
          >
            <Globe />
            <span>{t('plaza.tabPlaza')}</span>
            {openRoomsCount > 0 && (
              <span className={`w-2 h-2 rounded-full ${activeTab === 'plaza' ? 'bg-white' : 'bg-[#ff5522] animate-pulse'}`} />
            )}
          </Button>
        </div>

        {/* Zone 3: Language Selector + Theme Switch + Primary CTA */}
        <div className="flex items-center gap-2 shrink-0 w-full justify-end sm:w-auto">
          {/* Language Selector Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <Globe />
                <span>{currentLangShort}</span>
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SUPPORTED_LANGS.map((item) => (
                <DropdownMenuItem
                  key={item.code}
                  onClick={() => onSetLang(item.code)}
                  className={item.code === lang ? 'bg-[#ff5522]/10 text-[#ff5522]' : ''}
                >
                  <span className="flex-1">{item.label}</span>
                  {item.code === lang && <span className="text-xs text-[#ff5522]">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Light / Dark Mode Toggle */}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onToggleTheme}
            title={isDark ? t('header.themeLight') : t('header.themeDark')}
          >
            {isDark ? <Sun className="text-amber-400" /> : <Moon className="text-zinc-600" />}
          </Button>

          {/* Primary CTA */}
          <Button onClick={onOpenShareModal}>
            <Share2 />
            {t('header.recruitCard')}
          </Button>
        </div>
      </header>
    </div>
  );
};
