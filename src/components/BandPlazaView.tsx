"use client";
import React, { useState } from 'react';
import { CommunityRoom } from '../types/community';
import { SlotType } from '../types/music';
import { audioEngine } from '../services/audioEngine';
import { getCharacterForSlot } from '../data/characters';
import {
  Users,
  Sparkles,
  Play,
  Pause,
  MessageCircle,
  Check,
  Heart,
  Share2,
  Plus,
  ArrowRight,
  Disc3,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { toggleLikeRoom } from '../lib/api/rooms';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface BandPlazaViewProps {
  rooms: CommunityRoom[];
  currentRoomId: string;
  onSelectRoom: (room: CommunityRoom) => void;
  onOpenPublishModal?: () => void;
  onOpenCreateModal?: () => void;
  loading?: boolean;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

type FilterCategory = 'all' | 'bass' | 'melody' | 'chords' | 'drums' | 'complete';

// 缺位展示用短名
const SLOT_SHORT: Record<string, string> = {
  drums: '架子鼓',
  bass: '贝斯',
  chords: '吉他',
  melody: '主唱',
};

export const BandPlazaView: React.FC<BandPlazaViewProps> = ({
  rooms,
  currentRoomId,
  onSelectRoom,
  onOpenPublishModal,
  onOpenCreateModal,
  loading = false,
  t = (k) => k,
}) => {
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likesMap, setLikesMap] = useState<Record<string, number>>({});
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  // Filter logic
  const filteredRooms = rooms.filter((room) => {
    if (filter === 'all') return true;
    if (filter === 'complete') return room.humanSlotsCount === 4;
    return room.vacantRoles.includes(filter as SlotType);
  });

  const handleCopyContact = (id: string, contact: string) => {
    navigator.clipboard.writeText(contact);
    setCopiedId(id);
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.6 },
    });
    setTimeout(() => {
      setCopiedId((cur) => (cur === id ? null : cur));
    }, 2000);
  };

  // 点赞:乐观更新 + 服务端 RPC(原子计数/去重),失败回滚
  const handleApplaud = async (id: string, currentCount: number) => {
    setLikesMap((prev) => ({
      ...prev,
      [id]: (prev[id] ?? currentCount) + 1,
    }));
    confetti({
      particleCount: 25,
      spread: 45,
      origin: { y: 0.8 },
    });
    try {
      const { likesCount } = await toggleLikeRoom(id);
      setLikesMap((prev) => ({ ...prev, [id]: likesCount }));
    } catch (e) {
      console.warn('点赞失败', e);
      setLikesMap((prev) => ({ ...prev, [id]: currentCount }));
    }
  };

  const handleToggleAudioPreview = async (room: CommunityRoom) => {
    if (previewingId === room.id) {
      audioEngine.stop();
      setPreviewingId(null);
    } else {
      audioEngine.stop();
      setPreviewingId(room.id);
      // Play chord preview
      await audioEngine.previewChord(['C4', 'E4', 'G4', 'B4']);
      setTimeout(() => {
        setPreviewingId((cur) => (cur === room.id ? null : cur));
      }, 1800);
    }
  };

  const vacantRoomsCount = rooms.filter((r) => r.humanSlotsCount < 4).length;

  return (
    <div className="w-full flex flex-col gap-6 max-w-7xl mx-auto px-4 sm:px-8 select-none">
      {/* Community Hero Banner */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-card dark:shadow-card-dark transition-colors duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge className="rounded-full bg-[#ff5522]/10 text-[#ff5522] hover:bg-[#ff5522]/10 border-transparent px-2.5 py-0.5 gap-1">
                <Sparkles className="w-3 h-3" />
                {t('plaza.badgeNeedMusicians', { count: vacantRoomsCount })}
              </Badge>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {t('plaza.title')}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {t('plaza.subtitle')}
            </p>
          </div>

          {/* 入口按钮:创建乐队 / 发布到广场 */}
          <div className="shrink-0 flex items-center gap-2.5 flex-wrap">
            <Button onClick={onOpenCreateModal} size="lg" className="rounded-xl">
              <Plus />
              {t('header.newRoom')}
            </Button>
            {onOpenPublishModal && (
              <Button variant="secondary" onClick={onOpenPublishModal} size="lg" className="rounded-xl">
                {t('plaza.publishMyRoom')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filter:YouTube 风格 chips(圆角胶囊 32px,选中高对比,未选中浅灰细边) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        {[
          { value: 'all', label: t('plaza.filterAll', { count: rooms.length }) },
          { value: 'bass', label: t('plaza.filterBass') },
          { value: 'melody', label: t('plaza.filterMelody') },
          { value: 'chords', label: t('plaza.filterChords') },
          { value: 'drums', label: t('plaza.filterDrums') },
          { value: 'complete', label: t('plaza.filterComplete') },
        ].map((item) => {
          const isSelected = filter === item.value;
          return (
            <button
              key={item.value}
              onClick={() => setFilter(item.value as FilterCategory)}
              aria-pressed={isSelected}
              className={`h-8 shrink-0 whitespace-nowrap rounded-full border px-4 text-[13px] font-medium transition-colors ${
                isSelected
                  ? 'border-[#ff5522]/35 bg-[#ff5522]/10 font-semibold text-[#ff5522] dark:border-[#ff5522]/45 dark:bg-[#ff5522]/15 dark:text-[#ff8a5c]'
                  : 'border-zinc-200 bg-zinc-100/70 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-300 dark:hover:bg-white/12 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Community Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading && (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={`skeleton-${i}`}
                className="rounded-2xl bg-white dark:bg-zinc-900 p-5 flex flex-col gap-4"
              >
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
              </div>
            ))}
          </>
        )}

        {!loading && filteredRooms.map((commRoom) => {
          const isCurrentActive = commRoom.id === currentRoomId;
          const displayLikes = likesMap[commRoom.id] ?? commRoom.likesCount;
          const isCopied = copiedId === commRoom.id;
          const isPreviewing = previewingId === commRoom.id;

          return (
            <motion.div
              key={commRoom.id}
              whileHover={{ y: -3 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`rounded-2xl bg-white dark:bg-zinc-900 p-5 flex flex-col justify-between gap-4 shadow-card dark:shadow-card-dark transition-all duration-200 ring-1 ring-transparent hover:ring-[#ff5522]/25 hover:shadow-raise ${
                isCurrentActive
                  ? 'bg-orange-50/60 dark:bg-zinc-900'
                  : ''
              }`}
            >
              {/* 卡片信息区(精简):类型/速度/真人比例 → 标题 → 创建者 → 缺位 → 招募语 */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-white/8 text-zinc-700 dark:text-zinc-300">
                      {commRoom.genre}
                    </span>
                    <span className="text-[10px] font-mono text-[#ff5522] font-bold">
                      {commRoom.bpm} BPM
                    </span>
                  </div>

                  {/* 真人比例徽章 */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      commRoom.humanSlotsCount === 4
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-[#ff5522]/10 text-[#ff5522]'
                    }`}
                  >
                    {t('plaza.slotsRatio', { human: commRoom.humanSlotsCount })}
                  </span>
                </div>

                {/* 房间标题 */}
                <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                  {commRoom.title}
                </h3>

                {/* 创建者 + 缺位信息(一行) */}
                <div className="flex items-center justify-between gap-2 text-xs mt-1">
                  <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 truncate">
                    <span>{commRoom.creatorAvatar}</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {commRoom.creatorName}
                    </span>
                  </span>
                  {commRoom.vacantRoles.length > 0 && (
                    <span className="text-[11px] text-[#ff5522] font-medium shrink-0">
                      {t('plaza.vacant', {
                        roles: commRoom.vacantRoles
                          .map((r) => SLOT_SHORT[r] || r)
                          .join(' · '),
                      })}
                    </span>
                  )}
                </div>

                {/* 招募语(一行截断) */}
                <p className="mt-2.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                  {commRoom.recruitmentCall}
                </p>
              </div>

              {/* 底部操作行 */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-subtle">
                <div className="flex items-center gap-1.5">
                  {/* 点赞 */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleApplaud(commRoom.id, commRoom.likesCount)}
                      >
                        <Heart className="text-[#ff5522]" />
                        <span className="tabular-nums">{displayLikes}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('plaza.applaud')}</TooltipContent>
                  </Tooltip>

                  {/* 试听 */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        onClick={() => handleToggleAudioPreview(commRoom)}
                      >
                        {isPreviewing ? (
                          <Pause className="text-[#ff5522]" />
                        ) : (
                          <Play className="ml-0.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isPreviewing ? t('header.pause') : t('cheatsheet.preview')}</TooltipContent>
                  </Tooltip>

                  {/* 复制联系方式 */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        onClick={() => handleCopyContact(commRoom.id, commRoom.contactInfo)}
                      >
                        {isCopied ? (
                          <Check className="text-emerald-500" />
                        ) : (
                          <MessageCircle className="text-[#ff5522]" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px]">
                      {isCopied ? t('plaza.copiedContact') : commRoom.contactInfo}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* 进入乐队 */}
                <Button
                  size="sm"
                  onClick={() => onSelectRoom(commRoom)}
                  className={isCurrentActive ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : ''}
                >
                  <span>{isCurrentActive ? '当前正在合奏' : t('plaza.joinJam')}</span>
                  <ArrowRight />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
