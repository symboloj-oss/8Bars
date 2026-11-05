import { useState, useEffect, useCallback } from 'react';
import { SupportedLang, SUPPORTED_LANGS, getTranslation } from './translations';

export function useI18n() {
  const [lang, setLangState] = useState<SupportedLang>(() => {
    try {
      const saved = localStorage.getItem('8bars_lang') as SupportedLang | null;
      if (saved && (saved === 'zh-CN' || saved === 'zh-TW' || saved === 'en' || saved === 'ja' || saved === 'ko')) {
        return saved;
      }
    } catch (e) {}
    return 'zh-CN';
  });

  const setLang = useCallback((newLang: SupportedLang) => {
    setLangState(newLang);
    try {
      localStorage.setItem('8bars_lang', newLang);
      document.documentElement.lang = newLang;
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
