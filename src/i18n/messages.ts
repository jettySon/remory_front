import ko, { type MessageKey } from './locales/ko';
import en from './locales/en';
import ja from './locales/ja';
import zhCN from './locales/zh-CN';

export type { MessageKey };

export const languages = [
  { value: 'ko', label: '한국어', lang: 'ko' },
  { value: 'en', label: 'English', lang: 'en' },
  { value: 'ja', label: '日本語', lang: 'ja' },
  { value: 'zh-CN', label: '简体中文', lang: 'zh-CN' },
] as const;

export type Locale = (typeof languages)[number]['value'];
export type Message = [key: MessageKey, values?: Record<string, string | number>];
export type Translate = (...message: Message) => string;

const catalogs: Record<Locale, Record<MessageKey, string | readonly [string, string]>> = {
  ko,
  en,
  ja,
  'zh-CN': zhCN,
};

function createTranslator(locale: Locale): Translate {
  const numbers = new Intl.NumberFormat(locale);
  const plural = new Intl.PluralRules(locale);
  return (key, values) => {
    const message = catalogs[locale][key];
    const template = typeof message === 'string' ? message : message[plural.select(Number(values?.count)) === 'one' ? 0 : 1];
    return template.replace(/\{(\w+)\}/g, (original, name: string) => {
      const value = values?.[name];
      if (typeof value === 'number') return numbers.format(value);
      return value ?? original;
    });
  };
}

export const translators = {
  ko: createTranslator('ko'),
  en: createTranslator('en'),
  ja: createTranslator('ja'),
  'zh-CN': createTranslator('zh-CN'),
};

export function formatWeekday(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
}
