"use client";
import React, { useState } from 'react';
import { ROOM_TEMPLATES } from '../data/templates';
import { Plus, Disc3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (templateId: string, customTitle: string, creatorName: string) => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  t = (k) => k,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(ROOM_TEMPLATES[0].id);
  const [title, setTitle] = useState<string>('周五放轻松 8 小节');
  // 记忆上次用过的昵称,新访客随机一个
  const [creatorName, setCreatorName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('8bars_nickname');
      if (saved) return saved;
    } catch (e) {}
    return '主理人 @' + Math.floor(Math.random() * 900 + 100);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = creatorName.trim() || '乐手';
    try { localStorage.setItem('8bars_nickname', name); } catch (err) {}
    onCreateRoom(selectedTemplateId, title.trim() || '新合奏房间', name);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-xl bg-white dark:bg-zinc-900 p-0 gap-0 rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-zinc-100 dark:bg-black/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider">
              <Disc3 className="w-4 h-4 text-[#ff5522]" />
              {t('create.title')}
            </DialogTitle>
          </DialogHeader>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <span className="text-base">✕</span>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-600 dark:text-zinc-400">
              {t('create.songTitle')}
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如: 梧桐树下的民谣、周五爵士夜..."
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-600 dark:text-zinc-400">
              {t('create.creator')}
            </label>
            <Input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              required
            />
          </div>

          {/* Template Selection */}
          <div className="flex flex-col gap-2 mt-1">
            <label className="text-xs text-zinc-600 dark:text-zinc-400">
              {t('create.selectTmpl')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ROOM_TEMPLATES.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                      if (title === '周五放轻松 8 小节' || !title) {
                        setTitle(tmpl.title.split(' ')[0] + ' 8小节');
                      }
                    }}
                    className={cn(
                      'p-3 rounded-xl border cursor-pointer transition-colors flex flex-col justify-between hover:border-zinc-300 dark:hover:border-white/12',
                      isSelected
                        ? 'border-[#ff5522] shadow-sm ring-1 ring-[#ff5522]/30 bg-[#ff5522]/5'
                        : 'border-transparent bg-zinc-50 dark:bg-black/40'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                          {tmpl.title}
                        </span>
                        <span className="text-[10px] text-[#ff5522] bg-[#ff5522]/10 px-1.5 py-0.5 rounded font-bold">
                          {tmpl.bpm} BPM
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 font-sans">
                        {tmpl.tagline}
                      </p>
                    </div>

                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 flex items-center justify-between pt-1.5">
                      <span>{tmpl.progression.slice(0, 4).join('-')}</span>
                      <span>{tmpl.genre}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Button type="submit" className="w-full mt-2 py-3">
            <Plus />
            {t('create.submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
