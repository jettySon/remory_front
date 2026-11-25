export type Page = 'home' | 'decks' | 'review' | 'calendar' | 'stats' | 'deck-detail';
export type Rating = 'again' | 'hard' | 'good' | 'easy';
export type DeckTheme = 'peach' | 'lavender' | 'butter' | 'blue';
export type Deck = { id: string; title: string; subtitle: string; theme: DeckTheme; icon: string };
export type DeckContent = Pick<Deck, 'title' | 'subtitle' | 'theme'>;
export type StudyCard = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  dueAt: string;
  repetitions: number;
  kind?: CardKind;
  choices?: string[];
  explanation?: string;
};
export type ReviewMode = 'scheduled' | 'focus' | 'free';
export type FirstRecall = 'self_recalled' | 'self_missed' | 'choice_correct' | 'choice_incorrect' | 'choice_revealed';
export type ReviewLog = {
  id: string;
  cardId: string;
  rating: Rating;
  date: string;
  mode?: ReviewMode;
  firstRecall?: FirstRecall | null;
};

export type CardKind = 'basic' | 'word' | 'cloze' | 'choice';
export type CardContent = Pick<StudyCard, 'front' | 'back' | 'choices' | 'explanation'>;
export type CardDraft = CardContent & Pick<StudyCard, 'kind'>;
