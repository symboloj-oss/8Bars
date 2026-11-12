import * as Tone from 'tone';
import { RoomTemplate, SlotInfo, SlotType } from '../types/music';
import { createTemplateScorePlan, ScoreEvent } from '../data/templateArrangements';

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
  private scorePlan: ReturnType<typeof createTemplateScorePlan> | null = null;
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
  private hihatSynth: Tone.NoiseSynth | null = null;
  private bassSynth: Tone.MonoSynth | null = null;
  private chordsSynth: Tone.PolySynth | null = null;
  private chordPlucks: Tone.PluckSynth[] = [];
  private chordPluckCursor = 0;
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

  private supportsAudioWorklet(): boolean {
    return typeof window !== 'undefined'
      && window.isSecureContext
      && typeof AudioWorkletNode !== 'undefined';
  }

  constructor() {
    // Lazy initialized on first user interaction
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Must be called from a user gesture when possible. If an earlier
    // background initialization is waiting for browser audio permission,
    // calling Tone.start() again here lets the gesture unlock that context.
    await Tone.start();

    await this.initializeNodes();
  }

  // Resume a suspended browser audio context from a user gesture, then make
  // sure the synth graph is ready. A plain initialize() stays safe for loading
  // remote audio in the background after the graph already exists.
  public async prepareAudio(): Promise<void> {
    await Tone.start();
    await this.initializeNodes();
  }

  private async initializeNodes(): Promise<void> {
    if (this.isInitialized) return;
    if (!this.initPromise) {
      const initPromise = this.doInitialize();
      this.initPromise = initPromise;
      try {
        await initPromise;
      } catch (error) {
        if (this.initPromise === initPromise) this.initPromise = null;
        throw error;
      }
      return;
    }
    await this.initPromise;
  }

  private async doInitialize(): Promise<void> {
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

    // White-noise hats sound closer to a shaker/brush than the metallic default,
    // which was making every template feel like the same electronic loop.
    this.hihatSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.02 },
    }).connect(this.channelNodes.drums.volume);
    this.hihatSynth.volume.value = -10;

    // Bass synth (warm vintage punch)
    this.bassSynth = new Tone.MonoSynth({
      oscillator: { type: 'triangle' },
      filter: { Q: 3, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.015, decay: 0.3, sustain: 0.4, release: 0.3 },
      filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2, baseFrequency: 120, octaves: 2.8 },
    }).connect(this.channelNodes.bass.volume);

    // Chords synth (lush acoustic/electric piano vibe)
    this.chordsSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.035, decay: 0.35, sustain: 0.3, release: 0.7 },
    }).connect(this.channelNodes.chords.volume);

    // Karplus-Strong uses AudioWorklet; insecure origins use the poly synth fallback.
    if (this.supportsAudioWorklet()) {
      try {
        for (let i = 0; i < 4; i++) {
          const pluck = new Tone.PluckSynth({ attackNoise: 1.2, dampening: 3200, resonance: 0.62, release: 0.2 });
          this.chordPlucks.push(pluck);
          pluck.connect(this.channelNodes.chords.volume);
        }
      } catch (error) {
        this.chordPlucks.forEach((pluck) => pluck.dispose());
        this.chordPlucks = [];
        console.warn('拨弦音色不可用，和弦将使用合成器播放', error);
      }
    }

    // Melody synth (expressive smooth lead)
    this.melodySynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.015, decay: 0.2, sustain: 0.4, release: 0.25 },
      portamento: 0,
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
    const sameArrangement =
      this.template?.drumGroove === template.drumGroove &&
      this.template?.bassLineType === template.bassLineType &&
      this.template?.chordsStrumType === template.chordsStrumType &&
      this.template?.melodyHookType === template.melodyHookType &&
      this.template?.progression.length === template.progression.length &&
      this.template?.progression.every((chord, i) => chord === template.progression[i]);
    const unchanged =
      this.template?.id === template.id &&
      sameArrangement &&
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
    this.scorePlan = createTemplateScorePlan(template);
    this.configureTemplateVoices(template);

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
    if (!this.template || !this.scorePlan) return;

    // 清空整条事件时间线。注意不能用逐条 clear(id):
    // Tone 内部 StateTimeline 的"最后调度时间"只有 cancel() 才会复位,
    // 切换模板后从 0:0:0 重新排事件会触发断言崩溃。
    Tone.getTransport().cancel(0);
    this.scheduledIds = [];

    for (const event of [
      ...this.scorePlan.drums,
      ...this.scorePlan.bass,
      ...this.scorePlan.chords,
      ...this.scorePlan.melody,
    ]) {
      const id = Tone.getTransport().schedule((time) => this.playScoreEvent(event, time), event.time);
      this.scheduledIds.push(id);
    }

    // Loop trigger for custom audio buffers sync
    const idLoop = Tone.getTransport().scheduleRepeat((time) => {
      this.playCustomBuffers(time);
    }, '8:0:0', 0);
    this.scheduledIds.push(idLoop);
  }

  private configureTemplateVoices(template: RoomTemplate): void {
    const isJazz = template.chordsStrumType === 'rhodes_chill';
    const isFunk = template.chordsStrumType === 'funk_skank';
    this.chordsSynth?.set({
      oscillator: { type: isJazz ? 'sine' : 'triangle' },
      envelope: {
        attack: isFunk ? 0.005 : 0.035,
        decay: isFunk ? 0.12 : 0.35,
        sustain: isFunk ? 0.08 : 0.3,
        release: isFunk ? 0.08 : 0.7,
      },
    });
  }

  private durationSeconds(duration: string): number {
    const beats: Record<string, number> = {
      '16n': 0.25,
      '8n': 0.5,
      '4n': 1,
      '2n': 2,
      '1m': 16,
    };
    return (60 / this.currentBpm) * (beats[duration] ?? 1);
  }

  private scoreEventOffsetSeconds(event: ScoreEvent): number {
    return (event.swingOffsetBeats || 0) * (60 / this.currentBpm);
  }

  private playScoreEvent(event: ScoreEvent, time: number): void {
    const slot = this.slots.find((candidate) => candidate.type === event.slotType);
    if (!slot || slot.isCustomTake) return;

    const scheduledTime = time + this.scoreEventOffsetSeconds(event);
    switch (event.kind) {
      case 'kick':
        this.kickSynth?.triggerAttackRelease(event.notes[0] || 'C1', event.duration, scheduledTime, event.velocity);
        break;
      case 'snare':
        this.snareSynth?.triggerAttackRelease(event.duration, scheduledTime, event.velocity);
        break;
      case 'hat':
        this.hihatSynth?.triggerAttackRelease(event.duration, scheduledTime, event.velocity);
        break;
      case 'bass':
        this.bassSynth?.triggerAttackRelease(event.notes[0], event.duration, scheduledTime, event.velocity);
        break;
      case 'chord':
        if (this.template?.chordsStrumType === 'rhodes_chill' || this.chordPlucks.length === 0) {
          this.chordsSynth?.triggerAttackRelease(event.notes, event.duration, scheduledTime, event.velocity);
        } else {
          this.playPluckedChord(this.chordPlucks, event, scheduledTime);
        }
        break;
      case 'melody':
        this.melodySynth?.triggerAttackRelease(event.notes[0], event.duration, scheduledTime, event.velocity);
        break;
    }
  }

  private playPluckedChord(voices: Tone.PluckSynth[], event: ScoreEvent, time: number): void {
    const duration = this.durationSeconds(event.duration);
    event.notes.forEach((note, index) => {
      const voiceIndex = event.notes.length === 1
        ? this.chordPluckCursor++ % voices.length
        : index % voices.length;
      const voice = voices[voiceIndex];
      const noteTime = time + index * 0.012;
      voice.triggerAttack(note, noteTime);
      voice.triggerRelease(noteTime + duration);
    });
  }

  // Set custom user recorded audio for a slot
  public async setSlotAudio(slotType: SlotType, blob: Blob, latencyOffsetMs: number = -80): Promise<void> {
    await this.initialize();
    const arrayBuffer = await blob.arrayBuffer();
    // 注意:decodeAudioData 会转移(detach)传入 buffer 的所有权,
    // 必须先把副本存起来,供离线导出时重新解码
    const exportBuffer = arrayBuffer.slice(0);
    const rawContext = Tone.getContext().rawContext;
    const audioBuffer = await rawContext.decodeAudioData(arrayBuffer);
    this.customAudioArrayBuffers.set(slotType, exportBuffer);
    this.customAudioBuffers.set(slotType, audioBuffer);
  }

  // 从远端 URL 加载真人 take(进入分享房间时使用),逻辑与 setSlotAudio 一致
  public async setSlotAudioFromUrl(slotType: SlotType, url: string): Promise<void> {
    await this.initialize();
    const res = await fetch(url);
    if (!res.ok) throw new Error('音频下载失败 HTTP ' + res.status);
    const arrayBuffer = await res.arrayBuffer();
    // 同上:先存副本再解码
    const exportBuffer = arrayBuffer.slice(0);
    const rawContext = Tone.getContext().rawContext;
    const audioBuffer = await rawContext.decodeAudioData(arrayBuffer);
    this.customAudioArrayBuffers.set(slotType, exportBuffer);
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
      const offsetSec = (slot.latencyOffsetMs ?? -80) / 1000;
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
    await this.prepareAudio();
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

  public async togglePlay(): Promise<void> {
    if (Tone.getTransport().state === 'started') {
      this.pause();
    } else {
      await this.start();
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
    if (!this.template || !this.scorePlan) throw new Error('No template loaded');

    const bpm = this.currentBpm;
    const duration = (32 * 60) / bpm;
    const template = this.template;
    const scorePlan = this.scorePlan;
    const slots = this.slots;

    const offlineBuffer = await Tone.Offline(async () => {
      Tone.getTransport().bpm.value = bpm;

      const anySolo = slots.some((slot) => slot.isSolo);
      const offlineChannels: Record<SlotType, { volume: Tone.Volume; panner: Tone.Panner }> = {} as any;
      const channelPosition: Record<SlotType, number> = {
        drums: 0,
        bass: 0,
        chords: -0.25,
        melody: 0.2,
      };
      for (const slotType of ['drums', 'bass', 'chords', 'melody'] as SlotType[]) {
        const slot = slots.find((candidate) => candidate.type === slotType);
        const muted = !slot || (anySolo ? !slot.isSolo : slot.isMuted);
        const volume = new Tone.Volume(slot && slot.volume > 0.001 ? Tone.gainToDb(slot.volume) : -96);
        volume.mute = muted;
        const panner = new Tone.Panner(channelPosition[slotType]);
        volume.connect(panner);
        panner.toDestination();
        offlineChannels[slotType] = { volume, panner };
      }

      const offKick = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.35, sustain: 0.01, release: 0.2 },
      }).connect(offlineChannels.drums.volume);
      const offSnare = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0.01, release: 0.1 },
      }).connect(offlineChannels.drums.volume);
      const offHat = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.02 },
      }).connect(offlineChannels.drums.volume);
      offHat.volume.value = -10;
      const offBass = new Tone.MonoSynth({
        oscillator: { type: 'triangle' },
        filter: { Q: 3, type: 'lowpass', rolloff: -24 },
        envelope: { attack: 0.015, decay: 0.3, sustain: 0.4, release: 0.3 },
        filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2, baseFrequency: 120, octaves: 2.8 },
      }).connect(offlineChannels.bass.volume);
      const isJazz = template.chordsStrumType === 'rhodes_chill';
      const isFunk = template.chordsStrumType === 'funk_skank';
      const offChords = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: isJazz ? 'sine' : 'triangle' },
        envelope: {
          attack: isFunk ? 0.005 : 0.035,
          decay: isFunk ? 0.12 : 0.35,
          sustain: isFunk ? 0.08 : 0.3,
          release: isFunk ? 0.08 : 0.7,
        },
      }).connect(offlineChannels.chords.volume);
      const offChordPlucks = this.supportsAudioWorklet()
        ? Array.from({ length: 4 }, () =>
            new Tone.PluckSynth({ attackNoise: 1.2, dampening: 3200, resonance: 0.62, release: 0.2 })
              .connect(offlineChannels.chords.volume),
          )
        : [];
      const offMelody = new Tone.Synth({
        oscillator: { type: isJazz ? 'sine' : 'triangle' },
        envelope: {
          attack: isFunk ? 0.004 : 0.015,
          decay: isFunk ? 0.12 : 0.2,
          sustain: isFunk ? 0.12 : 0.4,
          release: isFunk ? 0.08 : 0.25,
        },
        portamento: 0,
      }).connect(offlineChannels.melody.volume);

      let pluckCursor = 0;
      const events = [
        ...scorePlan.drums,
        ...scorePlan.bass,
        ...scorePlan.chords,
        ...scorePlan.melody,
      ];
      for (const event of events) {
        const slot = slots.find((candidate) => candidate.type === event.slotType);
        if (!slot || slot.isCustomTake) continue;
        const [bar, beat, sixteenth] = event.time.split(':').map(Number);
        const baseTime = ((bar * 4) + beat + sixteenth / 4) * (60 / bpm);
        const time = baseTime + (event.swingOffsetBeats || 0) * (60 / bpm);
        switch (event.kind) {
          case 'kick':
            offKick.triggerAttackRelease(event.notes[0] || 'C1', event.duration, time, event.velocity);
            break;
          case 'snare':
            offSnare.triggerAttackRelease(event.duration, time, event.velocity);
            break;
          case 'hat':
            offHat.triggerAttackRelease(event.duration, time, event.velocity);
            break;
          case 'bass':
            offBass.triggerAttackRelease(event.notes[0], event.duration, time, event.velocity);
            break;
          case 'chord':
            if (template.chordsStrumType === 'rhodes_chill' || offChordPlucks.length === 0) {
              offChords.triggerAttackRelease(event.notes, event.duration, time, event.velocity);
            } else {
              const durationSeconds = this.durationSeconds(event.duration);
              event.notes.forEach((note, index) => {
                const voiceIndex = event.notes.length === 1 ? pluckCursor++ % offChordPlucks.length : index % offChordPlucks.length;
                const voice = offChordPlucks[voiceIndex];
                const noteTime = time + index * 0.012;
                voice.triggerAttack(note, noteTime);
                voice.triggerRelease(noteTime + durationSeconds);
              });
            }
            break;
          case 'melody':
            offMelody.triggerAttackRelease(event.notes[0], event.duration, time, event.velocity);
            break;
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
          const channel = offlineChannels[slot.type];
          if (channel) Tone.connect(src, channel.volume);
          // 与 playCustomBuffers 相同的延迟对齐语义
          const offsetSec = (slot.latencyOffsetMs ?? -80) / 1000;
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
