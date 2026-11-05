import { audioEngine } from '../services/audioEngine';

/** 导出 8 小节混音 WAV 并触发浏览器下载(HomeApp 与 RoomView 共用) */
export async function downloadRoomWav(title: string): Promise<void> {
  const wavBlob = await audioEngine.exportMixdownWav();
  const downloadUrl = URL.createObjectURL(wavBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `8Bars_${title.replace(/\s+/g, '_')}_8小节合奏.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
