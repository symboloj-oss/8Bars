"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { RoomTemplate } from '../types/music';
import { ArrowRight, Check, Disc3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (templateId: string, customTitle: string, creatorName: string) => void;
  templates: RoomTemplate[];
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  templates,
  t = (k: string) => k,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [title, setTitle] = useState('周五放轻松 8 小节');
  const [creatorName, setCreatorName] = useState(() => {
    try {
      const saved = localStorage.getItem('8bars_nickname');
      if (saved) return saved;
    } catch {}
    return '主理人 @' + Math.floor(Math.random() * 900 + 100);
  });

  useEffect(() => {
    setSelectedTemplateId((current) => current || templates[0]?.id || '');
  }, [templates]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId, templates]
  );

  const handleSelectTemplate = (template: RoomTemplate) => {
    setSelectedTemplateId(template.id);
    if (!title.trim() || title === '周五放轻松 8 小节') {
      setTitle(`${template.title.split(' ')[0]} 8 小节`);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTemplateId) return;
    const name = creatorName.trim() || '乐手';
    try { localStorage.setItem('8bars_nickname', name); } catch {}
    onCreateRoom(selectedTemplateId, title.trim() || '新合奏房间', name);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-lg bg-white dark:bg-zinc-900 p-0 gap-0 rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b bg-zinc-50 dark:bg-black/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
              <Disc3 className="w-4 h-4 text-[#ff5522]" />
              创建一支新乐队
            </DialogTitle>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              选一个声音，起个名字，马上邀请第一位队友。
            </p>
          </DialogHeader>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="关闭">
            <span className="text-base">✕</span>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-900 dark:text-white">选择一个风格</label>
              {selectedTemplate && (
                <span className="text-[10px] font-mono text-[#ff5522]">{selectedTemplate.bpm} BPM</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((template) => {
                const isSelected = template.id === selectedTemplateId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template)}
                    aria-pressed={isSelected}
                    className={cn(
                      'relative text-left rounded-xl border p-3 transition-all min-h-[86px]',
                      isSelected
                        ? 'border-[#ff5522] bg-[#ff5522]/6 ring-1 ring-[#ff5522]/25'
                        : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20'
                    )}
                  >
                    {isSelected && <Check className="absolute top-2 right-2 w-3.5 h-3.5 text-[#ff5522]" />}
                    <span className="block pr-4 text-xs font-semibold text-zinc-900 dark:text-white truncate">
                      {template.title.split(' (')[0]}
                    </span>
                    <span className="block mt-1 text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {template.tagline}
                    </span>
                    <span className="block mt-2 text-[10px] font-mono text-zinc-400">
                      {template.progression.slice(0, 4).join(' · ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div>
              <label htmlFor="create-room-title" className="text-xs font-semibold text-zinc-900 dark:text-white">
                给这支乐队起个名字
              </label>
              <Input
                id="create-room-title"
                className="mt-1.5 h-10"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：周五下班解压卡农"
                maxLength={60}
                required
              />
            </div>
            <div>
              <label htmlFor="create-room-creator" className="text-xs font-semibold text-zinc-900 dark:text-white">
                你的乐手昵称
              </label>
              <Input
                id="create-room-creator"
                className="mt-1.5 h-10"
                value={creatorName}
                onChange={(event) => setCreatorName(event.target.value)}
                placeholder="例如：阿杰"
                maxLength={30}
                required
              />
            </div>
          </section>

          <div className="rounded-xl bg-zinc-50 dark:bg-white/[0.04] px-3.5 py-3 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5522] shrink-0" />
            创建后会自动生成鼓、贝斯、和弦、主奏 4 个席位，你可以先录一个。
          </div>

          <Button type="submit" disabled={!selectedTemplateId} className="w-full h-11">
            开始组建乐队
            <ArrowRight />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
