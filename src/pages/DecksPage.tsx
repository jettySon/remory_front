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
  const [search, setSearch] = useState('');
  const filtered = decks.filter((d) =>
    `${d.title} ${d.subtitle}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="page decks-page">
      <div className="page-heading">
        <div>
          <h1>나의 작은 공부방</h1>
          <p>주제별로 덱을 만들고 카드를 모아 보세요.</p>
        </div>
        <span className="title-doodle">✿</span>
      </div>
      <label className="search-field">
        <Search size={19} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="덱 이름이나 설명으로 검색"
          aria-label="학습 덱 검색"
        />
      </label>
      <div className="deck-count-line">
        <span>
          전체 덱 <strong>{decks.length}개</strong>
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
          <p>{search.trim() ? '검색 결과가 없어요.' : '아직 만든 덱이 없어요.'}</p>
        </div>
      )}
      <button className="soft-create" onClick={onCreate}>
        <span>
          <Plus size={20} />
        </span>
        새 덱 만들기 <ArrowRight size={18} />
      </button>
    </div>
  );
}
