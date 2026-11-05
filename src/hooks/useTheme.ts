import { useState, useEffect, useRef } from 'react';

export type Theme = 'light' | 'dark';

export function useTheme() {
  // 首帧固定 'light' 与 SSR 渲染一致(避免 hydration mismatch);
  // 真实主题在挂载后从 localStorage 水合
  const [theme, setTheme] = useState<Theme>('light');
  const hydratedRef = useRef(false);

  // 应用主题到 <html> 并持久化(水合完成前跳过:首帧信任 layout.tsx 的预绘脚本)
  useEffect(() => {
    if (!hydratedRef.current) return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('8bars_theme', theme);
    } catch (e) {}
  }, [theme]);

  // 从 localStorage 水合真实主题(仅客户端执行)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('8bars_theme');
      if (saved === 'dark' || saved === 'light') setTheme(saved);
    } catch (e) {}
    hydratedRef.current = true;
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return { theme, toggleTheme, isDark: theme === 'dark' };
}
