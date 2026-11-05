// UI 现状截屏:多视口 × 多页面,供设计打磨前分析
// 用法: node scripts/ui-snapshot.mjs [基础URL,默认本地]
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://localhost:3000';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();

const shots = [
  // [文件名, 视口宽, 页面路径, 操作]
  ['home-desktop', 1280, BASE, null],
  ['room-desktop', 1280, BASE + '/room/10000000-0000-4000-8000-000000000001', null],
  ['home-mobile', 390, BASE, null],
  ['room-mobile', 390, BASE + '/room/10000000-0000-4000-8000-000000000001', null],
  ['plaza-desktop', 1280, BASE, 'plaza'],
  ['plaza-mobile', 390, BASE, 'plaza'],
];

for (const [name, width, url, action] of shots) {
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3500));
  if (action === 'plaza') {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /乐队广场/.test(x.textContent || ''));
      b && b.click();
    });
    await new Promise((r) => setTimeout(r, 3500));
  }
  await page.screenshot({ path: `.tmp-ui-${name}.png`, fullPage: true });
  console.log('已截屏:', name);
}

await browser.close();
