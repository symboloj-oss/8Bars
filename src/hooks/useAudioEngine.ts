"use client";

// 音频引擎的 React 桥接:transport 订阅 + VU 表头轮询
// HomeApp 与 RoomView 共用,避免两处重复实现
import { useEffect, useState } from 'react';
import { SlotType } from '../types/music';
import { audioEngine, TransportState } from '../services/audioEngine';

const EMPTY_METERS: Record<SlotType, number> = { drums: 0, bass: 0, chords: 0, melody: 0 };

/** 订阅音频引擎的播放进度/节拍状态 */
export function useTransport(): TransportState {
  const [state, setState] = useState<TransportState>({
    isPlaying: false,
    currentBar: 0,
    currentBeat: 0,
    currentChord: 'C',
    nextChord: 'G',
    progress: 0,
    elapsedSeconds: 0,
    totalSeconds: 21.3,
  });

  useEffect(() => {
    return audioEngine.subscribe(setState);
  }, []);

  return state;
}

/** 播放期间以 rAF 轮询各轨 VU 电平,停止时归零 */
export function useMeterLevels(isPlaying: boolean): Record<SlotType, number> {
  const [meters, setMeters] = useState<Record<SlotType, number>>(EMPTY_METERS);

  useEffect(() => {
    let animId: number;
    const poll = () => {
      if (isPlaying) {
        setMeters({
          drums: audioEngine.getTrackMeter('drums'),
          bass: audioEngine.getTrackMeter('bass'),
          chords: audioEngine.getTrackMeter('chords'),
          melody: audioEngine.getTrackMeter('melody'),
        });
      } else {
        setMeters(EMPTY_METERS);
      }
      animId = requestAnimationFrame(poll);
    };
    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  return meters;
}
