import * as Tone from 'tone';
import { RoomTemplate, SlotInfo, SlotType } from '../types/music';
import { CHORD_DATABASE } from '../data/chords';

export interface TransportState {
  isPlaying: boolean;
  currentBar: number; // 0 to 7 (1st to 8th bar)
  currentBeat: number; // 0 to 3 (1st to 4th beat)
  currentChord: string;
  nextChord: string;
  progress: number; // 0.0 to 1.0
  elapsedSeconds: number;
  totalSeconds: number;
}

export type TransportListener = (state: TransportState) => void;

class AudioEngine {
  private isInitialized = false;
  private template: RoomTemplate | null = null;
  private slots: SlotInfo[] = [];
  private currentBpm = 120;
  private transportListeners: Set<TransportListener> = new Set();
  private animationFrameId: number | null = null;
  private loopEventId: number | null = null;

  // Track channels & nodes
  private masterVolume: Tone.Volume | null = null;
  private channelNodes: Record<SlotType, {
    volume: Tone.Volume;
    meter: Tone.Meter;
    panner: Tone.Panner;
  }> = {} as any;

  // Synthesizers for cold-start (AI Virtual Musicians)
  private kickSynth: Tone.MembraneSynth | null = null;
  private snareSynth: Tone.NoiseSynth | null = null;
  private hihatSynth: Tone.MetalSynth | null = null;
  private bassSynth: Tone.MonoSynth | null = null;
  private chordsSynth: Tone.PolySynth | null = null;
  private melodySynth: Tone.Synth | null = null;

  // Custom user audio buffers
  private customAudioBuffers: Map<SlotType, AudioBuffer> = new Map();
  // 原始 ArrayBuffer 副本:导出 WAV 时在离线上下文里重新解码使用
  private customAudioArrayBuffers: Map<SlotType, ArrayBuffer> = new Map();
  private activeBufferSources: Map<SlotType, AudioBufferSourceNode> = new Map();

  // Scheduled sequence IDs for teardown
  private scheduledIds: number[] = [];

  // Metronome for count-in
  private metronomeSynth: Tone.Synth | null = null;

  // 并发安全的初始化:所有调用共享同一个初始化 Promise,
  // 避免 StrictMode 双调用/多组件同时触发时重复执行 Tone.start()
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Lazy initialized on first user interaction
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (!this.initPromise) {
      this.initPromise = this.doInitialize();
    }
    await this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    await Tone.start();
    Tone.getContext().lookAhead = 0.05;

    // Master bus
    this.masterVolume = new Tone.Volume(0).toDestination();

    // Create 4 distinct channel strips
    const slotTypes: SlotType[] = ['drums', 'bass', 'chords', 'melody'];
    for (const type of slotTypes) {
      const vol = new Tone.Volume(0);
      const meter = new Tone.Meter();
      const panner = new Tone.Panner(
        type === 'bass' ? 0 : type === 'chords' ? -0.25 : type === 'melody' ? 0.2 : 0
      );

      vol.connect(meter);
      meter.connect(panner);
      panner.connect(this.masterVolume);

      this.channelNodes[type] = {
        volume: vol,
        meter,
        panner,
      };
    }

    // Drum synths
    this.kickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.35, sustain: 0.01, release: 0.2 },
    }).connect(this.channelNodes.drums.volume);

    this.snareSynth = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0.01, release: 0.1 },
    }).connect(this.channelNodes.drums.volume);

    this.hihatSynth = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.08, release: 0.05 },
      harmonicity: 4.8,
      modulationIndex: 28,
      resonance: 2500,
      octaves: 1.2,
    }).connect(this.channelNodes.drums.volume);
    this.hihatSynth.volume.value = -8;

    // Bass synth (warm vintage punch)
    this.bassSynth = new Tone.MonoSynth({
      oscillator: { type: 'triangle' },
      filter: { Q: 3, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.015, decay: 0.3, sustain: 0.4, release: 0.3 },
      filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2, baseFrequency: 120, octaves: 2.8 },
    }).connect(this.channelNodes.bass.volume);

    // Chords synth (lush acoustic/electric piano vibe)
    this.chordsSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsine', spread: 20, count: 3 },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.35, release: 0.8 },
    }).connect(this.channelNodes.chords.volume);

    // Melody synth (expressive smooth lead)
    this.melodySynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.04, decay: 0.2, sustain: 0.5, release: 0.4 },
      portamento: 0.05,
    }).connect(this.channelNodes.melody.volume);

    // Metronome
    this.metronomeSynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
    }).toDestination();
    this.metronomeSynth.volume.value = -4;

    this.isInitialized = true;
  }

  // Instant interactive preview of chord notes
  public async previewChord(notes: string[]): Promise<void> {
    await this.initialize();
    if (!this.chordsSynth) return;
    const now = Tone.now();
    // Arpeggiated strum effect: small 15ms stagger per note
    notes.forEach((note, idx) => {
      this.chordsSynth?.triggerAttackRelease(note, '4n', now + idx * 0.02, 0.8);
    });
  }

  // Guitar / Ukulele reference pitch pipe (e.g. E2, A2, D3, G3, B3, E4, or A4 440Hz)
  public async playPitchReference(note: string = 'A4'): Promise<void> {
    await this.initialize();
    if (!this.melodySynth) return;
    const now = Tone.now();
    this.melodySynth.triggerAttackRelease(note, '1.5', now, 0.7);
  }

  public async setTemplateAndSlots(template: RoomTemplate, slots: SlotInfo[], bpmOverride?: number): Promise<void> {
    await this.initialize();

    // 内容没变就跳过重排:StrictMode 双调用/重复 setState 会走到这里,
    // 重复排程会触发 Tone 时间线断言("time must be greater than last scheduled")
    const bpm = bpmOverride ?? template.bpm;
    const unchanged =
      this.template?.id === template.id &&
      this.currentBpm === bpm &&
      this.slots.length === slots.length &&
      this.slots.every((s, i) => {
        const o = slots[i];
        return (
          !!o &&
          s.type === o.type &&
          s.volume === o.volume &&
          s.isMuted === o.isMuted &&
          s.isSolo === o.isSolo &&
          s.isCustomTake === o.isCustomTake &&
          s.latencyOffsetMs === o.latencyOffsetMs
        );
      });
    if (unchanged) {
      this.template = template;
      this.slots = slots;
      return;
    }

    // 重排前先停表归零:播放中重排会把事件排到错误的时间轴上
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;

    this.template = template;
    this.slots = slots;
    // 房间行 bpm 是权威值(种子房可能和模板默认值不同),无覆盖时用模板默认
    this.currentBpm = bpm;

    // Set Transport BPM
    Tone.getTransport().bpm.value = this.currentBpm;

    // Set 8-bar loop
    Tone.getTransport().loop = true;
    Tone.getTransport().loopStart = 0;
    Tone.getTransport().loopEnd = '8:0:0';

    // Apply track volume, mute, solo
    this.updateChannelMix();

    // Schedule all 8 bars procedural notes
    this.scheduleScore();
  }

  public updateSlots(slots: SlotInfo[]): void {
    this.slots = slots;
    this.updateChannelMix();
  }

  public updateChannelMix(): void {
    if (!this.isInitialized) return;

    const anySolo = this.slots.some(s => s.isSolo);

    for (const slot of this.slots) {
      const channel = this.channelNodes[slot.type];
      if (!channel) continue;

      let effectiveMute = slot.isMuted;
      if (anySolo) {
        effectiveMute = !slot.isSolo;
      }

      if (effectiveMute) {
        channel.volume.mute = true;
      } else {
        channel.volume.mute = false;
        // Convert 0..1 to dB: e.g. 0.8 -> ~ -4dB, 0 -> -Infinity
        const db = slot.volume <= 0.001 ? -96 : Tone.gainToDb(slot.volume);
        channel.volume.volume.value = db;
      }
    }
  }

  private scheduleScore(): void {
    if (!this.template) return;

    // 清空整条事件时间线。注意不能用逐条 clear(id):
    // Tone 内部 StateTimeline 的"最后调度时间"只有 cancel() 才会复位,
    // 切换模板后从 0:0:0 重新排事件会触发断言崩溃。
    Tone.getTransport().cancel(0);
    this.scheduledIds = [];

    const bpm = this.template.bpm;
    const progression = this.template.progression; // 8 items

    // 1. DRUMS (32 beats = 8 bars)
    for (let bar = 0; bar < 8; bar++) {
      for (let beat = 0; beat < 4; beat++) {
        const timeStr = `${bar}:${beat}:0`;
        const time8th = `${bar}:${beat}:2`;

        // Kick pattern: always on beat 1 and beat 3 (plus syncopations)
        const idKick = Tone.getTransport().schedule((time) => {
          const slot = this.slots.find(s => s.type === 'drums');
          if (slot?.isCustomTake) return; // Mute AI synth if user has recorded audio
          if (beat === 0 || beat === 2 || (beat === 3 && (bar === 3 || bar === 7))) {
            this.kickSynth?.triggerAttackRelease('C1', '8n', time, 0.9);
          }
        }, timeStr);
        this.scheduledIds.push(idKick);

        // Snare pattern: on beat 2 and beat 4
        const idSnare = Tone.getTransport().schedule((time) => {
          const slot = this.slots.find(s => s.type === 'drums');
          if (slot?.isCustomTake) return;
          if (beat === 1 || beat === 3) {
            this.snareSynth?.triggerAttackRelease('16n', time, 0.85);
          }
        }, timeStr);
        this.scheduledIds.push(idSnare);

        // Hi-Hat pattern: steady 8th notes
        const idHat1 = Tone.getTransport().schedule((time) => {
          const slot = this.slots.find(s => s.type === 'drums');
          if (slot?.isCustomTake) return;
          this.hihatSynth?.triggerAttackRelease('32n', time, 0.5);
        }, timeStr);
        const idHat2 = Tone.getTransport().schedule((time) => {
          const slot = this.slots.find(s => s.type === 'drums');
          if (slot?.isCustomTake) return;
          this.hihatSynth?.triggerAttackRelease('32n', time, 0.35);
        }, time8th);
        this.scheduledIds.push(idHat1, idHat2);
      }
    }

    // 2. BASS (Following chord roots + groove)
    for (let bar = 0; bar < 8; bar++) {
      const chordName = progression[bar % progression.length];
      const chord = CHORD_DATABASE[chordName];
      const bassNote = chord ? chord.bassNote : 'C2';
      // Octave or fifth helper
      const rootLetter = chord?.root || 'C';

      for (let beat = 0; beat < 4; beat++) {
        const timeStr = `${bar}:${beat}:0`;
        const idBass = Tone.getTransport().schedule((time) => {
          const slot = this.slots.find(s => s.type === 'bass');
          if (slot?.isCustomTake) return;

          // Groove: Beat 1 = root, Beat 2.5/3 = fifth or octave, Beat 4 = passing note
          if (beat === 0) {
            this.bassSynth?.triggerAttackRelease(bassNote, '4n', time, 0.95);
          } else if (beat === 2) {
            this.bassSynth?.triggerAttackRelease(bassNote, '8n', time, 0.85);
          } else if (beat === 3 && bar % 2 === 1) {
            // Passing chromatic
            this.bassSynth?.triggerAttackRelease(rootLetter + '1', '16n', time, 0.7);
          }
        }, timeStr);
        this.scheduledIds.push(idBass);
      }
    }

    // 3. CHORDS (Acoustic / Electric Keys Rhythm)
    for (let bar = 0; bar < 8; bar++) {
      const chordName = progression[bar % progression.length];
      const chord = CHORD_DATABASE[chordName];
      const notes = chord?.notes || ['C4', 'E4', 'G4'];

      // Strum rhythm: Beat 1, Beat 2 (syncopated), Beat 3, Beat 4
      const idChords1 = Tone.getTransport().schedule((time) => {
        const slot = this.slots.find(s => s.type === 'chords');
        if (slot?.isCustomTake) return;
        this.chordsSynth?.triggerAttackRelease(notes, '2n', time, 0.85);
      }, `${bar}:0:0`);

      const idChords2 = Tone.getTransport().schedule((time) => {
        const slot = this.slots.find(s => s.type === 'chords');
        if (slot?.isCustomTake) return;
        this.chordsSynth?.triggerAttackRelease(notes, '4n', time, 0.75);
      }, `${bar}:2:0`);

      const idChords3 = Tone.getTransport().schedule((time) => {
        const slot = this.slots.find(s => s.type === 'chords');
        if (slot?.isCustomTake) return;
        this.chordsSynth?.triggerAttackRelease(notes, '8n', time, 0.65);
      }, `${bar}:3:2`);

      this.scheduledIds.push(idChords1, idChords2, idChords3);
    }

    // 4. MELODY (Catchy 8-bar musical motif)
    // Melodic sequence spanning 8 bars
    const melodyScaleNotes = this.getMelodyPattern(this.template.id);
    for (let bar = 0; bar < 8; bar++) {
      const phrase = melodyScaleNotes[bar % melodyScaleNotes.length];
      for (const item of phrase) {
        const timeStr = `${bar}:${item.beat}`;
        const idMelody = Tone.getTransport().schedule((time) => {
          const slot = this.slots.find(s => s.type === 'melody');
          if (slot?.isCustomTake) return;
          this.melodySynth?.triggerAttackRelease(item.note, item.duration, time, 0.9);
        }, timeStr);
        this.scheduledIds.push(idMelody);
      }
    }

    // Loop trigger for custom audio buffers sync
    const idLoop = Tone.getTransport().scheduleRepeat((time) => {
      this.playCustomBuffers(time);
    }, '8:0:0', 0);
    this.scheduledIds.push(idLoop);
  }

  private getMelodyPattern(templateId: string): Array<Array<{ beat: string; note: string; duration: string }>> {
    if (templateId === 'midnight-jazz') {
      return [
        [{ beat: '0:2', note: 'F4', duration: '8n' }, { beat: '1:0', note: 'A4', duration: '4n' }, { beat: '2:2', note: 'C5', duration: '4n' }],
        [{ beat: '0:0', note: 'B4', duration: '4n' }, { beat: '2:0', note: 'G4', duration: '2n' }],
        [{ beat: '0:2', note: 'E4', duration: '8n' }, { beat: '1:0', note: 'G4', duration: '4n' }, { beat: '2:2', note: 'B4', duration: '4n' }],
        [{ beat: '0:0', note: 'C#5', duration: '4n' }, { beat: '2:0', note: 'A4', duration: '2n' }],
        [{ beat: '0:2', note: 'D5', duration: '8n' }, { beat: '1:0', note: 'C5', duration: '4n' }, { beat: '2:0', note: 'A4', duration: '4n' }],
        [{ beat: '0:0', note: 'F4', duration: '4n' }, { beat: '2:0', note: 'D4', duration: '2n' }],
        [{ beat: '0:2', note: 'E4', duration: '8n' }, { beat: '1:2', note: 'G4', duration: '8n' }, { beat: '2:0', note: 'C5', duration: '2n' }],
        [{ beat: '0:0', note: 'E5', duration: '4n' }, { beat: '2:0', note: 'C5', duration: '2n' }],
      ];
    } else if (templateId === 'retro-funk') {
      return [
        [{ beat: '0:0', note: 'E4', duration: '16n' }, { beat: '0:2', note: 'G4', duration: '16n' }, { beat: '1:0', note: 'E4', duration: '8n' }],
        [{ beat: '0:0', note: 'A4', duration: '8n' }, { beat: '1:2', note: 'C5', duration: '8n' }, { beat: '2:0', note: 'A4', duration: '4n' }],
        [{ beat: '0:0', note: 'E4', duration: '16n' }, { beat: '0:2', note: 'G4', duration: '16n' }, { beat: '1:0', note: 'B4', duration: '8n' }],
        [{ beat: '0:0', note: 'D#5', duration: '8n' }, { beat: '1:2', note: 'F#5', duration: '8n' }, { beat: '2:0', note: 'B4', duration: '2n' }],
        [{ beat: '0:0', note: 'E5', duration: '8n' }, { beat: '1:0', note: 'D5', duration: '8n' }, { beat: '2:0', note: 'B4', duration: '4n' }],
        [{ beat: '0:0', note: 'A4', duration: '8n' }, { beat: '1:0', note: 'G4', duration: '8n' }, { beat: '2:0', note: 'E4', duration: '4n' }],
        [{ beat: '0:0', note: 'G4', duration: '16n' }, { beat: '0:2', note: 'A4', duration: '16n' }, { beat: '1:0', note: 'B4', duration: '4n' }],
        [{ beat: '0:0', note: 'E4', duration: '2n' }],
      ];
    }

    // Default: Friday Pop (Uplifting C-G-Am-F Hook)
    return [
      [{ beat: '0:0', note: 'G4', duration: '4n' }, { beat: '1:2', note: 'C5', duration: '4n' }, { beat: '3:0', note: 'E5', duration: '4n' }],
      [{ beat: '0:0', note: 'D5', duration: '2n' }, { beat: '2:2', note: 'B4', duration: '4n' }],
      [{ beat: '0:0', note: 'C5', duration: '4n' }, { beat: '1:2', note: 'A4', duration: '4n' }, { beat: '3:0', note: 'C5', duration: '4n' }],
      [{ beat: '0:0', note: 'A4', duration: '2n' }, { beat: '2:2', note: 'F4', duration: '4n' }],
      [{ beat: '0:0', note: 'G4', duration: '4n' }, { beat: '1:2', note: 'C5', duration: '4n' }, { beat: '3:0', note: 'E5', duration: '4n' }],
      [{ beat: '0:0', note: 'D5', duration: '2n' }, { beat: '2:2', note: 'G5', duration: '4n' }],
      [{ beat: '0:0', note: 'E5', duration: '4n' }, { beat: '1:2', note: 'D5', duration: '4n' }, { beat: '2:2', note: 'C5', duration: '4n' }],
      [{ beat: '0:0', note: 'C5', duration: '1m' }],
    ];
  }

  // Set custom user recorded audio for a slot
  public async setSlotAudio(slotType: SlotType, blob: Blob, latencyOffsetMs: number = -80): Promise<void> {
    await this.initialize();
    const arrayBuffer = await blob.arrayBuffer();
    // 注意:decodeAudioData 会转移(detach)传入 buffer 的所有权,
    // 必须先把副本存起来,供离线导出时重新解码
    this.customAudioArrayBuffers.set(slotType, arrayBuffer.slice(0));
    const rawContext = Tone.getContext().rawContext;
    const audioBuffer = await rawContext.decodeAudioData(arrayBuffer);
    this.customAudioBuffers.set(slotType, audioBuffer);
  }

  // 从远端 URL 加载真人 take(进入分享房间时使用),逻辑与 setSlotAudio 一致
  public async setSlotAudioFromUrl(slotType: SlotType, url: string): Promise<void> {
    await this.initialize();
    const res = await fetch(url);
    if (!res.ok) throw new Error('音频下载失败 HTTP ' + res.status);
    const arrayBuffer = await res.arrayBuffer();
    // 同上:先存副本再解码
    this.customAudioArrayBuffers.set(slotType, arrayBuffer.slice(0));
    const rawContext = Tone.getContext().rawContext;
    const audioBuffer = await rawContext.decodeAudioData(arrayBuffer);
    this.customAudioBuffers.set(slotType, audioBuffer);
  }

  public removeSlotAudio(slotType: SlotType): void {
    this.customAudioBuffers.delete(slotType);
    this.customAudioArrayBuffers.delete(slotType);
    const active = this.activeBufferSources.get(slotType);
    if (active) {
      try { active.stop(); } catch (e) {}
      this.activeBufferSources.delete(slotType);
    }
  }

  private playCustomBuffers(scheduledTime: number): void {
    const rawContext = Tone.getContext().rawContext;

    for (const [slotType, buffer] of this.customAudioBuffers.entries()) {
      const slot = this.slots.find(s => s.type === slotType);
      if (!slot || !slot.isCustomTake) continue;

      // Stop previous
      const oldSource = this.activeBufferSources.get(slotType);
      if (oldSource) {
        try { oldSource.stop(); } catch (e) {}
      }

      // Hardware latency compensation (offset in seconds)
      const offsetSec = (slot.latencyOffsetMs || -80) / 1000;
      // Start buffer: if negative offset, play starting at Math.abs(offsetSec)
      const bufferOffset = offsetSec < 0 ? Math.abs(offsetSec) : 0;
      const startTime = scheduledTime + (offsetSec > 0 ? offsetSec : 0);

      const source = rawContext.createBufferSource();
      source.buffer = buffer;

      // Connect to channel volume node
      const channel = this.channelNodes[slotType];
      if (channel) {
        // Connect raw audio node to Tone channel
        Tone.connect(source, channel.volume);
      }

      source.start(startTime, bufferOffset);
      this.activeBufferSources.set(slotType, source);
    }
  }

  public async start(): Promise<void> {
    await this.initialize();
    if (Tone.getTransport().state !== 'started') {
      Tone.getTransport().start();
      this.startProgressTicker();
    }
  }

  public stop(): void {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    this.stopProgressTicker();

    // Stop all active buffer sources
    for (const [type, source] of this.activeBufferSources.entries()) {
      try { source.stop(); } catch (e) {}
    }
    this.activeBufferSources.clear();
    this.notifyState();
  }

  public pause(): void {
    Tone.getTransport().pause();
    this.stopProgressTicker();
    for (const [type, source] of this.activeBufferSources.entries()) {
      try { source.stop(); } catch (e) {}
    }
    this.activeBufferSources.clear();
    this.notifyState();
  }

  public togglePlay(): void {
    if (Tone.getTransport().state === 'started') {
      this.pause();
    } else {
      this.start();
    }
  }

  public playCountInBeat(beat: number): void {
    if (!this.isInitialized || !this.metronomeSynth) return;
    const now = Tone.now();
    if (beat === 1) {
      // High pitch for beat 1
      this.metronomeSynth.triggerAttackRelease('A5', '16n', now, 1.0);
    } else {
      // Lower pitch for beats 2, 3, 4
      this.metronomeSynth.triggerAttackRelease('E5', '16n', now, 0.8);
    }
  }

  public getTrackMeter(slotType: SlotType): number {
    if (!this.isInitialized) return 0;
    const meter = this.channelNodes[slotType]?.meter;
    if (!meter) return 0;
    const val = meter.getValue();
    const db = typeof val === 'number' ? val : val[0] || -100;
    // Map -60dB..0dB to 0..1
    const normalized = Math.max(0, Math.min(1, (db + 50) / 50));
    return normalized;
  }

  // Subscribe to transport updates (bars, beats, progress)
  public subscribe(listener: TransportListener): () => void {
    this.transportListeners.add(listener);
    return () => this.transportListeners.delete(listener);
  }

  private startProgressTicker(): void {
    if (this.animationFrameId) return;

    const tick = () => {
      this.notifyState();
      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  private stopProgressTicker(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private notifyState(): void {
    if (!this.template) return;
    const isPlaying = Tone.getTransport().state === 'started';
    const bpm = this.currentBpm;
    const totalSeconds = (32 * 60) / bpm; // 8 bars * 4 beats

    // Tone.getTransport().seconds
    const rawSeconds = Tone.getTransport().seconds;
    const elapsedSeconds = isPlaying ? (rawSeconds % totalSeconds) : 0;
    const progress = Math.max(0, Math.min(1, elapsedSeconds / totalSeconds));

    // Calculate bar and beat
    const beatsTotal = (elapsedSeconds / 60) * bpm;
    const currentBar = Math.min(7, Math.max(0, Math.floor(beatsTotal / 4)));
    const currentBeat = Math.min(3, Math.max(0, Math.floor(beatsTotal % 4)));

    const progression = this.template.progression;
    const currentChord = progression[currentBar % progression.length] || 'C';
    const nextChord = progression[(currentBar + 1) % progression.length] || 'G';

    const state: TransportState = {
      isPlaying,
      currentBar,
      currentBeat,
      currentChord,
      nextChord,
      progress,
      elapsedSeconds,
      totalSeconds,
    };

    for (const listener of this.transportListeners) {
      listener(state);
    }
  }

  // Export 8-bar mixdown as a high-quality WAV audio file
  public async exportMixdownWav(): Promise<Blob> {
    await this.initialize();
    if (!this.template) throw new Error('No template loaded');

    const bpm = this.currentBpm;
    const duration = (32 * 60) / bpm;

    const offlineBuffer = await Tone.Offline(async () => {
      // Recreate a master offline bus
      const offlineBpm = this.currentBpm;
      Tone.getTransport().bpm.value = offlineBpm;

      // Synthesize full 8 bars offline
      const offKick = new Tone.MembraneSynth().toDestination();
      const offSnare = new Tone.NoiseSynth().toDestination();
      const offBass = new Tone.MonoSynth({ oscillator: { type: 'triangle' } }).toDestination();
      const offChords = new Tone.PolySynth().toDestination();
      const offMelody = new Tone.Synth({ oscillator: { type: 'triangle' } }).toDestination();

      const progression = this.template!.progression;

      for (let bar = 0; bar < 8; bar++) {
        const chordName = progression[bar % progression.length];
        const chord = CHORD_DATABASE[chordName];
        const notes = chord?.notes || ['C4', 'E4', 'G4'];
        const bassNote = chord ? chord.bassNote : 'C2';

        for (let beat = 0; beat < 4; beat++) {
          const time = `${bar}:${beat}:0`;
          const drumSlot = this.slots.find(s => s.type === 'drums');
          if (!drumSlot?.isCustomTake) {
            if (beat === 0 || beat === 2) offKick.triggerAttackRelease('C1', '8n', time, 0.9);
            if (beat === 1 || beat === 3) offSnare.triggerAttackRelease('16n', time, 0.8);
          }

          const bassSlot = this.slots.find(s => s.type === 'bass');
          if (!bassSlot?.isCustomTake && beat === 0) {
            offBass.triggerAttackRelease(bassNote, '4n', time, 0.9);
          }
        }

        const chordSlot = this.slots.find(s => s.type === 'chords');
        if (!chordSlot?.isCustomTake) {
          offChords.triggerAttackRelease(notes, '2n', `${bar}:0:0`, 0.8);
        }
      }

      // 混入真人 take:在离线上下文里重新解码(不能跨上下文复用 AudioBuffer,
      // 且 decodeAudioData 会转移 ArrayBuffer 所有权,所以传副本)
      const offlineCtx = Tone.getContext().rawContext;
      for (const slot of this.slots) {
        if (!slot.isCustomTake) continue;
        const arrayBuf = this.customAudioArrayBuffers.get(slot.type);
        if (!arrayBuf) continue;
        try {
          const buffer = await offlineCtx.decodeAudioData(arrayBuf.slice(0));
          const src = offlineCtx.createBufferSource();
          src.buffer = buffer;
          src.connect(offlineCtx.destination);
          // 与 playCustomBuffers 相同的延迟对齐语义
          const offsetSec = (slot.latencyOffsetMs || -80) / 1000;
          const bufferOffset = offsetSec < 0 ? Math.abs(offsetSec) : 0;
          const startTime = offsetSec > 0 ? offsetSec : 0;
          src.start(startTime, bufferOffset);
        } catch (e) {
          console.warn('离线渲染:席位音频解码失败', slot.type, e);
        }
      }

      Tone.getTransport().start(0);
    }, duration);

    // Convert AudioBuffer to WAV
    const rendered = offlineBuffer.get();
    if (!rendered) {
      throw new Error('Offline buffer rendering failed');
    }
    return this.audioBufferToWavBlob(rendered);
  }

  private audioBufferToWavBlob(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    const channels: Float32Array[] = [];
    let sampleRate = buffer.sampleRate;
    let offset = 0;
    let pos = 0;

    function setUint16(data: number) {
      out.setUint16(pos, data, true);
      pos += 2;
    }
    function setUint32(data: number) {
      out.setUint32(pos, data, true);
      pos += 4;
    }

    // RIFF chunk
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    // FMT chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // 16 for PCM
    setUint16(1); // PCM
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // 16-bit

    // DATA chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out], { type: 'audio/wav' });
  }
}

export const audioEngine = new AudioEngine();

// 调试钩子:浏览器控制台/无头测试可用 window.__audioEngine 访问引擎
if (typeof window !== 'undefined') {
  (window as any).__audioEngine = audioEngine;
}
