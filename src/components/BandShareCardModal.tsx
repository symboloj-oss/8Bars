"use client";

import React, { useState } from 'react';
import { RoomState, RoomTemplate } from '../types/music';
import { getCharacterForSlot } from '../data/characters';
import { downloadRoomWav } from '../lib/exportWav';
import { Share2, Users, Check, Copy, Download, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import confetti from 'canvas-confetti';

interface BandShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomState;
  template: RoomTemplate;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const BandShareCardModal: React.FC<BandShareCardModalProps> = ({
  isOpen,
  onClose,
  room,
  template,
  t = (k) => k,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const missingSlots = room.slots.filter((slot) => slot.occupancy !== 'human');
  const humanCount = room.slots.filter((slot) => slot.occupancy === 'human').length;
  const slotLabels: Record<string, string> = {
    drums: '鼓手',
    bass: '贝斯',
    chords: '和弦',
    melody: '主奏',
  };
  const missingNames = missingSlots.map((slot) => slotLabels[slot.type] || t('role.' + slot.type) || slot.roleName.split(' ')[0]);

  const handleCopyLink = async () => {
    const link = room.id && /^[0-9a-f-]{36}$/.test(room.id)
      ? `${window.location.origin}/room/${room.id}`
      : `${window.location.origin}/`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setCopied(true);
    confetti({ particleCount: 24, spread: 42, origin: { y: 0.55 } });
    window.setTimeout(() => setCopied(false), 2200);
  };

  const handleDownloadWav = async () => {
    try {
      setIsExporting(true);
      await downloadRoomWav(room.title);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm bg-white dark:bg-zinc-900 p-0 gap-0 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
              <Share2 className="w-4 h-4 text-[#ff5522]" />
              邀请队友加入
            </DialogTitle>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">复制链接，邀请朋友补上空位。</p>
          </DialogHeader>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="关闭">
            <span className="text-base">✕</span>
          </Button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          <div className="min-w-0">
            <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white truncate">{room.title}</h3>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{template.genre} · {template.bpm} BPM</p>
          </div>

          <div>
            <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 text-[#ff5522] shrink-0" />
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">{humanCount}/4 位乐手已加入</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              {missingSlots.length ? `还缺 ${missingNames.join('、')}` : '已经组队完成'}
            </p>
            <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label={`已有 ${humanCount} 位乐手加入`}>
              {room.slots.map((slot) => {
                const isHuman = slot.occupancy === 'human';
                const character = getCharacterForSlot(slot.type);
                const label = slotLabels[slot.type] || t('role.' + slot.type) || slot.roleName.split(' ')[0];
                return (
                  <div key={slot.id} className="min-w-0">
                    <div className={`h-1.5 rounded-full ${isHuman ? 'bg-[#ff5522]' : 'bg-zinc-200 dark:bg-white/15'}`} />
                    <div className="mt-2 flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-md overflow-hidden bg-zinc-100 dark:bg-white/8 shrink-0">
                        <img src={character.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className={`truncate text-[10px] ${isHuman ? 'font-semibold text-zinc-800 dark:text-zinc-200' : 'text-zinc-400'}`}>
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {missingSlots.length ? '打开链接后选一个空位，录完 8 小节就能加入。' : '乐队已经到齐，可以把这段合奏分享出去。'}
          </p>

          <Button onClick={handleCopyLink} className="w-full h-11">
            {copied ? <Check /> : <Copy />}
            {copied ? '邀请链接已复制' : '复制邀请链接'}
            {!copied && <ArrowRight className="ml-auto" />}
          </Button>

          <button
            type="button"
            onClick={handleDownloadWav}
            disabled={isExporting}
            className="inline-flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? '正在导出…' : '下载当前合奏 WAV'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
