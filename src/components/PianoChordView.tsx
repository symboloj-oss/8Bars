import React from 'react';
import { ChordDetail } from '../types/music';

interface PianoChordViewProps {
  chord: ChordDetail;
  className?: string;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const PianoChordView: React.FC<PianoChordViewProps> = ({
  chord,
  className = '',
  t = (k, p) => (k === 'cheatsheet.pianoTitle' && p ? `${p.chord} Piano` : k),
}) => {
  const whiteKeyPitches = [0, 2, 4, 5, 7, 9, 11, 0, 2, 4, 5, 7, 9, 11];
  const whiteKeyNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'A', 'B'];

  const blackKeys = [
    { pitch: 1, name: 'C#', whiteIndex: 0 },
    { pitch: 3, name: 'D#', whiteIndex: 1 },
    { pitch: 6, name: 'F#', whiteIndex: 3 },
    { pitch: 8, name: 'G#', whiteIndex: 4 },
    { pitch: 10, name: 'A#', whiteIndex: 5 },
    { pitch: 1, name: 'C#', whiteIndex: 7 },
    { pitch: 3, name: 'D#', whiteIndex: 8 },
    { pitch: 6, name: 'F#', whiteIndex: 10 },
    { pitch: 8, name: 'G#', whiteIndex: 11 },
    { pitch: 10, name: 'A#', whiteIndex: 12 },
  ];

  const activePitchClasses = new Set(chord.pianoKeys);

  const whiteKeyWidth = 20;
  const whiteKeyHeight = 72;
  const blackKeyWidth = 12;
  const blackKeyHeight = 44;

  return (
    <div className={`flex flex-col items-center bg-white dark:bg-zinc-900 rounded-xl p-3 shadow-sm transition-colors duration-200 ${className}`}>
      <div className="flex items-center justify-between w-full mb-1">
        <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-[#ff5522]"></span>
          {t('cheatsheet.pianoTitle', { chord: chord.name })}
        </span>
        <span className="text-[11px] text-zinc-500 font-mono">
          {t('cheatsheet.notes')}: {chord.notes.join(' · ')}
        </span>
      </div>

      <div className="relative h-[80px] my-1 select-none flex justify-center">
        {/* White keys */}
        <div className="flex rounded overflow-hidden bg-zinc-100 dark:bg-zinc-950">
          {whiteKeyPitches.map((pitch, idx) => {
            const isActive = activePitchClasses.has(pitch);
            return (
              <div
                key={`white-${idx}`}
                style={{ width: `${whiteKeyWidth}px`, height: `${whiteKeyHeight}px` }}
                className={`flex flex-col justify-end items-center pb-1 text-[9px] font-mono transition-colors ${
                  isActive
                    ? 'bg-[#ff5522] text-white font-bold shadow-md'
                    : 'bg-white dark:bg-[#e4e4e7] text-zinc-600 dark:text-zinc-700'
                }`}
              >
                {isActive ? whiteKeyNames[idx] : ''}
              </div>
            );
          })}
        </div>

        {/* Black keys overlaid */}
        {blackKeys.map((bk, bIdx) => {
          const isActive = activePitchClasses.has(bk.pitch);
          const leftOffset = (bk.whiteIndex + 1) * whiteKeyWidth - blackKeyWidth / 2;

          return (
            <div
              key={`black-${bIdx}`}
              style={{
                left: `${leftOffset}px`,
                width: `${blackKeyWidth}px`,
                height: `${blackKeyHeight}px`,
              }}
              className={`absolute top-0 rounded-b-xs border border-zinc-800 dark:border-black transition-colors z-10 flex flex-col justify-end items-center pb-0.5 text-[8px] font-mono ${
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-black font-bold shadow-md'
                  : 'bg-zinc-900 dark:bg-[#18181b] text-zinc-400 dark:text-zinc-500'
              }`}
            >
              {isActive ? '•' : ''}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 text-center leading-relaxed mt-1 font-mono">
        {t('cheatsheet.root')}: <span className="text-zinc-900 dark:text-white font-bold">{chord.root}</span> · {chord.feeling}
      </p>
    </div>
  );
};
