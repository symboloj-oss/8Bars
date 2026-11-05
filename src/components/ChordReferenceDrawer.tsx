import React, { useState } from 'react';
import { ChordDetail } from '../types/music';
import { ChordFretboard } from './ChordFretboard';
import { PianoChordView } from './PianoChordView';
import { getChordDetail } from '../data/chords';
import { audioEngine } from '../services/audioEngine';
import { BookOpen, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ChordReferenceDrawerProps {
  progression: string[];
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const ChordReferenceDrawer: React.FC<ChordReferenceDrawerProps> = ({
  progression,
  t = (k) => k,
}) => {
  // Deduplicate chords in progression
  const uniqueChordNames = Array.from(new Set(progression));
  const [selectedChordName, setSelectedChordName] = useState<string>(uniqueChordNames[0] || 'C');
  const [viewMode, setViewMode] = useState<'guitar' | 'piano'>('guitar');
  const [isPlayingStrum, setIsPlayingStrum] = useState<boolean>(false);

  const selectedChord = getChordDetail(selectedChordName);

  const handlePlayStrum = async () => {
    setIsPlayingStrum(true);
    await audioEngine.previewChord(selectedChord.notes);
    setTimeout(() => setIsPlayingStrum(false), 800);
  };

  return (
    <div className="w-full bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-white/8 rounded-2xl p-4 sm:p-5 select-none shadow-sm dark:shadow-xl transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-zinc-200/80 dark:border-white/6 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#ff5522]" />
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white font-mono uppercase tracking-wider">
            {t('cheatsheet.title')}
          </h3>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-zinc-100 dark:bg-[#09090b] p-1 rounded-lg border border-zinc-200 dark:border-white/6 self-start sm:self-auto font-mono">
          <button
            onClick={() => setViewMode('guitar')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              viewMode === 'guitar'
                ? 'bg-white dark:bg-[#18181e] text-zinc-900 dark:text-white font-bold shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            {t('cheatsheet.guitarTab')}
          </button>
          <button
            onClick={() => setViewMode('piano')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              viewMode === 'piano'
                ? 'bg-white dark:bg-[#18181e] text-zinc-900 dark:text-white font-bold shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            {t('cheatsheet.pianoTab')}
          </button>
        </div>
      </div>

      {/* Chord selector buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3">
        {uniqueChordNames.map((chordName) => {
          const isSelected = chordName === selectedChordName;
          const detail = getChordDetail(chordName);
          return (
            <motion.button
              key={chordName}
              whileTap={{ scale: 0.94 }}
              onClick={() => setSelectedChordName(chordName)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-colors shrink-0 flex items-center gap-1.5 shadow-2xs ${
                isSelected
                  ? 'bg-[#ff5522] text-white shadow-md shadow-[#ff5522]/30 scale-105'
                  : 'bg-zinc-50 dark:bg-[#0a0a0c] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/6 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/12'
              }`}
            >
              <span>{chordName}</span>
              <span className="text-[10px] opacity-75 font-normal">
                {detail.quality}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Selected Chord Detail presentation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-50 dark:bg-[#09090b] p-4 rounded-xl border border-zinc-200/80 dark:border-white/6 transition-colors duration-200">
        <div className="md:col-span-1 flex flex-col justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-500 uppercase tracking-widest">
              {t('cheatsheet.selected')}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-white">
                {selectedChord.name}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {selectedChord.displayName}
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mt-1">
              {selectedChord.feeling}
            </p>
            <div className="text-xs text-zinc-500 font-mono mt-2 pt-2 border-t border-zinc-200/80 dark:border-white/6">
              {t('cheatsheet.notes')}: <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{selectedChord.notes.join(' - ')}</span>
            </div>
          </div>

          {/* Strum preview button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayStrum}
            className={`py-2 px-3.5 rounded-lg border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-2xs ${
              isPlayingStrum
                ? 'bg-[#ff5522] text-white border-[#ff5522]'
                : 'bg-white dark:bg-[#141418] border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 text-zinc-800 dark:text-zinc-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-[#ff5522]" />
            {isPlayingStrum ? t('cheatsheet.previewing') : t('cheatsheet.preview')}
          </motion.button>
        </div>

        <div className="md:col-span-2">
          {viewMode === 'guitar' ? (
            <ChordFretboard chord={selectedChord} size="md" t={t} />
          ) : (
            <PianoChordView chord={selectedChord} t={t} />
          )}
        </div>
      </div>
    </div>
  );
};
