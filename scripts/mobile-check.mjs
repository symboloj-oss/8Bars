// 移动端适配诊断:iPhone 视口截屏 + 横向溢出检测
// 用法: node scripts/mobile-check.mjs [基础URL,默认本地]
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://localhost:3000';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.setUserAgent(
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
);

const overflow = () =>
  page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

// 1) 首页(录音棚)
await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: '.tmp-mobile-home.png' });
await page.screenshot({ path: '.tmp-mobile-home-full.png', fullPage: true });
console.log('首页横向溢出:', JSON.stringify(await overflow()));

// 2) 广场 Tab
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /乐队广场/.test(x.textContent || ''));
  b && b.click();
});
await new Promise((r) => setTimeout(r, 4000));
await page.screenshot({ path: '.tmp-mobile-plaza.png' });
await page.screenshot({ path: '.tmp-mobile-plaza-full.png', fullPage: true });
console.log('广场横向溢出:', JSON.stringify(await overflow()));

// 3) 房间直达页
await page.goto(BASE + '/room/10000000-0000-4000-8000-000000000001', {
  waitUntil: 'networkidle2',
  timeout: 30000,
});
await new Promise((r) => setTimeout(r, 5000));
await page.screenshot({ path: '.tmp-mobile-room.png' });
await page.screenshot({ path: '.tmp-mobile-room-full.png', fullPage: true });
console.log('房间页横向溢出:', JSON.stringify(await overflow()));

await browser.close();
console.log('截图完成: .tmp-mobile-*.png');
