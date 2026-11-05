import React, { useState } from 'react';
import { RoomState, RoomTemplate } from '../types/music';
import { CommunityRoom } from '../types/community';
import { Globe, X, Send, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';

interface PublishRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomState;
  template: RoomTemplate;
  onPublish: (newCommunityRoom: CommunityRoom) => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const PublishRoomModal: React.FC<PublishRoomModalProps> = ({
  isOpen,
  onClose,
  room,
  template,
  onPublish,
  t = (k) => k,
}) => {
  const [slogan, setSlogan] = useState<string>('急寻贝斯手！跟上流行卡农走向，戴耳机录15秒即可上车！');
  const [contact, setContact] = useState<string>('微信: @' + room.creatorName.split(' ')[0]);
  const [tagsInput, setTagsInput] = useState<string>('新手友好, 卡农走向, 急寻低音');

  if (!isOpen) return null;

  const vacantRoles = room.slots.filter((s) => !s.isCustomTake).map((s) => s.type);
  const humanSlotsCount = room.slots.filter((s) => s.isCustomTake).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedTags = tagsInput
      .split(/[,，\s]+/)
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter(Boolean);

    const newCommRoom: CommunityRoom = {
      id: `comm-${Date.now()}`,
      title: room.title,
      templateId: room.templateId,
      genre: template.genre,
      bpm: template.bpm,
      progression: room.progression,
      creatorName: room.creatorName,
      creatorAvatar: '🎸',
      contactInfo: contact.trim() || '可在房间内直接录制席位',
      recruitmentCall: slogan.trim() || '欢迎任何乐器伙伴戴耳机加入！',
      tags: parsedTags.length > 0 ? parsedTags : ['新手友好', '8小节合奏'],
      humanSlotsCount,
      vacantRoles,
      likesCount: 1,
      createdAt: '刚刚发布',
      slots: room.slots,
    };

    onPublish(newCommRoom);
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-none transition-colors duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        className="relative w-full max-w-lg bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-colors duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-white/8 bg-zinc-50 dark:bg-[#0a0a0c]">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#ff5522]" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white font-mono uppercase tracking-wider">
              {t('plaza.publishModalTitle')}
            </h3>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-[#18181d] dark:hover:bg-[#222228] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors border border-zinc-200 dark:border-white/6"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 font-mono">
          {/* Room Preview strip */}
          <div className="bg-zinc-50 dark:bg-[#0a0a0c] p-3.5 rounded-xl border border-zinc-200 dark:border-white/8 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#ff5522] font-bold uppercase tracking-wider block">
                {template.genre} · {template.bpm} BPM
              </span>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                {room.title}
              </h4>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
              {t('plaza.slotsRatio', { human: humanSlotsCount })}
            </span>
          </div>

          {/* Slogan */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-600 dark:text-zinc-400">
              {t('plaza.publishSlogan')}
            </label>
            <textarea
              rows={3}
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="例如: 鼓和吉他已经录好了，急缺一位贝斯手！新手友好！"
              className="bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/8 p-3 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#ff5522] resize-none font-sans"
              required
            />
          </div>

          {/* Contact Handle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-600 dark:text-zinc-400">
              {t('plaza.publishContact')}
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="例如: 微信: music_jay99 / Discord: @rocker"
              className="bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/8 px-3.5 py-2.5 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#ff5522]"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-600 dark:text-zinc-400">
              {t('plaza.publishTags')}
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="新手友好, 急缺贝斯, 流行卡农"
              className="bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/8 px-3.5 py-2.5 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#ff5522]"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.96 }}
            type="submit"
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#ff5522] hover:bg-[#ff4410] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#ff5522]/25 font-mono"
          >
            <Send className="w-4 h-4" />
            {t('plaza.publishSubmit')}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};
