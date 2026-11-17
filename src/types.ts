export type Page = 'home' | 'decks' | 'review' | 'calendar' | 'stats' | 'deck-detail';
export type Rating = 'again' | 'hard' | 'good' | 'easy';
export type DeckTheme = 'peach' | 'lavender' | 'butter' | 'blue';
export type Deck = { id: string; title: string; subtitle: string; theme: DeckTheme; icon: string };
export type StudyCard = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  dueAt: string;
  repetitions: number;
  kind?: CardKind;
  choices?: string[];
};
export type ReviewMode = 'scheduled' | 'focus' | 'free';
export type ReviewLog = { id: string; cardId: string; rating: Rating; date: string; mode?: ReviewMode };

export type CardKind = 'basic' | 'word' | 'cloze' | 'choice';
export type CardDraft = Pick<StudyCard, 'front' | 'back' | 'kind' | 'choices'>;
