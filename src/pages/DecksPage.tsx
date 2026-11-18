import { useLanguage } from '../i18n/LanguageProvider';
import { useState } from 'react';
import { ArrowRight, Cloud, Plus, Search } from 'lucide-react';
import { DeckTile } from '../components/DeckVisuals';
import type { Deck, StudyCard } from '../types';

export function DecksPage({
  decks,
  cards,
  onOpen,
  onCreate,
}: {
  decks: Deck[];
  cards: StudyCard[];
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const filtered = decks.filter((d) =>
    `${d.title} ${d.subtitle}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="page decks-page">
      <div className="page-heading">
        <div>
          <h1>{t('decks.room')}</h1>
          <p>{t('decks.subtitle')}</p>
        </div>
        <span className="title-doodle">✿</span>
      </div>
      <label className="search-field">
        <Search size={19} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('decks.searchHint')}
          aria-label={t('decks.searchLabel')}
        />
      </label>
      <div className="deck-count-line">
        <span>
          {t('decks.all')} <strong>{t('decks.count', { count: decks.length })}</strong>
        </span>
      </div>
      <div className="deck-grid decks-big">
        {filtered.map((d) => (
          <DeckTile
            key={d.id}
            deck={d}
            count={cards.filter((c) => c.deckId === d.id).length}
            onClick={() => onOpen(d.id)}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="empty-state">
          <Cloud size={42} />
          <p>{search.trim() ? t('decks.noSearch') : t('decks.empty')}</p>
        </div>
      )}
      <button className="soft-create" onClick={onCreate}>
        <span>
          <Plus size={20} />
        </span>
        {t('decks.new')} <ArrowRight size={18} />
      </button>
    </div>
  );
}
