import type { MessageKey } from '../i18n/messages';
import type { DeckTheme } from '../types';

export const deckKinds = [
  { icon: 'language', label: 'decks.kind.language', theme: 'peach', card: 'word' },
  { icon: 'code', label: 'decks.kind.code', theme: 'lavender', card: 'basic' },
  { icon: 'history', label: 'decks.kind.history', theme: 'butter', card: 'cloze' },
  { icon: 'book', label: 'decks.kind.book', theme: 'blue', card: 'basic' },
] as const;

export const themeLabels = {
  lavender: 'decks.color.lavender',
  peach: 'decks.color.peach',
  butter: 'decks.color.butter',
  blue: 'decks.color.blue',
  sage: 'decks.color.sage',
  fog: 'decks.color.fog',
} as const satisfies Record<DeckTheme, MessageKey>;
