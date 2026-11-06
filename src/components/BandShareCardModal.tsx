"use client";
import React, { useState } from 'react';
import { RoomState, RoomTemplate } from '../types/music';
import { audioEngine } from '../services/audioEngine';
import { getCharacterForSlot } from '../data/characters';
import {
 Share2,
 Copy,
 Check,
 X,
 Download,
 Users,
 Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
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

 if (!isOpen) return null;

 const missingSlots = room.slots.filter((s) => !s.isCustomTake);

 const handleCopyLink = () => {
 const url = window.location.href;
 navigator.clipboard.writeText(url);
 setCopied(true);
 confetti({
 particleCount: 50,
 spread: 60,
 origin: { y: 0.7 },
 });
 setTimeout(() => setCopied(false), 2500);
 };

 const handleDownloadWav = async () => {
 try {
 setIsExporting(true);
 const wavBlob = await audioEngine.exportMixdownWav();
 const downloadUrl = URL.createObjectURL(wavBlob);
 const a = document.createElement('a');
 a.href = downloadUrl;
 a.download = `8Bars_${room.title.replace(/\s+/g, '_')}_8小节合奏.wav`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(downloadUrl);
 } catch (e) {
 console.error('Failed to export mixdown WAV', e);
 } finally {
 setIsExporting(false);
 }
 };

 return (
 <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-none transition-colors duration-200">
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ type: 'spring', stiffness: 450, damping: 30 }}
 className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-colors duration-200"
 >
 {/* Header */}
 <div className="flex items-center justify-between px-5 py-3.5 border-b bg-zinc-100 dark:bg-black/30">
 <div className="flex items-center gap-2">
 <Share2 className="w-4 h-4 text-[#ff5522]" />
 <h3 className="text-xs font-bold text-zinc-900 dark:text-white font-mono uppercase tracking-wider">
 {t('share.title')}
 </h3>
 </div>
 <motion.button
 whileTap={{ scale: 0.92 }}
 onClick={onClose}
 className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/6 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors"
 >
 <X className="w-4 h-4" />
 </motion.button>
 </div>

 {/* The Visual Band Card */}
 <div className="p-5 flex flex-col gap-4">
 <div className="relative rounded-2xl bg-zinc-50 dark:bg-[#09090b] p-5 shadow-sm dark:shadow-2xl overflow-hidden transition-colors duration-200">
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
 : 'bg-white/60 dark:bg-[#121215] text-zinc-600 dark:text-zinc-400'
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
 className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-[#121215]"
 style={{ backgroundColor: isHuman ? '#ff5522' : '#9ca3af' }}
 />
 </div>

 <div className="flex flex-col min-w-0 flex-1">
 <div className="flex items-center justify-between gap-1">
 <span className="text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300 truncate">
 {t('role.' + slot.type) || slot.roleName.split(' ')[0]}
 </span>
 <span
 className={`text-[8px] px-1 py-0.2 rounded font-mono shrink-0 ${
 isHuman
 ? 'bg-[#ff5522] text-white font-bold'
 : 'bg-zinc-100 dark:bg-white/6 text-zinc-500 dark:text-zinc-400'
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
 <div className="bg-white dark:bg-zinc-800/60 rounded-xl p-3 flex items-center gap-3 mt-3 shadow-sm">
 <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-[#0c0c0e] flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
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
 <div className="flex flex-col gap-2 pt-1 font-mono">
 <motion.button
 whileHover={{ scale: 1.01 }}
 whileTap={{ scale: 0.96 }}
 onClick={handleCopyLink}
 className="w-full py-3 px-4 rounded-xl bg-[#ff5522] hover:bg-[#ff4410] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-primary"
 >
 {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
 {copied ? t('share.copied') : t('share.copyLink')}
 </motion.button>

 <motion.button
 whileTap={{ scale: 0.96 }}
 onClick={handleDownloadWav}
 disabled={isExporting}
 className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-white/8 hover:bg-zinc-200 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
 >
 <Download className="w-4 h-4 text-zinc-400" />
 {isExporting ? t('share.exporting') : t('share.downloadWav')}
 </motion.button>
 </div>
 </div>
 </motion.div>
 </div>
 );
};
