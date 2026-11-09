"use client";
import React, { useState } from 'react';
import { RoomState, RoomTemplate } from '../types/music';
import { Globe, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import confetti from 'canvas-confetti';

interface PublishRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomState;
  template: RoomTemplate;
  onPublish: (input: {
    contactInfo: string;
    recruitmentCall: string;
    tags: string[];
    genre?: string;
  }) => Promise<void> | void;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const humanSlotsCount = room.slots.filter((s) => s.occupancy === 'human').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedTags = tagsInput
      .split(/[,，\s]+/)
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter(Boolean);

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onPublish({
        genre: template.genre,
        contactInfo: contact.trim() || '可在房间内直接录制席位',
        recruitmentCall: slogan.trim() || '欢迎任何乐器伙伴戴耳机加入！',
        tags: parsedTags.length > 0 ? parsedTags : ['新手友好', '8小节合奏'],
      });
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '发布失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg bg-white dark:bg-zinc-900 p-0 gap-0 rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-zinc-50 dark:bg-black/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider">
              <Globe className="w-4 h-4 text-[#ff5522]" />
              {t('plaza.publishModalTitle')}
            </DialogTitle>
          </DialogHeader>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <span className="text-base">✕</span>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Room Preview strip */}
          <div className="bg-zinc-50 dark:bg-black/30 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#ff5522] font-bold uppercase tracking-wider block">
                {template.genre} · {template.bpm} BPM
              </span>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                {room.title}
              </h4>
            </div>
            <Badge variant="secondary">
              {t('plaza.slotsRatio', { human: humanSlotsCount })}
            </Badge>
          </div>

          {/* Slogan */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-600 dark:text-zinc-400">
              {t('plaza.publishSlogan')}
            </label>
            <Textarea
              rows={3}
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="例如: 鼓和吉他已经录好了，急缺一位贝斯手！新手友好！"
              required
            />
          </div>

          {/* Contact Handle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-600 dark:text-zinc-400">
              {t('plaza.publishContact')}
            </label>
            <Input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="例如: 微信: music_jay99 / Discord: @rocker"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-600 dark:text-zinc-400">
              {t('plaza.publishTags')}
            </label>
            <Input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="新手友好, 急缺贝斯, 流行卡农"
            />
          </div>

          {submitError && (
            <p role="alert" className="text-xs text-red-500 dark:text-red-400">
              {submitError}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting} className="w-full mt-2 py-3">
            <Send />
            {isSubmitting ? '发布中…' : t('plaza.publishSubmit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
