"use client";
import React, { useState } from 'react';
import { RoomState, RoomTemplate } from '../types/music';
import { getCharacterForSlot } from '../data/characters';
import { downloadRoomWav } from '../lib/exportWav';
import { Share2, Users, Sparkles, Check, Copy, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const missingSlots = room.slots.filter((s) => !s.isCustomTake);

  const handleCopyLink = async () => {
    let link: string;
    if (room.id && /^[0-9a-f-]{36}$/.test(room.id)) {
      link = `${window.location.origin}/room/${room.id}`;
    } else {
      link = `${window.location.origin}/`;
    }

    try {
      await navigator.clipboard.writeText(link);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.5 },
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadWav = async () => {
    try {
      setIsExporting(true);
      await downloadRoomWav(room.title);
    } catch (e) {
      console.error('Failed to export mixdown WAV', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg bg-white dark:bg-zinc-900 p-0 gap-0 rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-zinc-100 dark:bg-black/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider">
              <Share2 className="w-4 h-4 text-[#ff5522]" />
              {t('share.title')}
            </DialogTitle>
          </DialogHeader>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <span className="text-base">✕</span>
          </Button>
        </div>

        {/* The Visual Band Card */}
        <div className="p-5 flex flex-col gap-4">
          <div className="relative rounded-2xl bg-zinc-50 dark:bg-black/40 p-5 overflow-hidden transition-colors duration-200">
            {/* Background subtle glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#ff5522]/5 rounded-full blur-2xl pointer-events-none" />

            {/* Card Header */}
            <div className="flex items-start justify-between border-b pb-3 mb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff5522] font-bold">
                  {t('share.roomSub')}
                </span>
                <h4 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight mt-0.5">
                  {room.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                  <span>{template.genre}</span>
                  <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">/</span>
                  <span>{template.bpm} BPM</span>
                  <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">/</span>
                  <span>{template.progression.slice(0, 4).join('-')}</span>
                </div>
              </div>

              <div className="w-9 h-9 rounded-xl bg-white dark:bg-white/8 flex items-center justify-center text-zinc-800 dark:text-zinc-300 shrink-0 font-mono text-xs font-bold shadow-sm">
                8B
              </div>
            </div>

            {/* 4 Slots Status Grid with Virtual Character Mascots */}
            <div className="grid grid-cols-2 gap-2 my-3">
              {room.slots.map((slot) => {
                const isHuman = slot.isCustomTake;
                const char = getCharacterForSlot(slot.type);
                return (
                  <div
                    key={slot.id}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-colors ${
                      isHuman
                        ? 'bg-white dark:bg-[#ff5522]/10 border-[#ff5522]/30 dark:border-[#ff5522]/40 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'bg-white/60 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={char.imageUrl}
                        alt={char.name}
                        className="w-10 h-10 rounded-lg object-cover border"
                        style={{ borderColor: isHuman ? char.accentColor : 'rgba(150,150,150,0.2)' }}
                      />
                      <span
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-zinc-900"
                        style={{ backgroundColor: isHuman ? '#ff5522' : '#9ca3af' }}
                      />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300 truncate">
                          {t('role.' + slot.type) || slot.roleName.split(' ')[0]}
                        </span>
                        <span
                          className={`text-[8px] px-1 py-0.5 rounded font-mono shrink-0 ${
                            isHuman
                              ? 'bg-[#ff5522] text-white font-bold'
                              : 'bg-zinc-100 dark:bg-white/8 text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {isHuman ? t('slots.taken') : t('slots.empty')}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate font-mono mt-0.5">
                        {isHuman ? slot.musician.name : `${char.name} (AI)`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Status Callout */}
            <div className="bg-white dark:bg-zinc-800/60 rounded-xl p-3 flex items-center gap-3 mt-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-black/40 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
                <Users className="w-4 h-4 text-[#ff5522]" />
              </div>
              <div className="flex flex-col text-xs font-mono">
                {missingSlots.length > 0 ? (
                  <>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {t('share.missing', { missing: missingSlots.map((s) => t('role.' + s.type) || s.roleName.split(' ')[0]).join(' / ') })}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 mt-0.5 text-[11px]">
                      {t('share.missingDesc')}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-[#ff5522] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> {t('share.complete')}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 mt-0.5 text-[11px]">
                      {t('share.completeDesc')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sharing Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <Button onClick={handleCopyLink} className="w-full py-3">
              {copied ? <Check className="text-white" /> : <Copy />}
              {copied ? t('share.copied') : t('share.copyLink')}
            </Button>

            <Button variant="secondary" onClick={handleDownloadWav} disabled={isExporting} className="w-full py-2.5">
              <Download className="text-zinc-400" />
              {isExporting ? t('share.exporting') : t('share.downloadWav')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
