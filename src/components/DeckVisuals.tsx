import { useLanguage } from '../i18n/LanguageProvider';
import { BookOpen, Code2, Landmark, Languages } from 'lucide-react';
import { Star } from './Illustrations';
import type { Deck } from '../types';

export function DeckIcon({ icon, size = 23 }: { icon: string; size?: number }) {
  if (icon === 'language') return <Languages size={size} strokeWidth={1.7} />;
  if (icon === 'code') return <Code2 size={size} strokeWidth={1.7} />;
  if (icon === 'history') return <Landmark size={size} strokeWidth={1.7} />;
  return <BookOpen size={size} strokeWidth={1.7} />;
}

export function DeckTile({ deck, count, onClick }: { deck: Deck; count: number; onClick: () => void }) {
  const { t } = useLanguage();
  return (
    <button className={`deck-tile ${deck.theme}`} onClick={onClick}>
      <div className="deck-tile-art">
        <span className="deck-icon">
          <DeckIcon icon={deck.icon} />
        </span>
        <Star className="tile-sparkle" />
      </div>
      <div>
        <strong>{deck.title}</strong>
        <span>{t('common.cards', { count })}</span>
      </div>
    </button>
  );
}
