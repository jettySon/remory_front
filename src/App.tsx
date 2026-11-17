import { useEffect, useRef, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { AppHeader, BottomNav } from './components/Navigation';
import { AccountModal } from './components/dialogs/AccountModal';
import { CreateCardModal } from './components/dialogs/CreateCardModal';
import { CreateDeckModal } from './components/dialogs/CreateDeckModal';
import { useReviewSession } from './hooks/useReviewSession';
import { useStoredState } from './hooks/useStoredState';
import { useStudyData } from './hooks/useStudyData';
import { CalendarPage } from './pages/CalendarPage';
import { DeckDetailPage } from './pages/DeckDetailPage';
import { DecksPage } from './pages/DecksPage';
import { HomePage } from './pages/HomePage';
import { ReviewPage } from './pages/ReviewPage';
import { StatsPage } from './pages/StatsPage';
import { localDay, today } from './study/review';
import type { CardDraft, DeckTheme, Page } from './types';

export default function App() {
  const [theme, setTheme] = useStoredState<'light' | 'dark'>('remory-theme', 'light');
  const [page, setPage] = useState<Page>('home');
  const [openDeckId, setOpenDeckId] = useState('english');
  const [modal, setModal] = useState<'deck' | 'card' | 'account' | null>(null);
  const [notice, setNotice] = useState('');
  const accountTrigger = useRef<HTMLButtonElement>(null);

  const { decks, cards, studyLogs, createDeck, createCards, recordReview } = useStudyData();
  const review = useReviewSession(cards, recordReview);
  const dark = theme === 'dark';
  const todayReviews = studyLogs.filter((log) => localDay(log.date) === today()).length;
  const selectedDeck = decks.find((deck) => deck.id === openDeckId) || decks[0];
  const selectedCards = cards.filter((card) => card.deckId === selectedDeck?.id);
  const reviewTheme = decks.find((deck) => deck.id === review.current?.deckId)?.theme;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function startReview(deckId?: string) {
    review.start(deckId);
    setPage('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigate(next: Page) {
    if (next === 'review') {
      startReview();
      return;
    }
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openDeck(id: string) {
    setOpenDeckId(id);
    navigate('deck-detail');
  }

  function addDeck(title: string, subtitle: string, theme: DeckTheme, icon: string) {
    const id = createDeck({ title, subtitle, theme, icon });
    setModal(null);
    setOpenDeckId(id);
    setPage('deck-detail');
    setNotice('덱을 만들었어요.');
  }

  function addCards(deckId: string, drafts: CardDraft[]) {
    createCards(deckId, drafts);
    setModal(null);
    setOpenDeckId(deckId);
    setPage('deck-detail');
    setNotice(`카드 ${drafts.length}장을 추가했어요.`);
  }

  function openAccount(trigger: HTMLButtonElement) {
    accountTrigger.current = trigger;
    setModal('account');
  }

  function closeAccount() {
    setModal(null);
    accountTrigger.current?.focus();
  }

  return (
    <div className="site-background" data-theme={theme}>
      <div className="desktop-decoration">
        <div className="desktop-cloud">☁</div>
        <div className="desktop-copy">
          <span>DREAMY MEMORY GARDEN</span>
          <h2>
            작은 기억이
            <br />
            <em>꽃이 되는 곳.</em>
          </h2>
          <p>
            잊기 전에 다시 떠올리고,
            <br />
            배운 것을 오래 기억해요.
          </p>
          <div className="desktop-stars">✳ &nbsp; ✧ &nbsp; ✳</div>
        </div>
      </div>
      <main className="phone-shell">
        <AppHeader
          onStats={() => navigate('stats')}
          reviewsToday={todayReviews}
          onAccount={openAccount}
          dark={dark}
          toggleTheme={() => setTheme(dark ? 'light' : 'dark')}
        />
        <div className="app-scroll" key={page}>
          {page === 'home' && (
            <HomePage
              decks={decks}
              cards={cards}
              logs={studyLogs}
              openDeck={openDeck}
              go={navigate}
              startReview={startReview}
            />
          )}
          {page === 'decks' && (
            <DecksPage decks={decks} cards={cards} onOpen={openDeck} onCreate={() => setModal('deck')} />
          )}
          {page === 'deck-detail' && selectedDeck && (
            <DeckDetailPage
              deck={selectedDeck}
              cards={selectedCards}
              back={() => navigate('decks')}
              onAdd={() => setModal('card')}
              onStudy={() => startReview(selectedDeck.id)}
            />
          )}
          {page === 'review' && (
            <ReviewPage
              key={review.current?.id}
              current={review.current}
              theme={reviewTheme}
              progress={review.progress}
              total={review.total}
              finished={review.finished}
              empty={review.total === 0}
              flipped={review.flipped}
              flip={review.flip}
              rate={review.rate}
              restart={startReview}
              onCalendar={() => navigate('calendar')}
            />
          )}
          {page === 'calendar' && <CalendarPage logs={studyLogs} />}
          {page === 'stats' && <StatsPage cards={cards} logs={studyLogs} back={() => navigate('home')} />}
        </div>
        <BottomNav page={page} onNavigate={navigate} />
      </main>
      {page !== 'calendar' && (
        <button className="floating-add" onClick={() => setModal('card')} aria-label="새 카드 추가">
          <Plus size={23} />
        </button>
      )}
      {modal === 'account' && <AccountModal onClose={closeAccount} />}
      {modal === 'deck' && <CreateDeckModal onClose={() => setModal(null)} onCreate={addDeck} />}
      {modal === 'card' && (
        <CreateCardModal
          decks={decks}
          defaultDeckId={page === 'deck-detail' ? openDeckId : undefined}
          onClose={() => setModal(null)}
          onCreate={addCards}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <Sparkles size={17} />
          {notice}
        </div>
      )}
    </div>
  );
}
