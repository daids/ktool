"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { locales } from '../next-intl.config.js';

const languageNames = {
  en: 'English',
  'zh-CN': '简体中文',
  ja: '日本語',
  ko: '한국어'
} as const;

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const t = useTranslations('language');

  const switchLocale = (newLocale: string) => {
    // Remove current locale from pathname if it exists
    const segments = pathname.split('/');
    const currentLocaleIndex = segments.findIndex(segment => locales.includes(segment));

    if (currentLocaleIndex > 0) {
      segments.splice(currentLocaleIndex, 1);
    }

    // Add new locale at the beginning
    if (newLocale !== 'en') {
      segments.splice(1, 0, newLocale);
    }

    const newPath = segments.join('/') || '/';
    router.push(newPath);
  };

  return (
    <div className="relative">
      <select
        value={currentLocale}
        onChange={(e) => switchLocale(e.target.value)}
        className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {languageNames[locale as keyof typeof languageNames]}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
