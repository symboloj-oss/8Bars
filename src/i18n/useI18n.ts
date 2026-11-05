import { useState, useEffect, useCallback } from 'react';
import { SupportedLang, SUPPORTED_LANGS, getTranslation } from './translations';

const SUPPORTED: SupportedLang[] = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko'];

export function useI18n() {
  // 首帧固定 zh-CN 与 SSR 渲染一致;真实语言在挂载后从 localStorage 水合
  const [lang, setLangState] = useState<SupportedLang>('zh-CN');

  const setLang = useCallback((newLang: SupportedLang) => {
    setLangState(newLang);
    try {
      localStorage.setItem('8bars_lang', newLang);
      document.documentElement.lang = newLang;
    } catch (e) {}
  }, []);

  // 从 localStorage 水合语言设置(仅客户端)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('8bars_lang') as SupportedLang | null;
      if (saved && SUPPORTED.includes(saved)) setLangState(saved);
    } catch (e) {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return getTranslation(lang, key, params);
    },
    [lang]
  );

  return { lang, setLang, t, supportedLangs: SUPPORTED_LANGS };
}
