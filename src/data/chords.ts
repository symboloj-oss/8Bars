import { ChordDetail } from '../types/music';

export const CHORD_DATABASE: Record<string, ChordDetail> = {
  'C': {
    name: 'C',
    root: 'C',
    displayName: 'C 大和弦',
    quality: 'Major',
    notes: ['C4', 'E4', 'G4', 'C5'],
    bassNote: 'C2',
    guitar: {
      frets: [-1, 3, 2, 0, 1, 0], // x 3 2 0 1 0
      fingers: [0, 3, 2, 0, 1, 0],
      chineseTips: '5弦3品(无名指), 4弦2品(中指), 2弦1品(食指), 6弦静音',
    },
    pianoKeys: [0, 4, 7], // C, E, G
    feeling: '明亮饱满 · 温暖开阔',
  },
  'G': {
    name: 'G',
    root: 'G',
    displayName: 'G 大和弦',
    quality: 'Major',
    notes: ['G3', 'B3', 'D4', 'G4'],
    bassNote: 'G1',
    guitar: {
      frets: [3, 2, 0, 0, 0, 3], // 3 2 0 0 0 3
      fingers: [2, 1, 0, 0, 0, 3],
      chineseTips: '6弦3品(中指), 5弦2品(食指), 1弦3品(无名指)',
    },
    pianoKeys: [7, 11, 2], // G, B, D
    feeling: '开阔从容 · 安定有力',
  },
  'Am': {
    name: 'Am',
    root: 'A',
    displayName: 'A 小和弦',
    quality: 'Minor',
    notes: ['A3', 'C4', 'E4', 'A4'],
    bassNote: 'A1',
    guitar: {
      frets: [-1, 0, 2, 2, 1, 0], // x 0 2 2 1 0
      fingers: [0, 0, 2, 3, 1, 0],
      chineseTips: '4弦2品(中指), 3弦2品(无名指), 2弦1品(食指), 6弦静音',
    },
    pianoKeys: [9, 0, 4], // A, C, E
    feeling: '深情忧郁 · 柔和内省',
  },
  'F': {
    name: 'F',
    root: 'F',
    displayName: 'F 和弦 (简易/大横按)',
    quality: 'Major',
    notes: ['F3', 'A3', 'C4', 'F4'],
    bassNote: 'F1',
    guitar: {
      frets: [-1, -1, 3, 2, 1, 1], // x x 3 2 1 1 (beginner friendly Fmaj7/F form)
      fingers: [0, 0, 3, 2, 1, 1],
      chineseTips: '小F指法: 4弦3品, 3弦2品, 1-2弦1品(食指小横按)',
    },
    pianoKeys: [5, 9, 0], // F, A, C
    feeling: '如释重负 · 升华开阔',
  },
  'Dm': {
    name: 'Dm',
    root: 'D',
    displayName: 'D 小和弦',
    quality: 'Minor',
    notes: ['D4', 'F4', 'A4', 'D5'],
    bassNote: 'D2',
    guitar: {
      frets: [-1, -1, 0, 2, 3, 1], // x x 0 2 3 1
      fingers: [0, 0, 0, 2, 3, 1],
      chineseTips: '3弦2品(中指), 2弦3品(无名指), 1弦1品(食指)',
    },
    pianoKeys: [2, 5, 9], // D, F, A
    feeling: '清澈感伤 · 叙事感',
  },
  'Em': {
    name: 'Em',
    root: 'E',
    displayName: 'E 小和弦',
    quality: 'Minor',
    notes: ['E3', 'G3', 'B3', 'E4'],
    bassNote: 'E1',
    guitar: {
      frets: [0, 2, 2, 0, 0, 0], // 0 2 2 0 0 0
      fingers: [0, 2, 3, 0, 0, 0],
      chineseTips: '5弦2品(中指), 4弦2品(无名指), 全弦畅快扫弦',
    },
    pianoKeys: [4, 7, 11], // E, G, B
    feeling: '辽阔沉思 · 宁静苍劲',
  },
  'Dm7': {
    name: 'Dm7',
    root: 'D',
    displayName: 'Dm7 小七和弦',
    quality: 'Minor 7th',
    notes: ['D4', 'F4', 'A4', 'C5'],
    bassNote: 'D2',
    guitar: {
      frets: [-1, -1, 0, 2, 1, 1], // x x 0 2 1 1
      fingers: [0, 0, 0, 2, 1, 1],
      chineseTips: '3弦2品(中指), 1-2弦1品(食指同时按平)',
    },
    pianoKeys: [2, 5, 9, 0], // D, F, A, C
    feeling: '都市微醺 · 慵懒爵士',
  },
  'G7': {
    name: 'G7',
    root: 'G',
    displayName: 'G7 属七和弦',
    quality: 'Dominant 7th',
    notes: ['G3', 'B3', 'D4', 'F4'],
    bassNote: 'G1',
    guitar: {
      frets: [3, 2, 0, 0, 0, 1], // 3 2 0 0 0 1
      fingers: [3, 2, 0, 0, 0, 1],
      chineseTips: '6弦3品(无名指), 5弦2品(中指), 1弦1品(食指)',
    },
    pianoKeys: [7, 11, 2, 5], // G, B, D, F
    feeling: '强烈张力 · 渴望解决',
  },
  'Cmaj7': {
    name: 'Cmaj7',
    root: 'C',
    displayName: 'Cmaj7 大七和弦',
    quality: 'Major 7th',
    notes: ['C4', 'E4', 'G4', 'B4'],
    bassNote: 'C2',
    guitar: {
      frets: [-1, 3, 2, 0, 0, 0], // x 3 2 0 0 0
      fingers: [0, 3, 2, 0, 0, 0],
      chineseTips: '5弦3品(无名指), 4弦2品(中指), 2-3弦空弦自然震颤',
    },
    pianoKeys: [0, 4, 7, 11], // C, E, G, B
    feeling: '梦幻轻盈 · 现代浪漫',
  },
  'A7': {
    name: 'A7',
    root: 'A',
    displayName: 'A7 属七和弦',
    quality: 'Dominant 7th',
    notes: ['A3', 'C#4', 'E4', 'G4'],
    bassNote: 'A1',
    guitar: {
      frets: [-1, 0, 2, 0, 2, 0], // x 0 2 0 2 0
      fingers: [0, 0, 2, 0, 3, 0],
      chineseTips: '4弦2品(中指), 2弦2品(无名指), 其余空弦',
    },
    pianoKeys: [9, 1, 4, 7], // A, C#, E, G
    feeling: '转折回荡 · 复古布鲁斯',
  },
  'Em7': {
    name: 'Em7',
    root: 'E',
    displayName: 'Em7 小七和弦',
    quality: 'Minor 7th',
    notes: ['E3', 'G3', 'B3', 'D4'],
    bassNote: 'E1',
    guitar: {
      frets: [0, 2, 0, 0, 0, 0], // 0 2 0 0 0 0 (or 0 2 2 0 3 0)
      fingers: [0, 2, 0, 0, 0, 0],
      chineseTips: '仅需单指按 5弦2品(中指), 极简好按音色空灵',
    },
    pianoKeys: [4, 7, 11, 2], // E, G, B, D
    feeling: '律动摇摆 · 放克骨架',
  },
  'B7': {
    name: 'B7',
    root: 'B',
    displayName: 'B7 属七和弦',
    quality: 'Dominant 7th',
    notes: ['B3', 'D#4', 'F#4', 'A4'],
    bassNote: 'B1',
    guitar: {
      frets: [-1, 2, 1, 2, 0, 2], // x 2 1 2 0 2
      fingers: [0, 2, 1, 3, 0, 4],
      chineseTips: '5弦2品, 4弦1品, 3弦2品, 1弦2品, 巧妙交错',
    },
    pianoKeys: [11, 3, 6, 9], // B, D#, F#, A
    feeling: '华丽离调 · 尖锐张力',
  },
  'D': {
    name: 'D',
    root: 'D',
    displayName: 'D 大和弦',
    quality: 'Major',
    notes: ['D4', 'F#4', 'A4', 'D5'],
    bassNote: 'D2',
    guitar: {
      frets: [-1, -1, 0, 2, 3, 2], // x x 0 2 3 2
      fingers: [0, 0, 0, 1, 3, 2],
      chineseTips: '3弦2品(食指), 2弦3品(无名指), 1弦2品(中指)',
    },
    pianoKeys: [2, 6, 9], // D, F#, A
    feeling: '清澈爽朗 · 阳光前行',
  },
};

export function getChordDetail(chordName: string): ChordDetail {
  return CHORD_DATABASE[chordName] || {
    name: chordName,
    root: chordName[0] || 'C',
    displayName: `${chordName} 和弦`,
    quality: 'Chord',
    notes: ['C4', 'E4', 'G4'],
    bassNote: 'C2',
    guitar: {
      frets: [-1, 3, 2, 0, 1, 0],
      fingers: [0, 3, 2, 0, 1, 0],
      chineseTips: '标准常用手型',
    },
    pianoKeys: [0, 4, 7],
    feeling: '和谐声响',
  };
}
