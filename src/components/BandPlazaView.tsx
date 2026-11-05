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

interface BandPlazaViewProps {
  rooms: CommunityRoom[];
  currentRoomId: string;
  onSelectRoom: (room: CommunityRoom) => void;
  onOpenPublishModal: () => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

type FilterCategory = 'all' | 'bass' | 'melody' | 'chords' | 'drums' | 'complete';

export const BandPlazaView: React.FC<BandPlazaViewProps> = ({
  rooms,
  currentRoomId,
  onSelectRoom,
  onOpenPublishModal,
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

  const handleApplaud = (id: string, currentCount: number) => {
    setLikesMap((prev) => ({
      ...prev,
      [id]: (prev[id] ?? currentCount) + 1,
    }));
    confetti({
      particleCount: 25,
      spread: 45,
      origin: { y: 0.8 },
    });
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
      <div className="relative rounded-3xl border border-zinc-200/90 dark:border-white/8 bg-gradient-to-br from-white dark:from-[#121215] via-zinc-50 dark:via-[#16161b] to-orange-50/40 dark:to-[#220d06] p-6 sm:p-8 shadow-sm dark:shadow-2xl overflow-hidden transition-colors duration-200">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#ff5522]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ff5522]/15 text-[#ff5522] text-[11px] font-mono font-bold border border-[#ff5522]/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {t('plaza.badgeNeedMusicians', { count: vacantRoomsCount })}
              </span>
              <span className="text-xs font-mono text-zinc-400">·</span>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                8BARS COMMUNITY LOUNGE
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              {t('plaza.title')}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
              {t('plaza.subtitle')}
            </p>
          </div>

          {/* Action button: Publish my current room to plaza */}
          <div className="shrink-0 flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={onOpenPublishModal}
              className="py-3 px-5 rounded-2xl bg-[#ff5522] hover:bg-[#ff4410] text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-[#ff5522]/25 font-mono whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {t('plaza.publishMyRoom')}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors shadow-2xs ${
            filter === 'all'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-xs'
              : 'bg-white dark:bg-[#141418] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/6 hover:border-zinc-300 dark:hover:border-white/12'
          }`}
        >
          {t('plaza.filterAll', { count: rooms.length })}
        </button>

        <button
          onClick={() => setFilter('bass')}
          className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors shadow-2xs ${
            filter === 'bass'
              ? 'bg-[#ff5522] text-white shadow-xs'
              : 'bg-white dark:bg-[#141418] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/6 hover:border-zinc-300 dark:hover:border-white/12'
          }`}
        >
          {t('plaza.filterBass')}
        </button>

        <button
          onClick={() => setFilter('melody')}
          className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors shadow-2xs ${
            filter === 'melody'
              ? 'bg-[#ff5522] text-white shadow-xs'
              : 'bg-white dark:bg-[#141418] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/6 hover:border-zinc-300 dark:hover:border-white/12'
          }`}
        >
          {t('plaza.filterMelody')}
        </button>

        <button
          onClick={() => setFilter('chords')}
          className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors shadow-2xs ${
            filter === 'chords'
              ? 'bg-[#ff5522] text-white shadow-xs'
              : 'bg-white dark:bg-[#141418] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/6 hover:border-zinc-300 dark:hover:border-white/12'
          }`}
        >
          {t('plaza.filterChords')}
        </button>

        <button
          onClick={() => setFilter('drums')}
          className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors shadow-2xs ${
            filter === 'drums'
              ? 'bg-[#ff5522] text-white shadow-xs'
              : 'bg-white dark:bg-[#141418] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/6 hover:border-zinc-300 dark:hover:border-white/12'
          }`}
        >
          {t('plaza.filterDrums')}
        </button>

        <button
          onClick={() => setFilter('complete')}
          className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors shadow-2xs ${
            filter === 'complete'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white dark:bg-[#141418] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/6 hover:border-zinc-300 dark:hover:border-white/12'
          }`}
        >
          {t('plaza.filterComplete')}
        </button>
      </div>

      {/* Community Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredRooms.map((commRoom) => {
          const isCurrentActive = commRoom.id === currentRoomId;
          const displayLikes = likesMap[commRoom.id] ?? commRoom.likesCount;
          const isCopied = copiedId === commRoom.id;
          const isPreviewing = previewingId === commRoom.id;

          return (
            <motion.div
              key={commRoom.id}
              whileHover={{ y: -3 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`rounded-2xl border bg-white dark:bg-[#121215] p-5 flex flex-col justify-between gap-4 shadow-sm dark:shadow-xl transition-colors duration-200 ${
                isCurrentActive
                  ? 'border-[#ff5522] ring-1 ring-[#ff5522]/30 bg-orange-50/20 dark:bg-[#ff5522]/5'
                  : 'border-zinc-200/90 dark:border-white/8 hover:border-zinc-300 dark:hover:border-white/16'
              }`}
            >
              {/* Card Top: Genre badge, BPM, Progression */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 dark:bg-white/6 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/8">
                      {commRoom.genre}
                    </span>
                    <span className="text-[10px] font-mono text-[#ff5522] font-bold">
                      {commRoom.bpm} BPM
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                      {commRoom.createdAt}
                    </span>
                  </div>

                  {/* Real musician ratio badge */}
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      commRoom.humanSlotsCount === 4
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-[#ff5522]/10 text-[#ff5522] border border-[#ff5522]/30'
                    }`}
                  >
                    {t('plaza.slotsRatio', { human: commRoom.humanSlotsCount })}
                  </span>
                </div>

                {/* Room Title */}
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                  {commRoom.title}
                </h3>

                {/* Creator info */}
                <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-1">
                  <span className="flex items-center gap-1.5">
                    <span>{commRoom.creatorAvatar}</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {commRoom.creatorName}
                    </span>
                  </span>

                  {/* Chord sequence ribbon */}
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    {commRoom.progression.slice(0, 4).join('-')}
                  </span>
                </div>

                {/* Recruitment Callout Box */}
                <div className="my-3 p-3 rounded-xl bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200/80 dark:border-white/6 flex flex-col gap-1.5">
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-sans leading-relaxed italic">
                    "{commRoom.recruitmentCall}"
                  </p>

                  {/* Musician contact button */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-white/4">
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate max-w-[200px]">
                      {commRoom.contactInfo}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleCopyContact(commRoom.id, commRoom.contactInfo)}
                      className="text-[10px] font-mono text-[#ff5522] hover:text-[#ff4410] font-bold flex items-center gap-1 shrink-0"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <MessageCircle className="w-3 h-3" />}
                      {isCopied ? t('plaza.copiedContact') : t('plaza.contactMusician')}
                    </motion.button>
                  </div>
                </div>

                {/* 4-Slots Visual Mini Deck with Mascot Avatars */}
                <div className="grid grid-cols-4 gap-1.5 my-2">
                  {commRoom.slots.map((slot) => {
                    const isHuman = slot.isCustomTake;
                    const char = getCharacterForSlot(slot.type);
                    return (
                      <div
                        key={slot.id}
                        className={`p-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors ${
                          isHuman
                            ? 'bg-[#ff5522]/10 border-[#ff5522]/30 text-zinc-800 dark:text-zinc-200 shadow-2xs'
                            : 'bg-zinc-100/60 dark:bg-white/4 border-zinc-200 dark:border-white/6 text-zinc-400 dark:text-zinc-500'
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={char.imageUrl}
                            alt={char.name}
                            className="w-7 h-7 rounded-lg object-cover border"
                            style={{ borderColor: isHuman ? char.accentColor : 'rgba(150,150,150,0.2)' }}
                          />
                          {isHuman && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#ff5522] border border-white dark:border-[#121215]" />
                          )}
                        </div>
                        <span className="text-[9px] font-mono font-bold truncate max-w-full">
                          {t('role.' + slot.type) ? t('role.' + slot.type).split(' ')[0] : slot.roleName.split(' ')[0]}
                        </span>
                        <span
                          className={`text-[8px] font-mono px-1 rounded ${
                            isHuman
                              ? 'bg-[#ff5522] text-white font-bold'
                              : 'bg-zinc-200 dark:bg-white/8 text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {isHuman ? t('slots.taken') : t('slots.empty')}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  {commRoom.tags.map((tag, tIdx) => (
                    <span
                      key={`tag-${tIdx}`}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-[#18181d] text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/6"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-200/80 dark:border-white/6 font-mono">
                <div className="flex items-center gap-2">
                  {/* Upvote / Applaud Button */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleApplaud(commRoom.id, commRoom.likesCount)}
                    className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/8 bg-zinc-50 hover:bg-zinc-100 dark:bg-[#18181d] dark:hover:bg-[#222228] text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <span>👏</span>
                    <span className="tabular-nums">{displayLikes}</span>
                  </motion.button>

                  {/* Audio Preview Button */}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleToggleAudioPreview(commRoom)}
                    className="p-2 rounded-xl border border-zinc-200 dark:border-white/8 bg-zinc-50 hover:bg-zinc-100 dark:bg-[#18181d] dark:hover:bg-[#222228] text-zinc-600 dark:text-zinc-400 transition-colors shadow-2xs"
                    title="试听和弦走向"
                  >
                    {isPreviewing ? (
                      <Pause className="w-3.5 h-3.5 text-[#ff5522]" />
                    ) : (
                      <Play className="w-3.5 h-3.5 ml-0.5 text-zinc-700 dark:text-zinc-300" />
                    )}
                  </motion.button>
                </div>

                {/* Enter & Jam Primary Action Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onSelectRoom(commRoom)}
                  className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                    isCurrentActive
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-black'
                      : 'bg-[#ff5522] hover:bg-[#ff4410] text-white shadow-[#ff5522]/20'
                  }`}
                >
                  <span>{isCurrentActive ? '当前正在合奏' : t('plaza.joinJam')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
