import { useState, useEffect, useRef } from 'react';

export type Theme = 'light' | 'dark';

// 主题切换:墨水波前扩散
// 每个元素按"距离开关的远近"获得跳变延迟(step-end 瞬时切换,无中间色):
// 波前扫过处 = 完全新色,波前未到处 = 完全旧色,元素颜色 100% 真实
// 配合一圈橙色光晕环从开关扩散,软化波前边界(墨水感)
function switchThemeClass(next: Theme) {
  const root = document.documentElement;
  if (next === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

const MAX_DELAY = 450; // 波前从开关走到最远元素的时长
const FADE_MS = 1400; // 单个元素渐变时长(慢速浸染)

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!hydratedRef.current) return;
    switchThemeClass(theme);
    try {
      localStorage.setItem('8bars_theme', theme);
    } catch (e) {}
  }, [theme]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('8bars_theme');
      if (saved === 'dark' || saved === 'light') setTheme(saved);
    } catch (e) {}
    hydratedRef.current = true;
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (typeof document !== 'undefined') {
        // 原点 = 主题开关按钮中心
        const btn = Array.from(document.querySelectorAll<HTMLElement>('[data-theme-toggle]')).find(
          (el) => el.offsetParent !== null
        );
        const rect = btn?.getBoundingClientRect();
        const ox = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const oy = rect ? rect.top + rect.height / 2 : 48;
        const radius = Math.hypot(
          Math.max(ox, window.innerWidth - ox),
          Math.max(oy, window.innerHeight - oy)
        );

        // 1. 光晕环:从开关扩散,软化波前(transform 动画,GPU 加速)
        // 光晕颜色 = 目标主题色(切暗色=深紫柔光,切亮色=暖白柔光),与墨水同色
        const ringColor =
          next === 'dark'
            ? 'rgba(18, 12, 20, 0.55)'
            : 'rgba(255, 250, 244, 0.9)';
        const ring = document.createElement('div');
        ring.style.cssText =
          `position:fixed;left:${ox}px;top:${oy}px;width:${radius * 2}px;height:${radius * 2}px;` +
          `transform:translate(-50%,-50%) scale(0.02);border-radius:50%;z-index:9998;pointer-events:none;` +
          `background:radial-gradient(circle, transparent 60%, ${ringColor} 73%, transparent 88%);`;
        document.body.appendChild(ring);
        const ringAnim = ring.animate(
          [
            { transform: 'translate(-50%,-50%) scale(0.02)', opacity: 1 },
            { transform: 'translate(-50%,-50%) scale(1)', opacity: 0.1 },
          ],
          { duration: MAX_DELAY + FADE_MS * 0.6, easing: 'cubic-bezier(0.25, 0, 0.2, 1)' }
        );
        ringAnim.onfinish = () => ring.remove();

        // 2. 按距离设置跳变延迟(只处理 HTML 元素,跳过 SVG 内部)
        const els = Array.from(document.querySelectorAll<HTMLElement>('body *')).filter(
          (el) => !(el instanceof SVGElement)
        );
        let maxDist = 0;
        const dists = els.map((el) => {
          const r = el.getBoundingClientRect();
          const d = Math.hypot(r.left + r.width / 2 - ox, r.top + r.height / 2 - oy);
          if (d > maxDist) maxDist = d;
          return d;
        });
        els.forEach((el, i) => {
          const delay = maxDist > 0 ? (dists[i] / maxDist) * MAX_DELAY : 0;
          el.style.setProperty('--theme-delay', `${delay.toFixed(0)}ms`);
        });

        // 3. 挂过渡类 + 切换主题(元素在各自延迟时刻瞬时变为新色)
        const root = document.documentElement;
        root.classList.add('theme-animating');
        switchThemeClass(next);
        window.setTimeout(
          () => root.classList.remove('theme-animating'),
          MAX_DELAY + FADE_MS + 200
        );
      }
      return next;
    });
  };

  return { theme, toggleTheme, isDark: theme === 'dark' };
}
