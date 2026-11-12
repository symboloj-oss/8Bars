import { CHORD_DATABASE, getChordDetail } from './chords';
import { RoomTemplate, SlotType } from '../types/music';

export type ScoreEventKind = 'kick' | 'snare' | 'hat' | 'bass' | 'chord' | 'melody';

export interface ScoreEvent {
  slotType: SlotType;
  kind: ScoreEventKind;
  time: string;
  notes: string[];
  duration: string;
  velocity: number;
  swingOffsetBeats?: number;
}

export interface TemplateScorePlan {
  drums: ScoreEvent[];
  bass: ScoreEvent[];
  chords: ScoreEvent[];
  melody: ScoreEvent[];
}

const NATURAL_PITCHES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiForNote(note: string): number {
  const match = note.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!match) return 36;
  const [, letter, accidental, octaveText] = match;
  const accidentalOffset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return (Number(octaveText) + 1) * 12 + NATURAL_PITCHES[letter] + accidentalOffset;
}

function noteForMidi(midi: number): string {
  const normalized = Math.max(0, Math.min(127, midi));
  return `${PITCH_NAMES[normalized % 12]}${Math.floor(normalized / 12) - 1}`;
}

function chordToneNearBass(note: string, root: string): string {
  const rootMidi = midiForNote(root);
  const pitchClass = ((midiForNote(note) % 12) + 12) % 12;
  const rootPitchClass = ((rootMidi % 12) + 12) % 12;
  return noteForMidi(rootMidi + ((pitchClass - rootPitchClass + 12) % 12));
}

function isSwingOffbeat(position: string): boolean {
  return position.split(':')[1] === '2';
}

/**
 * Templates provide accompaniment only. The melody part stays open for people
 * in the room; any future AI melody should be an explicit user-created take.
 */
export function createTemplateScorePlan(template: RoomTemplate): TemplateScorePlan {
  const plan: TemplateScorePlan = { drums: [], bass: [], chords: [], melody: [] };

  const add = (
    slotType: SlotType,
    kind: ScoreEventKind,
    bar: number,
    position: string,
    notes: string[],
    duration: string,
    velocity: number,
    swing = false,
  ) => {
    const [beat, sixteenth] = position.split(':');
    const event: ScoreEvent = {
      slotType,
      kind,
      time: `${bar}:${beat}:${sixteenth}`,
      notes,
      duration,
      velocity,
      ...(swing ? { swingOffsetBeats: 0.12 } : {}),
    };
    const target = slotType === 'drums'
      ? plan.drums
      : slotType === 'bass'
        ? plan.bass
        : slotType === 'chords'
          ? plan.chords
          : plan.melody;
    target.push(event);
  };

  for (let bar = 0; bar < 8; bar++) {
    const chordName = template.progression[bar % template.progression.length] || 'C';
    const chord = CHORD_DATABASE[chordName] || getChordDetail(chordName);
    const nextName = template.progression[(bar + 1) % template.progression.length] || 'C';
    const nextChord = CHORD_DATABASE[nextName] || getChordDetail(nextName);
    const root = chord.bassNote;
    const fifth = noteForMidi(midiForNote(root) + 7);
    const octave = noteForMidi(midiForNote(root) + 12);
    const third = chordToneNearBass(chord.notes[1] || root, root);
    const seventh = chordToneNearBass(chord.notes[chord.notes.length - 1] || root, root);
    const approach = noteForMidi(midiForNote(nextChord.bassNote) - 1);
    const fullChord = chord.notes.slice(0, 4);
    const upperChord = fullChord.slice(1);

    if (template.drumGroove === 'jazz_lofi') {
      add('drums', 'kick', bar, '0:0', ['C1'], '8n', 0.48);
      add('drums', 'snare', bar, '2:0', [], '16n', 0.22);
      add('drums', 'snare', bar, '3:0', [], '16n', 0.38);
      for (let beat = 0; beat < 4; beat++) {
        add('drums', 'hat', bar, `${beat}:0`, [], '32n', beat % 2 === 0 ? 0.16 : 0.11);
        add('drums', 'hat', bar, `${beat}:2`, [], '32n', 0.09, true);
      }
    } else if (template.drumGroove === 'funk_slap') {
      if (bar % 2 === 0) add('drums', 'kick', bar, '0:0', ['C1'], '8n', 0.85);
      add('drums', 'kick', bar, bar % 2 === 0 ? '2:2' : '0:2', ['C1'], '8n', 0.64);
      add('drums', 'snare', bar, '1:0', [], '16n', 0.72);
      add('drums', 'snare', bar, '3:0', [], '16n', 0.78);
      if (bar % 2 === 1) add('drums', 'snare', bar, '2:2', [], '16n', 0.24);
      for (let beat = 0; beat < 4; beat++) {
        add('drums', 'hat', bar, `${beat}:0`, [], '32n', 0.18);
        add('drums', 'hat', bar, `${beat}:2`, [], '32n', beat === 1 || beat === 3 ? 0.12 : 0.08);
      }
    } else if (template.drumGroove === 'folk_acoustic') {
      add('drums', 'kick', bar, '0:0', ['C1'], '8n', 0.5);
      if (bar % 2 === 1) add('drums', 'kick', bar, '2:0', ['C1'], '8n', 0.34);
      add('drums', 'snare', bar, '1:0', [], '16n', 0.3);
      add('drums', 'snare', bar, '3:0', [], '16n', 0.38);
      for (let beat = 0; beat < 4; beat++) {
        add('drums', 'hat', bar, `${beat}:2`, [], '32n', 0.08);
      }
    } else {
      add('drums', 'kick', bar, '0:0', ['C1'], '8n', 0.82);
      add('drums', 'kick', bar, '2:0', ['C1'], '8n', 0.72);
      add('drums', 'snare', bar, '1:0', [], '16n', 0.7);
      add('drums', 'snare', bar, '3:0', [], '16n', 0.78);
      for (let beat = 0; beat < 4; beat++) {
        add('drums', 'hat', bar, `${beat}:0`, [], '32n', 0.16);
        add('drums', 'hat', bar, `${beat}:2`, [], '32n', 0.1);
      }
    }

    if (template.bassLineType === 'walking_swing') {
      add('bass', 'bass', bar, '0:0', [root], '4n', 0.66);
      add('bass', 'bass', bar, '1:0', [fifth], '4n', 0.56);
      add('bass', 'bass', bar, '2:0', [octave], '4n', 0.6);
      add('bass', 'bass', bar, '3:0', [approach], '4n', 0.5);
    } else if (template.bassLineType === 'funk_syncopated') {
      add('bass', 'bass', bar, '0:0', [root], '8n', 0.9);
      add('bass', 'bass', bar, '0:3', [octave], '16n', 0.58);
      add('bass', 'bass', bar, '1:2', [fifth], '8n', 0.74);
      add('bass', 'bass', bar, '2:0', [root], '8n', 0.82);
      add('bass', 'bass', bar, '2:3', [third], '16n', 0.58);
      add('bass', 'bass', bar, '3:2', [seventh], '8n', 0.7);
    } else if (template.bassLineType === 'folk_warm') {
      add('bass', 'bass', bar, '0:0', [root], '2n', 0.62);
      add('bass', 'bass', bar, '2:0', [fifth], '2n', 0.5);
    } else {
      add('bass', 'bass', bar, '0:0', [root], '4n', 0.8);
      add('bass', 'bass', bar, '2:0', [fifth], '8n', 0.65);
      if (bar % 2 === 1) add('bass', 'bass', bar, '3:2', [approach], '8n', 0.48);
    }

    if (template.chordsStrumType === 'rhodes_chill') {
      add('chords', 'chord', bar, '1:0', upperChord, '8n', 0.48);
      add('chords', 'chord', bar, '3:2', upperChord, '8n', 0.38, true);
    } else if (template.chordsStrumType === 'funk_skank') {
      add('chords', 'chord', bar, '0:2', upperChord, '16n', 0.58);
      add('chords', 'chord', bar, '1:2', upperChord, '16n', 0.46);
      add('chords', 'chord', bar, '3:2', upperChord, '16n', 0.58);
    } else if (template.chordsStrumType === 'folk_strum') {
      const arpeggio = [fullChord[0], fullChord[1], fullChord[2], fullChord[3] || fullChord[2]];
      ['0:0', '0:2', '1:0', '1:2'].forEach((position, index) => {
        add('chords', 'chord', bar, position, [arpeggio[index]], '8n', index === 0 ? 0.62 : 0.46);
      });
      add('chords', 'chord', bar, '2:0', fullChord, '4n', 0.38);
    } else {
      add('chords', 'chord', bar, '0:0', fullChord, '8n', 0.62);
      add('chords', 'chord', bar, '2:0', fullChord, '8n', 0.46);
      if (bar === 3 || bar === 7) add('chords', 'chord', bar, '3:2', upperChord, '8n', 0.34);
    }
  }

  return plan;
}
