"use client";
import React, { useState } from 'react';
import { ChordDetail } from '../types/music';
import { audioEngine } from '../services/audioEngine';
import { Volume2, Play, Activity, Sparkles, Music } from 'lucide-react';
import { motion } from 'motion/react';

interface PracticeTunerLabProps {
  progression: string[];
  progressionDetails: ChordDetail[];
  currentBeat: number;
  isPlaying: boolean;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const PracticeTunerLab: React.FC<PracticeTunerLabProps> = ({
  progression,
  progressionDetails,
  currentBeat,
  isPlaying,
  t = (k) => k,
}) => {
  const [activeNotePlaying, setActiveNotePlaying] = useState<string | null>(null);
  const [activeChordStrumming, setActiveChordStrumming] = useState<string | null>(null);

  // Standard Guitar Tuning String frequencies / note names
  const guitarStrings = [
    { label: t('lab.string6'), note: 'E2', desc: '82Hz' },
    { label: t('lab.string5'), note: 'A2', desc: '110Hz' },
    { label: t('lab.string4'), note: 'D3', desc: '147Hz' },
    { label: t('lab.string3'), note: 'G3', desc: '196Hz' },
    { label: t('lab.string2'), note: 'B3', desc: '247Hz' },
    { label: t('lab.string1'), note: 'E4', desc: '330Hz' },
    { label: t('lab.standardA'), note: 'A4', desc: '440Hz' },
  ];

  // Strumming Pattern: 8 subdivision arrows for a 4/4 bar
  const strummingPattern = [
    { dir: '↓', label: t('lab.down'), beat: 0, sub: 0 },
    { dir: '·', label: t('lab.skip'), beat: 0, sub: 1 },
    { dir: '↓', label: t('lab.down'), beat: 1, sub: 0 },
    { dir: '↑', label: t('lab.up'), beat: 1, sub: 1 },
    { dir: '·', label: t('lab.skip'), beat: 2, sub: 0 },
    { dir: '↑', label: t('lab.up'), beat: 2, sub: 1 },
    { dir: '↓', label: t('lab.down'), beat: 3, sub: 0 },
    { dir: '↑', label: t('lab.up'), beat: 3, sub: 1 },
  ];

  // Unique chords in progression
  const uniqueChordNames = Array.from(new Set(progression));

  const handlePlayTuningNote = async (note: string) => {
    setActiveNotePlaying(note);
    await audioEngine.playPitchReference(note);
    setTimeout(() => {
      setActiveNotePlaying((cur) => (cur === note ? null : cur));
    }, 1200);
  };

  const handleStrumChord = async (chordName: string) => {
    setActiveChordStrumming(chordName);
    const detail = progressionDetails.find((d) => d.name === chordName);
    if (detail) {
      await audioEngine.previewChord(detail.notes);
    }
    setTimeout(() => {
      setActiveChordStrumming((cur) => (cur === chordName ? null : cur));
    }, 800);
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 flex flex-col gap-5 shadow-card dark:shadow-card-dark select-none transition-colors duration-200">
      {/* Module Title */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#ff5522]" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight font-mono uppercase">
            {t('lab.title')}
          </h3>
        </div>
        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
          {t('lab.subtitle')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Interactive Chord Strum Pad */}
        <div className="flex flex-col gap-3 bg-zinc-50 dark:bg-black/30 p-4 rounded-xl transition-colors duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#ff5522]" />
              {t('lab.tapToStrum')}
            </span>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
              {t('lab.tapHint')}
            </span>
          </div>

          {/* Strum Pads Grid */}
          <div className="grid grid-cols-4 gap-2">
            {uniqueChordNames.map((name) => {
              const isStrumming = activeChordStrumming === name;
              const detail = progressionDetails.find((d) => d.name === name);
              return (
                <motion.button
                  key={`pad-${name}`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleStrumChord(name)}
                  className={`py-3 px-2 rounded-xl text-center font-mono transition-colors duration-150 flex flex-col items-center justify-center gap-0.5 ${
                    isStrumming
                      ? 'bg-[#ff5522] text-white shadow-lg shadow-[#ff5522]/30 scale-105'
                      : 'bg-white dark:bg-[#18181d] text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  <span className="text-base font-extrabold">{name}</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 opacity-80">
                    {detail?.quality || 'Major'}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Strumming Pattern Coach */}
          <div className="mt-2 pt-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              <span>{t('lab.strumCoach')}</span>
              <span className="text-[#ff5522] font-semibold">
                {isPlaying ? t('lab.strumBeat', { beat: currentBeat + 1 }) : t('lab.strumSync')}
              </span>
            </div>

            <div className="grid grid-cols-8 gap-1">
              {strummingPattern.map((item, idx) => {
                const isActive = isPlaying && currentBeat === item.beat;
                return (
                  <motion.div
                    key={`strum-${idx}`}
                    animate={isActive ? { scale: 1.08, y: -2 } : { scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className={`h-10 rounded-lg flex flex-col items-center justify-center font-mono font-bold text-xs transition-colors ${
                      isActive
                        ? 'bg-[#ff5522]/20 text-[#ff5522]'
                        : item.dir === '·'
                        ? 'bg-zinc-100/50 dark:bg-[#121215] text-zinc-400 dark:text-zinc-600'
                        : 'bg-white dark:bg-[#16161b] text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span className="text-sm">{item.dir}</span>
                    <span className="text-[8px] opacity-70">{item.label}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Pitch Pipe / String Tuner Reference */}
        <div className="flex flex-col gap-3 bg-zinc-50 dark:bg-black/30 p-4 rounded-xl justify-between transition-colors duration-200">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-300 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                {t('lab.pitchPipe')}
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                {t('lab.pitchPipeHint')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {guitarStrings.map((s) => {
                const isPlayingThis = activeNotePlaying === s.note;
                return (
                  <motion.button
                    key={`tune-${s.note}`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handlePlayTuningNote(s.note)}
                    className={`p-2.5 rounded-xl font-mono text-left transition-all ${
                      isPlayingThis
                        ? 'bg-[#ff5522]/15 text-[#ff5522] shadow-sm'
                        : 'bg-white dark:bg-[#18181d] text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-zinc-900 dark:text-white">{s.label}</span>
                      <span className="text-[11px] opacity-70 text-zinc-500 dark:text-zinc-400">{s.note}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 block mt-0.5 truncate">
                      {s.desc}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-mono">
            {t('lab.tunerTip')}
          </p>
        </div>
      </div>
    </div>
  );
};
