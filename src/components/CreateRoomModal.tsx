import React, { useState } from 'react';
import { ROOM_TEMPLATES } from '../data/templates';
import { Plus, X, Disc3 } from 'lucide-react';
import { motion } from 'motion/react';

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
  const [creatorName, setCreatorName] = useState<string>('主理人 @' + Math.floor(Math.random() * 900 + 100));

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom(selectedTemplateId, title.trim() || '新合奏房间', creatorName.trim() || '乐手');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-none transition-colors duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        className="relative w-full max-w-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-colors duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-white/8 bg-zinc-50 dark:bg-[#0a0a0c]">
          <div className="flex items-center gap-2">
            <Disc3 className="w-4 h-4 text-[#ff5522]" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white font-mono uppercase tracking-wider">
              {t('create.title')}
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
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-600 dark:text-zinc-400">
              {t('create.songTitle')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如: 梧桐树下的民谣、周五爵士夜..."
              className="bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/8 px-3.5 py-2.5 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#ff5522]"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-600 dark:text-zinc-400">
              {t('create.creator')}
            </label>
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              className="bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/8 px-3.5 py-2.5 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#ff5522]"
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
                  <motion.div
                    key={tmpl.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                      if (title === '周五放轻松 8 小节' || !title) {
                        setTitle(tmpl.title.split(' ')[0] + ' 8小节');
                      }
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors flex flex-col justify-between ${
                      isSelected
                        ? 'bg-zinc-50 dark:bg-[#ff5522]/10 border-[#ff5522] shadow-sm ring-1 ring-[#ff5522]/30'
                        : 'bg-zinc-50/60 dark:bg-[#0a0a0c] border-zinc-200 dark:border-white/6 hover:border-zinc-300 dark:hover:border-white/12'
                    }`}
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

                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 flex items-center justify-between border-t border-zinc-200 dark:border-white/6 pt-1.5">
                      <span>{tmpl.progression.slice(0, 4).join('-')}</span>
                      <span>{tmpl.genre}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.96 }}
            type="submit"
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#ff5522] hover:bg-[#ff4410] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#ff5522]/25 font-mono"
          >
            <Plus className="w-4 h-4" />
            {t('create.submit')}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};
