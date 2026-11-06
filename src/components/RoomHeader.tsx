"use client";
import React from 'react';
import { SupportedLang, SUPPORTED_LANGS } from '../i18n/translations';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Sun,
  Moon,
  Globe,
  ChevronDown,
  ArrowLeft,
  AudioWaveform,
} from 'lucide-react';

interface RoomHeaderProps {
  isDark: boolean;
  lang: SupportedLang;
  onSetLang: (lang: SupportedLang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  onToggleTheme: () => void;
  onBackToPlaza: () => void;
  // 页面形态:home = 广场首页,stage = 房间舞台(悬浮)
  variant: 'home' | 'stage';
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  isDark,
  lang,
  onSetLang,
  t,
  onToggleTheme,
  onBackToPlaza,
  variant,
}) => {
  const currentLangShort = SUPPORTED_LANGS.find((l) => l.code === lang)?.shortLabel || '简';
  const isStage = variant === 'stage';

  // 文字/控件颜色统一跟随明暗(舞台悬浮在明/暗背景上,首页同理)
  const c = {
    brand: isDark ? 'text-white' : 'text-zinc-900',
    sub: isDark ? 'text-white/45' : 'text-zinc-400',
    divider: isDark ? 'bg-white/15' : 'bg-zinc-200',
    ghostBtn: isDark
      ? 'text-zinc-300 hover:text-white hover:bg-white/10'
      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-900/5',
    logoBox: isDark ? 'bg-white/10' : 'bg-[#ff5522]',
    logoIcon: isDark ? 'text-[#ff8a5c]' : 'text-white',
    // 液态玻璃:强模糊 + 半透明 + 亮边 + 顶部内高光
    headerBg: isDark ? 'bg-zinc-950/40' : 'bg-white/55',
    headerBorder: isDark ? 'border-white/10' : 'border-black/[0.06]',
    headerHighlight: isDark
      ? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
      : 'shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]',
  };

  return (
    <header
      className={`relative z-40 select-none transition-colors duration-200 backdrop-blur-xl border-b ${c.headerBg} ${c.headerBorder} ${c.headerHighlight} ${
        isStage ? '' : 'sticky top-0'
      }`}
    >
      {/* 内容与页面主体对齐(max-w-7xl) */}
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 sm:px-8 py-2.5 sm:py-3">
        {/* 左:返回(舞台模式)+ 品牌 */}
        <div className="flex items-center gap-2 shrink-0">
          {isStage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToPlaza}
              title={t('plaza.tabPlaza')}
              className={`${c.ghostBtn} -ml-2`}
            >
              <ArrowLeft />
              <span className="hidden sm:inline">{t('plaza.tabPlaza')}</span>
            </Button>
          )}

          <button
            onClick={onBackToPlaza}
            className="flex items-center gap-2.5 cursor-pointer group"
            title={t('brand.subtitle')}
          >
            {/* 品牌图标:深色底白橙波形 / 浅色纯橙底白波形 */}
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${c.logoBox}`}
            >
              <AudioWaveform className={`w-4.5 h-4.5 ${c.logoIcon}`} strokeWidth={2.5} />
            </div>
            <span className={`font-display text-lg font-bold tracking-tight whitespace-nowrap ${c.brand}`}>
              8Bars
            </span>
            <span className={`hidden sm:block w-px h-4 mx-0.5 ${c.divider}`} />
            <span className={`hidden sm:inline text-xs font-medium ${c.sub}`}>
              {t('brand.subtitle')}
            </span>
          </button>
        </div>

        {/* 右:语言 + 主题 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`text-xs ${c.ghostBtn}`}
              >
                <Globe className="opacity-70" />
                <span>{currentLangShort}</span>
                <ChevronDown className="opacity-40" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              {SUPPORTED_LANGS.map((item) => (
                <DropdownMenuItem
                  key={item.code}
                  onClick={() => onSetLang(item.code)}
                  className={item.code === lang ? 'bg-[#ff5522]/10 text-[#ff5522]' : ''}
                >
                  <span className="flex-1 whitespace-nowrap">{item.label}</span>
                  {item.code === lang && <span className="text-xs text-[#ff5522]">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleTheme}
            title={isDark ? t('header.themeLight') : t('header.themeDark')}
            className={c.ghostBtn}
            data-theme-toggle
          >
            {isDark ? <Sun className="text-amber-400" /> : <Moon className="text-zinc-600" />}
          </Button>
        </div>
      </div>
    </header>
  );
};
