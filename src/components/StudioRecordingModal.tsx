"use client";
import React, { useState, useEffect, useRef } from 'react';
import { RoomTemplate, SlotInfo, SlotType, ChordDetail } from '../types/music';
import { audioEngine, TransportState } from '../services/audioEngine';
import { ChordFretboard } from './ChordFretboard';
import { PianoChordView } from './PianoChordView';
import { ChordTeleprompter } from './ChordTeleprompter';
import { getChordDetail } from '../data/chords';
import { getCharacterForSlot } from '../data/characters';
import { getTemplateAsset } from '../data/templateAssets';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import {
 Mic,
 Headphones,
 RotateCcw,
 Check,
 Sliders,
 Play,
 Pause,
} from 'lucide-react';
import { motion } from 'motion/react';

interface StudioRecordingModalProps {
 isOpen: boolean;
 onClose: () => void;
 targetSlot: SlotInfo;
 allSlots: SlotInfo[];
 template: RoomTemplate;
 onSaveRecording: (slotType: SlotType, blob: Blob, latencyOffsetMs: number, musicianName: string) => Promise<void>;
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
  const [isPreparingAudio, setIsPreparingAudio] = useState(false);
  const [isStartingMic, setIsStartingMic] = useState(false);
 const [latencyOffsetMs, setLatencyOffsetMs] = useState<number>(-80);
 const [micError, setMicError] = useState<string | null>(null);
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
  const [isMicClipping, setIsMicClipping] = useState(false);
 const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
 const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
 const [isReviewPlaying, setIsReviewPlaying] = useState<boolean>(false);
 const [isSaving, setIsSaving] = useState(false);
 const [saveError, setSaveError] = useState<string | null>(null);

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
 const audioContextRef = useRef<AudioContext | null>(null);
 const mediaRecorderRef = useRef<MediaRecorder | null>(null);
 const audioChunksRef = useRef<Blob[]>([]);
 const analyserRef = useRef<AnalyserNode | null>(null);
 const animFrameRef = useRef<number | null>(null);
 const countInTimerRef = useRef<any>(null);
  const clippingResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpenRef = useRef(isOpen);
  const isStartingCountInRef = useRef(false);
  const isStartingMicRef = useRef(false);
  const micMeterLevelRef = useRef(0);
  const hasSavedTakeRef = useRef(false);
 const recordedAudioUrlRef = useRef<string | null>(null);

  const restoreActiveSlotAudio = async () => {
    const activeTake = targetSlot.takes.find((take) => take.id === targetSlot.activeTakeId);
    const templateAudio = targetSlot.type !== 'melody'
      ? getTemplateAsset(template.id, targetSlot.type)
      : undefined;

    if (activeTake?.audioBlobUrl) {
      await audioEngine.setSlotAudioFromUrl(targetSlot.type, activeTake.audioBlobUrl);
    } else if (activeTake?.audioBlob) {
      await audioEngine.setSlotAudio(targetSlot.type, activeTake.audioBlob, activeTake.latencyOffsetMs);
    } else if (templateAudio) {
      await audioEngine.setSlotAudioFromUrl(targetSlot.type, templateAudio);
    } else {
      audioEngine.removeSlotAudio(targetSlot.type);
    }
    audioEngine.updateSlots(allSlots);
  };
  const restoreActiveSlotAudioRef = useRef(restoreActiveSlotAudio);
  restoreActiveSlotAudioRef.current = restoreActiveSlotAudio;

 // Stop background music while the recording studio owns this slot.
 // The modal is conditionally mounted by RoomView, so its cleanup is the
 // reliable path for both an explicit close and a route/unmount close.
 useEffect(() => {
  isOpenRef.current = true;
  // Recording always starts from bar 1, regardless of where room playback stopped.
  audioEngine.stop();
  hasSavedTakeRef.current = false;
 setPhase('headphone_warning');
 setRecordedAudioBlob(null);
 setMicError(null);
 revokeRecordedAudioUrl();
 return () => {
  isOpenRef.current = false;
 cleanupMic();
  audioEngine.stop();
  if (!hasSavedTakeRef.current) {
    void restoreActiveSlotAudioRef.current().catch((err) => {
      console.warn('Could not restore the room track after leaving the studio', err);
      audioEngine.updateSlots(allSlots);
    });
  }
 };
 }, []);

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
  if (clippingResetTimeoutRef.current) {
    clearTimeout(clippingResetTimeoutRef.current);
    clippingResetTimeoutRef.current = null;
  }
 if (countInTimerRef.current) {
 clearInterval(countInTimerRef.current);
 countInTimerRef.current = null;
 }
 if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
 try { mediaRecorderRef.current.stop(); } catch (e) {}
 }
 if (mediaStreamRef.current) {
 mediaStreamRef.current.getTracks().forEach((t) => t.stop());
 mediaStreamRef.current = null;
 }
 analyserRef.current = null;
 const audioContext = audioContextRef.current;
 audioContextRef.current = null;
 if (audioContext && audioContext.state !== 'closed') {
 void audioContext.close().catch(() => {});
 }
 };

 const revokeRecordedAudioUrl = () => {
 const url = recordedAudioUrlRef.current;
 if (url) URL.revokeObjectURL(url);
 recordedAudioUrlRef.current = null;
 setRecordedAudioUrl(null);
 };

 // Start Mic Monitor
 const startMicMonitor = async () => {
  if (isStartingMicRef.current) return;
  isStartingMicRef.current = true;
  setIsStartingMic(true);
 setMicError(null);
  micMeterLevelRef.current = 0;
  setMicVolumeLevel(0);
  setIsMicClipping(false);
 try {
 if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is unavailable');
 const stream = await navigator.mediaDevices.getUserMedia({
 audio: {
 echoCancellation: false,
 noiseSuppression: false,
 autoGainControl: false,
 },
 });
  if (!isOpenRef.current) {
    stream.getTracks().forEach((track) => track.stop());
    return;
  }
 mediaStreamRef.current = stream;

 const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
 if (!AudioContextConstructor) throw new Error('Web Audio is unavailable');
 const audioCtx: AudioContext = new AudioContextConstructor();
 audioContextRef.current = audioCtx;
  await audioCtx.resume();
  if (!isOpenRef.current) {
    cleanupMic();
    return;
  }
 const source = audioCtx.createMediaStreamSource(stream);
 const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
 source.connect(analyser);
 analyserRef.current = analyser;

  const sampleData = new Float32Array(analyser.fftSize);

 const updateLevel = () => {
 if (!analyserRef.current) return;
  analyserRef.current.getFloatTimeDomainData(sampleData);
  let sumSquares = 0;
  let peak = 0;
  for (let i = 0; i < sampleData.length; i++) {
    const sample = sampleData[i];
    sumSquares += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
 }
  const rms = Math.sqrt(sumSquares / sampleData.length);
  const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -100;
  const targetLevel = Math.max(0, Math.min(1, (rmsDb + 48) / 42));
  const smoothing = targetLevel > micMeterLevelRef.current ? 0.45 : 0.14;
  micMeterLevelRef.current += (targetLevel - micMeterLevelRef.current) * smoothing;
  setMicVolumeLevel(micMeterLevelRef.current);
  if (peak >= 0.995) {
    setIsMicClipping(true);
    if (clippingResetTimeoutRef.current) clearTimeout(clippingResetTimeoutRef.current);
    clippingResetTimeoutRef.current = setTimeout(() => {
      setIsMicClipping(false);
      clippingResetTimeoutRef.current = null;
    }, 900);
  }
 animFrameRef.current = requestAnimationFrame(updateLevel);
 };
 updateLevel();
 setPhase('ready');
 } catch (err) {
 console.error('Failed to get mic access', err);
  cleanupMic();
  if (isOpenRef.current) setMicError(t('studio.micAccessFailed'));
  } finally {
    isStartingMicRef.current = false;
    setIsStartingMic(false);
 }
 };

 // Trigger 4-beat count-in
  const startCountInAndRecord = async () => {
  if (isStartingCountInRef.current) return;
 const hasLiveMicrophone = mediaStreamRef.current?.getAudioTracks().some((track) => track.readyState === 'live');
 if (!hasLiveMicrophone) {
 setMicError(t('studio.micAccessFailed'));
 setPhase('headphone_warning');
 return;
 }
  isStartingCountInRef.current = true;
  setIsPreparingAudio(true);
  setMicError(null);
  try {
    await audioEngine.prepareAudio();
  } catch (err) {
    console.error('Audio engine initialization failed before recording', err);
    setMicError(t('studio.audioStartFailed'));
    isStartingCountInRef.current = false;
    setIsPreparingAudio(false);
    return;
  }
  isStartingCountInRef.current = false;
  setIsPreparingAudio(false);
  if (!isOpenRef.current) return;
  const microphoneStillLive = mediaStreamRef.current?.getAudioTracks().some((track) => track.readyState === 'live');
  if (!microphoneStillLive) {
    setMicError(t('studio.micAccessFailed'));
    setPhase('headphone_warning');
    return;
  }
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
      countInTimerRef.current = null;
      void beginActualRecording();
 }
 }, beatIntervalMs);
 };

 // Begin actual recording at Bar 1 Beat 1
  const beginActualRecording = async () => {
 const stream = mediaStreamRef.current;
 if (!stream?.getAudioTracks().some((track) => track.readyState === 'live')) {
 setMicError(t('studio.micAccessFailed'));
 setPhase('headphone_warning');
 audioEngine.stop();
 return;
 }

    // Mute the selected slot and make sure the backing transport starts before
    // MediaRecorder captures audio, so a failed audio context cannot produce a
    // silent or misleading recording.
    const previewSlots = allSlots.map((s) =>
      s.type === targetSlot.type ? { ...s, isMuted: true } : s
    );
    audioEngine.updateSlots(previewSlots);
    try {
      await audioEngine.start();
    } catch (err) {
      console.error('Audio engine could not start recording playback', err);
      audioEngine.stop();
      audioEngine.updateSlots(allSlots);
      setMicError(t('studio.audioStartFailed'));
      setPhase('ready');
      return;
    }

 try {
      audioChunksRef.current = [];
 const supportedMimeType = [
 'audio/webm;codecs=opus',
 'audio/webm',
 'audio/mp4',
 'audio/ogg;codecs=opus',
 ].find((type) => MediaRecorder.isTypeSupported(type));
 const recorder = supportedMimeType
 ? new MediaRecorder(stream, { mimeType: supportedMimeType })
 : new MediaRecorder(stream);

 recorder.ondataavailable = (e) => {
 if (e.data.size > 0) {
 audioChunksRef.current.push(e.data);
 }
 };

 recorder.onstop = async () => {
      if (!isOpenRef.current) {
        audioChunksRef.current = [];
        return;
      }
 const blob = new Blob(audioChunksRef.current, {
 type: recorder.mimeType || supportedMimeType || 'audio/webm',
 });
 setRecordedAudioBlob(blob);
 const url = URL.createObjectURL(blob);
 recordedAudioUrlRef.current = url;
 setRecordedAudioUrl(url);

 // Preload into audio engine for latency test preview
      try {
        await audioEngine.setSlotAudio(targetSlot.type, blob, latencyOffsetMs);
      } catch (err) {
        console.error('Recorded audio could not be prepared for preview', err);
        setSaveError(t('studio.previewFailed'));
      }
 };

 mediaRecorderRef.current = recorder;
 recorder.start(100);
      setPhase('recording');
 } catch (err) {
 console.error('Error starting media recorder', err);
      audioEngine.stop();
      audioEngine.updateSlots(allSlots);
 setMicError(t('studio.micAccessFailed'));
      setPhase('ready');
 return;
 }
 };

 // Stop recording
 const stopRecording = () => {
 if (countInTimerRef.current) {
 clearInterval(countInTimerRef.current);
 countInTimerRef.current = null;
 }
 if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
 mediaRecorderRef.current.stop();
 }
 audioEngine.stop();
 setPhase('review');
 };

 // Retake
  const handleRetake = async () => {
  if (isPreparingAudio) return;
  setIsPreparingAudio(true);
  setSaveError(null);
 audioEngine.stop();
  try {
    await restoreActiveSlotAudio();
    setIsReviewPlaying(false);
    setRecordedAudioBlob(null);
    revokeRecordedAudioUrl();
    setPhase('ready');
  } catch (err) {
    console.error('Could not restore the current take before retaking', err);
    setSaveError(t('studio.restoreFailed'));
  } finally {
    setIsPreparingAudio(false);
  }
 };

 // Toggle review playback
 const toggleReviewPlayback = async () => {
 if (isReviewPlaying) {
 audioEngine.pause();
 setIsReviewPlaying(false);
 } else {
      if (!recordedAudioBlob) return;
      setSaveError(null);
      try {
 await audioEngine.setSlotAudio(targetSlot.type, recordedAudioBlob, latencyOffsetMs);
 const reviewSlots = allSlots.map((s) =>
 s.type === targetSlot.type
 ? { ...s, isMuted: false, isCustomTake: true, latencyOffsetMs }
 : s
 );
 audioEngine.updateSlots(reviewSlots);
        await audioEngine.start();
 setIsReviewPlaying(true);
      } catch (err) {
        console.error('Recorded audio preview failed', err);
        audioEngine.stop();
        audioEngine.updateSlots(allSlots);
        setIsReviewPlaying(false);
        setSaveError(t('studio.previewFailed'));
 }
 }
 };

 // Handle Save
 const handleSaveTake = async () => {
 if (!recordedAudioBlob || isSaving || isPreparingAudio) return;
 const name = musicianName.trim() || '新乐手';
 try { localStorage.setItem('8bars_nickname', name); } catch (e) {}
 audioEngine.stop();
 setIsSaving(true);
 setSaveError(null);
 try {
 await onSaveRecording(targetSlot.type, recordedAudioBlob, latencyOffsetMs, name);
  hasSavedTakeRef.current = true;
 onClose();
 } catch (error) {
 setSaveError(error instanceof Error ? error.message : '录音保存失败，请检查网络后重试。');
 } finally {
 setIsSaving(false);
 }
 };

 const targetChar = getCharacterForSlot(targetSlot.type);
 const currentChordDetail = getChordDetail(transportState.currentChord);
 const nextChordDetail = getChordDetail(transportState.nextChord);

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
 <DialogContent showCloseButton={false} className="sm:max-w-4xl bg-white dark:bg-zinc-900 p-0 gap-0 rounded-2xl max-h-[92vh] overflow-hidden flex flex-col">
 {/* Header with Cartoon Character Buddy Badge */}
 <div className="flex items-center justify-between px-5 py-3.5 border-b bg-zinc-50 dark:bg-black/30 shrink-0">
 <div className="flex items-center gap-3">
 <div className="relative shrink-0">
 <img
 src={targetChar.imageUrl}
 alt={targetChar.name}
 className="w-10 h-10 rounded-xl object-cover border-2 shadow-sm"
 style={{ borderColor: targetChar.accentColor }}
 />
 <span className="absolute -bottom-1 -right-1 px-1 py-0.5 rounded bg-zinc-900 text-white text-[8px] font-mono font-bold tracking-tighter">
 REC
 </span>
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 font-mono">
 {t('studio.title', { role: `${targetSlot.title} (${t('role.' + targetSlot.type) || targetSlot.roleName})` })}
 </h3>
 <span
 className="hidden sm:inline-flex text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/8"
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

 <Button variant="ghost" size="icon-sm" onClick={onClose} disabled={isSaving}>
 <span className="text-base">✕</span>
 </Button>
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
 <div className="relative bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl p-3.5 mb-4 shadow-sm w-full text-left">
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
 {micError && (
 <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
 {micError}
 </p>
 )}

 <div className="w-full flex flex-col gap-2.5">
  <Button onClick={startMicMonitor} disabled={isStartingMic} className="w-full py-3 font-mono">
 <Headphones />
  {isStartingMic ? t('studio.requestingMic') : t('studio.headphoneBtn')}
 </Button>
 <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
 {t('studio.headphoneTip')}
 </p>
 <Button variant="ghost" onClick={onClose} className="w-full py-2 text-xs text-zinc-500 font-mono">
 {t('studio.exit')}
 </Button>
 </div>
 </div>
 )}

 {/* Phase 2: Ready & Mic Test */}
 {phase === 'ready' && (
 <div className="flex flex-col gap-5">
 {/* Mic & Name strip */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50 dark:bg-black/30 p-4 rounded-xl transition-colors duration-200">
 <div className="flex flex-col gap-1.5">
 <label className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
 {t('studio.handle')}
 </label>
 <Input
 type="text"
 value={musicianName}
 onChange={(e) => setMusicianName(e.target.value)}
 placeholder="如 @阿杰"
 className="text-xs font-mono"
 />
 </div>

 <div className="flex flex-col justify-between">
 <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1">
 <span className="flex items-center gap-1.5">
 <Mic className="w-3.5 h-3.5 text-[#ff5522]" />
 {t('studio.micTest')}
 </span>
  <span className={isMicClipping ? 'text-red-600 font-semibold' : micVolumeLevel > 0.12 ? 'text-[#ff5522] font-semibold' : 'text-zinc-400'}>
    {isMicClipping
      ? t('studio.micClipping')
      : micVolumeLevel > 0.12
        ? t('studio.micGood')
        : t('studio.micNear')}
 </span>
 </div>
 {/* VU Level Meter */}
 <div className="h-2 w-full bg-zinc-200 dark:bg-white/8 rounded-full overflow-hidden p-0.5">
 <div
    className={`h-full rounded-full transition-all duration-75 ${isMicClipping ? 'bg-red-600' : 'bg-[#ff5522]'}`}
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
 <div className="flex items-center bg-zinc-50 dark:bg-black/40 p-1 rounded-lg font-mono">
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
  <Button onClick={startCountInAndRecord} disabled={isPreparingAudio} className="w-full py-3.5 text-sm font-mono">
 <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
  {isPreparingAudio ? t('studio.preparingAudio') : t('studio.startRec')}
 </Button>
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
 <div className="flex items-center justify-between bg-zinc-50 dark:bg-black/30 p-3.5 rounded-xl transition-colors duration-200">
 <div className="flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-[#ff5522] animate-ping" />
 <span className="text-xs font-mono text-[#ff5522] font-bold">
 {t('studio.autoBrake')}
 </span>
 </div>
 <Button variant="secondary" onClick={stopRecording} className="text-xs font-mono">
 {t('studio.stopEarly')}
 </Button>
 </div>
 </div>
 )}

 {/* Phase 5: Review & Latency Alignment */}
 {phase === 'review' && (
 <div className="flex flex-col gap-5 py-2">
 <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800/60 p-4 rounded-xl text-zinc-900 dark:text-zinc-200 transition-colors duration-200">
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

 <Button onClick={toggleReviewPlayback} disabled={isPreparingAudio} className="bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-mono text-xs">
 {isReviewPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
 {isReviewPlaying ? t('studio.previewPause') : t('studio.previewPlay')}
 </Button>
 </div>

 {/* Hardware Latency Compensation Slider */}
 <div className="bg-zinc-50 dark:bg-black/30 p-4 rounded-xl flex flex-col gap-3 font-mono transition-colors duration-200">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
 <Sliders className="w-3.5 h-3.5 text-[#ff5522]" />
 {t('studio.latency')}
 </span>
 <span className="text-xs font-bold text-[#ff5522] bg-white dark:bg-white/8 px-2.5 py-0.5 rounded shadow-sm">
 {latencyOffsetMs > 0 ? `+${latencyOffsetMs}` : latencyOffsetMs} ms
 </span>
 </div>

 <Slider
 min={-200}
 max={50}
 step={5}
 value={[latencyOffsetMs]}
 onValueChange={(v) => setLatencyOffsetMs(v[0])}
 className="w-full"
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
 {saveError && (
 <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
 {saveError}
 </p>
 )}
 <div className="flex items-center justify-end gap-3 pt-2 font-mono">
 <Button variant="secondary" onClick={handleRetake} disabled={isSaving || isPreparingAudio} className="text-xs font-mono">
 <RotateCcw className="size-3.5" />
 {isPreparingAudio ? t('studio.preparingAudio') : t('studio.retake')}
 </Button>

 <Button onClick={handleSaveTake} disabled={isSaving || isPreparingAudio || !recordedAudioBlob} className="text-xs">
 <Check />
 {isSaving ? t('studio.savingTake') : t('studio.saveTake')}
 </Button>
 </div>
 </div>
 )}
 </div>
 </DialogContent>
 </Dialog>
 );
};
