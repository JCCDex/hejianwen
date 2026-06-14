import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zh from './locales/zh';
import en from './locales/en';
import ja from './locales/ja';
import ar from './locales/ar';
import es from './locales/es';
import ko from './locales/ko';

export const SUPPORTED_LANGUAGES = ['zh', 'en', 'ja', 'ar', 'es', 'ko'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
      ja: { translation: ja },
      ar: { translation: ar },
      es: { translation: es },
      ko: { translation: ko },
    },
    // Fallback to English when detected language is not supported
    fallbackLng: 'en',
    // Detection order: localStorage → browser language → fallback
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nLang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    // Map browser locale codes like 'zh-CN', 'zh-TW' → 'zh'; 'ja-JP' → 'ja'
    load: 'languageOnly',
  });

export default i18n;
