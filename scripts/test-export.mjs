// 导出 WAV 验证:纯 AI 导出一次 → 注入一条 440Hz 正弦"真人 take"再导出 → 对比 RMS
// 用法: node scripts/test-export.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT_AI = '.tmp-export-ai.wav';
const OUT_HUMAN = '.tmp-export-human.wav';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  // 关键:允许无手势启动音频上下文,否则 headless 里 Tone.start() 永远挂起
  args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto('http://localhost:3000/room/10000000-0000-4000-8000-000000000001', {
  waitUntil: 'networkidle2',
  timeout: 30000,
});
// 等待音频引擎后台初始化完成(模板已装载)
await page.waitForFunction(() => window.__audioEngine && window.__audioEngine.template, {
  timeout: 30000,
});
await new Promise((r) => setTimeout(r, 1500));

// 在页面里导出 WAV 并以 base64 带出
async function exportWav(file) {
  const b64 = await page.evaluate(async () => {
    const blob = await window.__audioEngine.exportMixdownWav();
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      bin += String.fromCharCode.apply(null, buf.subarray(i, i + chunk));
    }
    return btoa(bin);
  });
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
}

// 1) 纯 AI 导出
await exportWav(OUT_AI);

// 2) 页面内生成 8 小节 440Hz WAV → setSlotAudio 注入 melody 席 → 再导出
const consoleMsgs = [];
page.on('console', (m) => consoleMsgs.push(`[${m.type()}] ${m.text()}`));
await page.evaluate(async () => {
  const SR = 44100, DUR = 21.4;
  const offCtx = new OfflineAudioContext(2, Math.ceil(SR * DUR), SR);
  const osc = offCtx.createOscillator();
  const gain = offCtx.createGain();
  osc.frequency.value = 440;
  gain.gain.value = 0.9;
  osc.connect(gain).connect(offCtx.destination);
  osc.start(0);
  osc.stop(DUR);
  const rendered = await offCtx.startRendering();

  // AudioBuffer → 16bit PCM WAV(最小编码器)
  const numCh = rendered.numberOfChannels;
  const len = rendered.length;
  const bytes = new ArrayBuffer(44 + len * numCh * 2);
  const view = new DataView(bytes);
  view.setUint32(0, 0x46464952, true);
  view.setUint32(4, 36 + len * numCh * 2, true);
  view.setUint32(8, 0x45564157, true);
  view.setUint32(12, 0x20746d66, true);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, SR, true);
  view.setUint32(28, SR * 2 * numCh, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x61746164, true);
  view.setUint32(40, len * numCh * 2, true);
  const chans = [];
  for (let c = 0; c < numCh; c++) chans.push(rendered.getChannelData(c));
  let pos = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      pos += 2;
    }
  }
  const blob = new Blob([bytes], { type: 'audio/wav' });
  await window.__audioEngine.setSlotAudio('melody', blob, -80);
  window.__audioEngine.updateSlots(
    ['drums', 'bass', 'chords', 'melody'].map((type, i) => ({
      id: 's' + i,
      type,
      volume: 0.85,
      isMuted: false,
      isSolo: false,
      latencyOffsetMs: -80,
      isCustomTake: type === 'melody',
    }))
  );
  return true;
});
await exportWav(OUT_HUMAN);

// 诊断:注入是否真的进了引擎
const diag = await page.evaluate(() => {
  const buf = window.__audioEngine.customAudioArrayBuffers.get('melody');
  const slots = window.__audioEngine.slots;
  return {
    hasArrayBuffer: !!buf,
    arrayBufSize: buf ? buf.byteLength : 0,
    slotsCustom: (slots || []).map((s) => s.type + ':' + s.isCustomTake).join(','),
    templateId: window.__audioEngine.template && window.__audioEngine.template.id,
  };
});
console.log('诊断:', JSON.stringify(diag));
console.log('相关 console:', consoleMsgs.filter((m) => /离线|解码|席位|离线渲染/.test(m)).join(' | ') || '(无)');

await browser.close();

// 解析 WAV:校验头部 + 计算 RMS 与时长
function wavStats(file) {
  const b = fs.readFileSync(file);
  const riff = b.toString('ascii', 0, 4);
  const wave = b.toString('ascii', 8, 12);
  const numCh = b.readUInt16LE(22);
  const sr = b.readUInt32LE(24);
  const dataLen = b.readUInt32LE(40);
  const samples = dataLen / 2;
  let sum = 0;
  for (let i = 0; i < samples; i++) sum += (b.readInt16LE(44 + i * 2) / 32768) ** 2;
  return {
    valid: riff === 'RIFF' && wave === 'WAVE',
    rms: Math.sqrt(sum / samples),
    durationSec: samples / numCh / sr,
  };
}

const ai = wavStats(OUT_AI);
const human = wavStats(OUT_HUMAN);
console.log('纯 AI 导出:  头校验', ai.valid, '| 时长', ai.durationSec.toFixed(2) + 's', '| RMS', ai.rms.toFixed(4));
console.log('注入真人后:  头校验', human.valid, '| 时长', human.durationSec.toFixed(2) + 's', '| RMS', human.rms.toFixed(4));
console.log(human.rms > ai.rms * 1.3 ? '✅ 真人 take 已混入导出(预期时长 21.33s @90BPM)' : '❌ 导出中未检测到真人 take');
console.log('页面错误:', errors.length ? errors.join('; ') : '无');
fs.unlinkSync(OUT_AI);
fs.unlinkSync(OUT_HUMAN);
