// 无头浏览器诊断脚本:打开首页,收集 console/pageerror,并模拟点击验证水合是否成功
// 用法: node scripts/debug-headless.mjs
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
// 用法: node scripts/debug-headless.mjs [基础URL,默认本地]
const BASE = process.argv[2] || 'http://localhost:3000';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--mute-audio'],
});

const page = await browser.newPage();
const msgs = [];
page.on('console', (m) => msgs.push(`[console.${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => msgs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => msgs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText || ''}`));

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 3000));

// 1. 列出页面上可点击的按钮
const buttons = await page.$$eval('button', (bs) =>
  bs.map((b) => (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50)).filter(Boolean).slice(0, 25)
);
console.log('=== 页面按钮 ===');
console.log(JSON.stringify(buttons, null, 1));

// 2. 点击一个模板切换按钮(纯 React 状态变更,验证事件绑定)
const clickResult = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => /BPM/.test(b.textContent || ''));
  if (!btn) return '未找到模板按钮';
  btn.click();
  return '已点击: ' + btn.textContent.trim().replace(/\s+/g, ' ');
});
console.log('=== 点击测试 ===');
console.log(clickResult);

await new Promise((r) => setTimeout(r, 2000));

// 3. 点击后页面是否变化(模板按钮高亮切换)
const afterState = await page.evaluate(() => {
  const active = [...document.querySelectorAll('button')].find((b) =>
    (b.className || '').includes('bg-[#ff5522]')
  );
  return active ? active.textContent.trim().replace(/\s+/g, ' ') : '无高亮按钮';
});
console.log('点击后高亮按钮: ' + afterState);

// 4. 点击播放按钮(触发 audioEngine 初始化)
const playResult = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => {
    const t = b.textContent || '';
    return /播放|播放全部|▶/.test(t) && b.offsetParent !== null;
  });
  if (!btn) return '未找到播放按钮';
  btn.click();
  return '已点击播放: ' + btn.textContent.trim().slice(0, 30);
});
console.log(playResult);
await new Promise((r) => setTimeout(r, 2500));

// 5. 切到乐队广场,等待 Supabase 数据加载,检查种子房间
const plazaResult = await page.evaluate(async () => {
  const tab = [...document.querySelectorAll('button')].find((b) => /乐队广场/.test(b.textContent || ''));
  if (!tab) return '未找到广场 Tab';
  tab.click();
  await new Promise((r) => setTimeout(r, 4000));
  const titles = [...document.querySelectorAll('h3')].map((h) => h.textContent?.trim()).filter(Boolean);
  return '广场房间标题: ' + JSON.stringify(titles.slice(0, 8));
});
console.log('=== 广场测试 ===');
console.log(plazaResult);

// 6. 访问分享直达页(种子房 1),验证房间加载与工作区渲染
await page.goto(BASE + '/room/10000000-0000-4000-8000-000000000001', {
  waitUntil: 'networkidle2',
  timeout: 30000,
});
await new Promise((r) => setTimeout(r, 5000));
const roomTitle = await page.title();
const hasStudio = await page.evaluate(() => /TRACK|我要弹这个席位/.test(document.body.innerText));
console.log('=== 房间页测试 ===');
console.log('页面标题: ' + roomTitle + ' | 录音棚工作区已渲染: ' + hasStudio);

console.log('=== 浏览器消息 ===');
console.log(msgs.length ? msgs.join('\n') : '(无任何 console/pageerror 消息)');

await browser.close();
