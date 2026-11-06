import React from 'react';
import { ChordDetail } from '../types/music';

interface ChordFretboardProps {
  chord: ChordDetail;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const ChordFretboard: React.FC<ChordFretboardProps> = ({
  chord,
  className = '',
  size = 'md',
  t = (k, p) => (k === 'cheatsheet.fretboard' && p ? `${p.chord} Tab` : k === 'cheatsheet.frets14' ? 'Frets 1-4' : k),
}) => {
  const { guitar } = chord;
  const frets = guitar.frets; // 6 values: strings 6 down to 1

  // Dimensions
  const isSm = size === 'sm';
  const width = isSm ? 160 : 210;
  const height = isSm ? 140 : 180;
  const topPadding = 26;
  const leftPadding = 32;
  const rightPadding = 18;
  const bottomPadding = 18;

  const fretCount = 4;
  const stringCount = 6;

  const fretboardWidth = width - leftPadding - rightPadding;
  const fretboardHeight = height - topPadding - bottomPadding;

  const stringSpacing = fretboardWidth / (stringCount - 1);
  const fretSpacing = fretboardHeight / fretCount;

  return (
    <div className={`flex flex-col items-center bg-white dark:bg-zinc-900 rounded-xl p-3 shadow-sm transition-colors duration-200 ${className}`}>
      <div className="flex items-center justify-between w-full mb-1">
        <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-[#ff5522]"></span>
          {t('cheatsheet.fretboard', { chord: chord.name })}
        </span>
        <span className="text-[11px] text-zinc-500 font-mono">{t('cheatsheet.frets14')}</span>
      </div>

      <svg width={width} height={height} className="overflow-visible select-none my-1">
        {/* Top open/mute indicator row */}
        {frets.map((fretVal, idx) => {
          const x = leftPadding + idx * stringSpacing;
          const y = topPadding - 10;
          if (fretVal === -1) {
            return (
              <text
                key={`mute-${idx}`}
                x={x}
                y={y}
                textAnchor="middle"
                className="fill-rose-500 text-[11px] font-bold font-mono"
              >
                ✕
              </text>
            );
          }
          if (fretVal === 0) {
            return (
              <circle
                key={`open-${idx}`}
                cx={x}
                cy={y - 3}
                r="3.5"
                fill="none"
                stroke="currentColor"
                className="text-zinc-400 dark:text-zinc-500"
                strokeWidth="1.5"
              />
            );
          }
          return null;
        })}

        {/* The Nut (zero fret) */}
        <rect
          x={leftPadding - 1}
          y={topPadding}
          width={fretboardWidth + 2}
          height={3.5}
          className="fill-zinc-800 dark:fill-zinc-200"
          rx={1}
        />

        {/* Fret wire lines (horizontal) */}
        {Array.from({ length: fretCount + 1 }).map((_, fIdx) => {
          const y = topPadding + fIdx * fretSpacing;
          return (
            <line
              key={`fret-${fIdx}`}
              x1={leftPadding}
              y1={y}
              x2={leftPadding + fretboardWidth}
              y2={y}
              stroke="currentColor"
              className="text-zinc-300 dark:text-zinc-700"
              strokeWidth={fIdx === 0 ? '0' : '1.5'}
            />
          );
        })}

        {/* Guitar strings (vertical) with thickness varying from string 6 to 1 */}
        {Array.from({ length: stringCount }).map((_, sIdx) => {
          const x = leftPadding + sIdx * stringSpacing;
          // String 6 (thickest) -> string 1 (thinnest)
          const strokeWidth = 2.4 - sIdx * 0.32;
          return (
            <line
              key={`string-${sIdx}`}
              x1={x}
              y1={topPadding}
              x2={x}
              y2={topPadding + fretboardHeight}
              stroke="currentColor"
              className="text-zinc-400 dark:text-zinc-500"
              strokeWidth={Math.max(1, strokeWidth)}
            />
          );
        })}

        {/* Finger pressing dots */}
        {frets.map((fretVal, sIdx) => {
          if (fretVal > 0 && fretVal <= fretCount) {
            const x = leftPadding + sIdx * stringSpacing;
            const y = topPadding + (fretVal - 0.5) * fretSpacing;
            const finger = guitar.fingers ? guitar.fingers[sIdx] : '';

            return (
              <g key={`dot-${sIdx}`}>
                {/* Glow ring */}
                <circle cx={x} cy={y} r="8.5" fill="#ff5522" opacity="0.25" />
                {/* Main dot */}
                <circle cx={x} cy={y} r="6.5" fill="#ff5522" />
                {finger ? (
                  <text
                    x={x}
                    y={y + 3.5}
                    textAnchor="middle"
                    className="fill-white text-[9px] font-bold font-mono select-none"
                  >
                    {finger}
                  </text>
                ) : null}
              </g>
            );
          }
          return null;
        })}

        {/* Fret position numbers on the left */}
        {Array.from({ length: fretCount }).map((_, fIdx) => {
          const y = topPadding + (fIdx + 0.5) * fretSpacing + 3.5;
          return (
            <text
              key={`fnum-${fIdx}`}
              x={leftPadding - 12}
              y={y}
              textAnchor="middle"
              className="fill-zinc-400 dark:fill-zinc-500 text-[10px] font-mono"
            >
              {fIdx + 1}
            </text>
          );
        })}
      </svg>

      <p className="text-[11px] text-zinc-600 dark:text-zinc-300 text-center leading-relaxed mt-1 px-1 line-clamp-2 font-mono">
        {guitar.chineseTips}
      </p>
    </div>
  );
};
