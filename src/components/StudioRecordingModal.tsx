"use client";
import React, { useState, useEffect, useRef } from 'react';
import { RoomTemplate, SlotInfo, SlotType, ChordDetail } from '../types/music';
import { audioEngine, TransportState } from '../services/audioEngine';
import { ChordFretboard } from './ChordFretboard';
import { PianoChordView } from './PianoChordView';
import { ChordTeleprompter } from './ChordTeleprompter';
import { getChordDetail } from '../data/chords';
import { getCharacterForSlot } from '../data/characters';
import {
  Mic,
  Headphones,
  RotateCcw,
  Check,
  X,
  Sliders,
  Play,
  Pause,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudioRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSlot: SlotInfo;
  allSlots: SlotInfo[];
  template: RoomTemplate;
  onSaveRecording: (slotType: SlotType, blob: Blob, latencyOffsetMs: number, musicianName: string) => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

type StudioPhase = 'headphone_warning' | 'ready' | 'counting_in' | 'recording' | 'review';

export const StudioRecordingModal: React.FC<StudioRecordingModalProps> = ({
  isOpen,
  onClose,
  targetSlot,
  allSlots,
  template,
  onSaveRecording,
  t = (k) => k,
}) => {
  const [phase, setPhase] = useState<StudioPhase>('headphone_warning');
  const [countInBeat, setCountInBeat] = useState<number>(4);
  const [latencyOffsetMs, setLatencyOffsetMs] = useState<number>(-80);
  // 记忆上次用过的昵称,新访客随机一个
  const [musicianName, setMusicianName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('8bars_nickname');
      if (saved) return saved;
    } catch (e) {}
    return '小吉他手 @' + Math.floor(Math.random() * 900 + 100);
  });
  const [activeTab, setActiveTab] = useState<'guitar' | 'piano'>('guitar');
  const [micVolumeLevel, setMicVolumeLevel] = useState<number>(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isReviewPlaying, setIsReviewPlaying] = useState<boolean>(false);

  // Transport tracking
  const [transportState, setTransportState] = useState<TransportState>({
    isPlaying: false,
    currentBar: 0,
    currentBeat: 0,
    currentChord: template.progression[0],
    nextChord: template.progression[1],
    progress: 0,
    elapsedSeconds: 0,
    totalSeconds: (32 * 60) / template.bpm,
  });

  // MediaRecorder and Audio context refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const countInTimerRef = useRef<any>(null);

  // Stop background music when studio opens
  useEffect(() => {
    if (isOpen) {
      audioEngine.pause();
      setPhase('headphone_warning');
      setRecordedAudioBlob(null);
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl(null);
      }
    } else {
      cleanupMic();
      audioEngine.stop();
    }
    return () => {
      cleanupMic();
    };
  }, [isOpen]);

  // Subscribe to transport state
  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((state) => {
      setTransportState(state);
      // Auto-stop when completed 8 bars during recording
      if (phase === 'recording' && state.elapsedSeconds >= state.totalSeconds - 0.1) {
        stopRecording();
      }
    });
    return unsubscribe;
  }, [phase]);

  // Cleanup mic on exit
  const cleanupMic = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  // Start Mic Monitor
  const startMicMonitor = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setMicVolumeLevel(Math.min(1, avg / 128));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
      setPhase('ready');
    } catch (err) {
      console.error('Failed to get mic access', err);
      setPhase('ready');
    }
  };

  // Trigger 4-beat count-in
  const startCountInAndRecord = () => {
    setPhase('counting_in');
    let beatLeft = 4;
    setCountInBeat(beatLeft);
    audioEngine.playCountInBeat(4 - beatLeft + 1);

    const beatIntervalMs = (60 / template.bpm) * 1000;

    countInTimerRef.current = setInterval(() => {
      beatLeft -= 1;
      setCountInBeat(beatLeft);

      if (beatLeft > 0) {
        audioEngine.playCountInBeat(4 - beatLeft + 1);
      } else {
        clearInterval(countInTimerRef.current);
        beginActualRecording();
      }
    }, beatIntervalMs);
  };

  // Begin actual recording at Bar 1 Beat 1
  const beginActualRecording = () => {
    setPhase('recording');
    audioChunksRef.current = [];

    if (mediaStreamRef.current) {
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
        const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setRecordedAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setRecordedAudioUrl(url);

          // Preload into audio engine for latency test preview
          await audioEngine.setSlotAudio(targetSlot.type, blob, latencyOffsetMs);
        };

        mediaRecorderRef.current = recorder;
        recorder.start(100);
      } catch (err) {
        console.error('Error starting media recorder', err);
      }
    }

    // Mute target slot's original stem so user hears backing
    const previewSlots = allSlots.map((s) =>
      s.type === targetSlot.type ? { ...s, isMuted: true } : s
    );
    audioEngine.updateSlots(previewSlots);
    audioEngine.start();
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    audioEngine.stop();
    setPhase('review');
  };

  // Retake
  const handleRetake = () => {
    audioEngine.stop();
    setIsReviewPlaying(false);
    audioEngine.removeSlotAudio(targetSlot.type);
    setRecordedAudioBlob(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    setPhase('ready');
  };

  // Toggle review playback
  const toggleReviewPlayback = async () => {
    if (isReviewPlaying) {
      audioEngine.pause();
      setIsReviewPlaying(false);
    } else {
      if (recordedAudioBlob) {
        await audioEngine.setSlotAudio(targetSlot.type, recordedAudioBlob, latencyOffsetMs);
        const reviewSlots = allSlots.map((s) =>
          s.type === targetSlot.type
            ? { ...s, isMuted: false, isCustomTake: true, latencyOffsetMs }
            : s
        );
        audioEngine.updateSlots(reviewSlots);
        audioEngine.start();
        setIsReviewPlaying(true);
      }
    }
  };

  // Handle Save
  const handleSaveTake = () => {
    if (!recordedAudioBlob) return;
    const name = musicianName.trim() || '新乐手';
    try { localStorage.setItem('8bars_nickname', name); } catch (e) {}
    audioEngine.stop();
    onSaveRecording(targetSlot.type, recordedAudioBlob, latencyOffsetMs, name);
    onClose();
  };

  if (!isOpen) return null;

  const targetChar = getCharacterForSlot(targetSlot.type);
  const currentChordDetail = getChordDetail(transportState.currentChord);
  const nextChordDetail = getChordDetail(transportState.nextChord);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none transition-colors duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 border border-subtle rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] transition-colors duration-200"
      >
        {/* Header with Cartoon Character Buddy Badge */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-subtle bg-zinc-50 dark:bg-black/30">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src={targetChar.imageUrl}
                alt={targetChar.name}
                className="w-10 h-10 rounded-xl object-cover border-2 shadow-sm"
                style={{ borderColor: targetChar.accentColor }}
              />
              <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-zinc-900 text-white text-[8px] font-mono font-bold tracking-tighter">
                REC
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 font-mono">
                  {t('studio.title', { role: `${targetSlot.title} (${t('role.' + targetSlot.type) || targetSlot.roleName})` })}
                </h3>
                <span
                  className="hidden sm:inline-flex text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-black/5 dark:border-white/10"
                  style={{ backgroundColor: `${targetChar.accentColor}18`, color: targetChar.accentColor }}
                >
                  {targetChar.name} · {targetChar.persona}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {t('studio.meta', { title: template.title, bpm: template.bpm })}
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/6 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors border border-subtle"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-5">
          {/* Phase 1: Headphone Reminder with Character Buddy */}
          {phase === 'headphone_warning' && (
            <div className="flex flex-col items-center text-center py-4 px-2 max-w-md mx-auto">
              <div className="relative mb-3">
                <img
                  src={targetChar.imageUrl}
                  alt={targetChar.name}
                  className="w-24 h-24 rounded-2xl object-cover border-2 shadow-xl shadow-black/15"
                  style={{ borderColor: targetChar.accentColor }}
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#ff5522] border-2 border-white dark:border-[#121215] flex items-center justify-center text-white shadow-md">
                  <Headphones className="w-4 h-4" />
                </div>
              </div>

              {/* Band companion speech bubble */}
              <div className="relative bg-zinc-50 dark:bg-[#18181f] border border-subtle rounded-2xl p-3.5 mb-4 shadow-sm w-full text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: targetChar.accentColor }}>
                    {targetChar.name}（{targetChar.roleName}）
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {targetChar.vibe}
                  </span>
                </div>
                <p className="text-xs italic text-zinc-700 dark:text-zinc-300 font-sans">
                  {targetChar.quote}
                </p>
              </div>

              <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-1.5">
                {t('studio.headphoneWarning')}
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-5 font-mono">
                {t('studio.headphoneDesc')}
              </p>

              <div className="w-full flex flex-col gap-2.5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={startMicMonitor}
                  className="w-full py-3 px-4 rounded-xl font-bold bg-[#ff5522] hover:bg-[#ff4410] text-white transition-colors shadow-primary flex items-center justify-center gap-2 text-xs font-mono"
                >
                  <Headphones className="w-4 h-4" />
                  {t('studio.headphoneBtn')}
                </motion.button>
                <button
                  onClick={onClose}
                  className="w-full py-2 px-4 rounded-xl text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors font-mono"
                >
                  {t('studio.exit')}
                </button>
              </div>
            </div>
          )}

          {/* Phase 2: Ready & Mic Test */}
          {phase === 'ready' && (
            <div className="flex flex-col gap-5">
              {/* Mic & Name strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50 dark:bg-black/30 p-4 rounded-xl border border-subtle transition-colors duration-200">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    {t('studio.handle')}
                  </label>
                  <input
                    type="text"
                    value={musicianName}
                    onChange={(e) => setMusicianName(e.target.value)}
                    placeholder="如 @阿杰"
                    className="bg-white dark:bg-[#141418] border border-subtle px-3 py-2 rounded-lg text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-[#ff5522]"
                  />
                </div>

                <div className="flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-[#ff5522]" />
                      {t('studio.micTest')}
                    </span>
                    <span className={micVolumeLevel > 0.05 ? 'text-[#ff5522] font-semibold' : 'text-zinc-400'}>
                      {micVolumeLevel > 0.05 ? t('studio.micGood') : t('studio.micNear')}
                    </span>
                  </div>
                  {/* VU Level Meter */}
                  <div className="h-2 w-full bg-zinc-200 dark:bg-[#18181d] rounded-full overflow-hidden p-0.5 border border-zinc-300 dark:border-white/4">
                    <div
                      className="h-full rounded-full transition-all duration-75 bg-[#ff5522]"
                      style={{ width: `${Math.max(4, micVolumeLevel * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 mt-1">
                    {t('studio.micTip')}
                  </span>
                </div>
              </div>

              {/* Fretboard / Keyboard Preview & Reference */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    {t('studio.prestudy')}
                  </span>
                  <div className="flex items-center bg-zinc-100 dark:bg-[#0a0a0c] p-1 rounded-lg border border-subtle font-mono">
                    <button
                      onClick={() => setActiveTab('guitar')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        activeTab === 'guitar'
                          ? 'bg-white dark:bg-[#18181e] text-zinc-900 dark:text-white font-bold shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                      }`}
                    >
                      {t('cheatsheet.guitarTab')}
                    </button>
                    <button
                      onClick={() => setActiveTab('piano')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        activeTab === 'piano'
                          ? 'bg-white dark:bg-[#18181e] text-zinc-900 dark:text-white font-bold shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                      }`}
                    >
                      {t('cheatsheet.pianoTab')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeTab === 'guitar' ? (
                    <>
                      <ChordFretboard chord={getChordDetail(template.progression[0])} t={t} />
                      <ChordFretboard chord={getChordDetail(template.progression[1])} t={t} />
                    </>
                  ) : (
                    <>
                      <PianoChordView chord={getChordDetail(template.progression[0])} t={t} />
                      <PianoChordView chord={getChordDetail(template.progression[1])} t={t} />
                    </>
                  )}
                </div>
              </div>

              {/* Big CTA */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={startCountInAndRecord}
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-[#ff5522] hover:bg-[#ff4410] text-white shadow-primary flex items-center justify-center gap-2 transition-transform active:scale-95 font-mono"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  {t('studio.startRec')}
                </motion.button>
              </div>
            </div>
          )}

          {/* Phase 3: Counting in (4, 3, 2, 1) */}
          {phase === 'counting_in' && (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="text-xs uppercase font-mono tracking-widest text-[#ff5522] mb-2 font-bold">
                {t('studio.countIn')}
              </span>
              <motion.div
                key={countInBeat}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="w-28 h-28 rounded-2xl border-2 border-[#ff5522]/50 bg-[#ff5522]/10 flex items-center justify-center text-6xl font-black text-[#ff5522] font-mono shadow-2xl shadow-[#ff5522]/20"
              >
                {countInBeat}
              </motion.div>
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-6">
                {t('studio.countInTip')}
              </p>
            </div>
          )}

          {/* Phase 4: Recording Active */}
          {phase === 'recording' && (
            <div className="flex flex-col gap-4">
              <ChordTeleprompter
                currentBar={transportState.currentBar}
                currentBeat={transportState.currentBeat}
                progression={template.progression}
                progressionDetails={template.progressionDetails}
                currentChordDetail={currentChordDetail}
                nextChordDetail={nextChordDetail}
                isRecording={true}
                isPlaying={true}
                bpm={template.bpm}
                t={t}
              />

              {/* Live interactive fingering diagram for current chord */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ChordFretboard chord={currentChordDetail} size="md" t={t} />
                <PianoChordView chord={currentChordDetail} t={t} />
              </div>

              {/* Control bottom bar */}
              <div className="flex items-center justify-between bg-zinc-50 dark:bg-black/30 p-3.5 rounded-xl border border-subtle transition-colors duration-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5522] animate-ping" />
                  <span className="text-xs font-mono text-[#ff5522] font-bold">
                    {t('studio.autoBrake')}
                  </span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={stopRecording}
                  className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-white/6 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 text-xs font-semibold font-mono transition-colors"
                >
                  {t('studio.stopEarly')}
                </motion.button>
              </div>
            </div>
          )}

          {/* Phase 5: Review & Latency Alignment */}
          {phase === 'review' && (
            <div className="flex flex-col gap-5 py-2">
              <div className="flex items-center justify-between bg-zinc-50 dark:bg-[#15151a] border border-subtle p-4 rounded-xl text-zinc-900 dark:text-zinc-200 transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={targetChar.imageUrl}
                      alt={targetChar.name}
                      className="w-11 h-11 rounded-xl object-cover border-2 shadow-xs"
                      style={{ borderColor: targetChar.accentColor }}
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white font-mono flex items-center gap-1.5">
                      <span>{t('studio.recFinished')}</span>
                      <span className="text-[10px] text-zinc-400 font-normal">· {targetChar.name}</span>
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">{t('studio.alignedDesc')}</p>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleReviewPlayback}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md font-mono"
                >
                  {isReviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isReviewPlaying ? t('studio.previewPause') : t('studio.previewPlay')}
                </motion.button>
              </div>

              {/* Hardware Latency Compensation Slider */}
              <div className="bg-zinc-50 dark:bg-black/30 p-4 rounded-xl border border-subtle flex flex-col gap-3 font-mono transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-[#ff5522]" />
                    {t('studio.latency')}
                  </span>
                  <span className="text-xs font-bold text-[#ff5522] bg-white dark:bg-[#18181d] px-2.5 py-0.5 rounded border border-subtle shadow-sm">
                    {latencyOffsetMs > 0 ? `+${latencyOffsetMs}` : latencyOffsetMs} ms
                  </span>
                </div>

                <input
                  type="range"
                  min="-200"
                  max="50"
                  step="5"
                  value={latencyOffsetMs}
                  onChange={(e) => setLatencyOffsetMs(Number(e.target.value))}
                  className="w-full accent-[#ff5522] cursor-pointer"
                />

                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                  <span>{t('studio.latencyHigh')}</span>
                  <span className="text-zinc-800 dark:text-zinc-300 font-bold">{t('studio.latencyDefault')}</span>
                  <span>+50ms</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                  {t('studio.latencyTip')}
                </p>
              </div>

              {/* Confirmation actions */}
              <div className="flex items-center justify-end gap-3 pt-2 font-mono">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRetake}
                  className="px-4 py-2.5 rounded-xl border border-subtle bg-zinc-100 hover:bg-zinc-200 dark:bg-white/6 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('studio.retake')}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleSaveTake}
                  className="px-5 py-2.5 rounded-xl bg-[#ff5522] hover:bg-[#ff4410] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-primary"
                >
                  <Check className="w-4 h-4" />
                  {t('studio.saveTake')}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
