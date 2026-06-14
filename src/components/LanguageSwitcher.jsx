import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LANG_OPTIONS = [
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const currentLang = LANG_OPTIONS.find(l => l.code === i18n.language) || LANG_OPTIONS[1];

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    // Apply RTL direction for Arabic
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = code;
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] md:text-xs font-bold border bg-gray-900 text-gray-400 border-gray-700 hover:text-cyan-400 hover:border-cyan-500/50 transition-all"
        title="Language / 语言"
      >
        <Languages className="w-3 h-3" />
        <span className="hidden sm:inline">{currentLang.flag} {currentLang.label}</span>
        <span className="sm:hidden">{currentLang.flag}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl z-[300] overflow-hidden min-w-[140px] animate-in slide-in-from-top-2 fade-in duration-150">
          {LANG_OPTIONS.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-gray-800 ${
                i18n.language === lang.code
                  ? 'text-cyan-400 bg-cyan-900/20'
                  : 'text-gray-300'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {i18n.language === lang.code && (
                <span className="ml-auto text-[9px] text-cyan-500">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
