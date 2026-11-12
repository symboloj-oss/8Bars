export type SlotType = 'drums' | 'bass' | 'chords' | 'melody';
export type SlotOccupancy = 'system' | 'human';
export type SlotAudioSource = 'synthetic' | 'template' | 'human' | 'empty';
export type RoomPublicationStatus = 'draft' | 'published' | 'archived';

export interface MusicianInfo {
  name: string;
  avatar: string;
  isAI: boolean;
  instrumentTitle: string;
  recordedAt?: string;
}

export interface SlotTake {
  id: string;
  title: string;
  musician: MusicianInfo;
  audioBlobUrl?: string;
  audioBlob?: Blob;
  latencyOffsetMs: number;
  isAI: boolean;
  createdAt: string;
}

export interface SlotInfo {
  id: string;
  type: SlotType;
  title: string;
  roleName: string;
  description?: string;
  musician: MusicianInfo;
  audioBlobUrl?: string;
  audioBlob?: Blob;
  volume: number; // 0 to 1
  isMuted: boolean;
  isSolo: boolean;
  latencyOffsetMs: number; // default -80ms
  /** 当前席位由系统补位还是由真人认领。 */
  occupancy: SlotOccupancy;
  /** 当前实际播放的音频来源。 */
  audioSource: SlotAudioSource;
  isCustomTake: boolean;
  takes: SlotTake[];
  /** 当前正在播放的真人 Take;没有真人录音时为空。 */
  activeTakeId?: string | null;
  activeTakeIndex: number;
}

export interface GuitarChordFingering {
  frets: number[]; // 6 elements for strings 6 to 1 (Low E to High e): -1 = X (mute), 0 = Open, 1..5 = fret number
  fingers?: (number | string)[]; // finger numbers: 1=index, 2=middle, 3=ring, 4=pinky, 'T'=thumb
  barre?: { fret: number; fromString: number; toString: number };
  chineseTips: string;
}

export interface ChordDetail {
  name: string;
  root: string;
  displayName: string;
  quality: string;
  notes: string[]; // e.g. ['C4', 'E4', 'G4']
  bassNote: string; // e.g. 'C2'
  guitar: GuitarChordFingering;
  pianoKeys: number[]; // 0=C, 1=C#, 2=D, 3=D#, 4=E, 5=F, 6=F#, 7=G, 8=G#, 9=A, 10=A#, 11=B
  feeling: string;
}

export interface RoomTemplate {
  id: string;
  title: string;
  tagline: string;
  bpm: number;
  key: string;
  genre: string;
  icon: string;
  colorScheme: {
    accent: string;
    border: string;
    bg: string;
  };
  progression: string[]; // 8 items, one chord per bar
  progressionDetails: ChordDetail[];
  drumGroove: 'pop_groove' | 'jazz_lofi' | 'funk_slap' | 'folk_acoustic';
  bassLineType: 'pop_driving' | 'walking_swing' | 'funk_syncopated' | 'folk_warm';
  chordsStrumType: 'pop_acoustic' | 'rhodes_chill' | 'funk_skank' | 'folk_strum';
  melodyHookType: 'pop_synth' | 'jazz_horn' | 'funk_whistle' | 'folk_lead';
}

export interface RoomState {
  id: string;
  title: string;
  templateId: string;
  bpm: number;
  createdAt: string;
  creatorName: string;
  publicationStatus: RoomPublicationStatus;
  publishedAt?: string | null;
  slots: SlotInfo[];
  progression: string[];
}
