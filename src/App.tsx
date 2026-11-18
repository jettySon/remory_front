import { useEffect, useRef, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { AppHeader, BottomNav } from './components/Navigation';
import { AccountModal } from './components/dialogs/AccountModal';
import { CreateCardModal } from './components/dialogs/CreateCardModal';
import { CreateDeckModal } from './components/dialogs/CreateDeckModal';
import { DeleteCardModal } from './components/dialogs/DeleteCardModal';
import { EditCardModal } from './components/dialogs/EditCardModal';
import { FreeReviewModal } from './components/dialogs/FreeReviewModal';
import { SettingsModal } from './components/dialogs/SettingsModal';
import { AccountDeletionForm } from './components/AccountDeletionForm';
import { Modal } from './components/Modal';
import { useReviewSession } from './hooks/useReviewSession';
import { useStoredState } from './hooks/useStoredState';
import { useStudyData } from './hooks/useStudyData';
import { useStudyQuery } from './hooks/useStudyQuery';
import { CalendarPage } from './pages/CalendarPage';
import { DeckDetailPage } from './pages/DeckDetailPage';
import { DecksPage } from './pages/DecksPage';
import { HomePage } from './pages/HomePage';
import { ReviewPage } from './pages/ReviewPage';
import { StatsPage, type StatsFilters } from './pages/StatsPage';
import { getReviewWeek, type DailyCounts } from './study/insights';
import { localDay, today } from './study/review';
import { activityPath } from './api/study';
import type { AccountAction } from './api/account';
import type { CardContent, CardDraft, DeckTheme, Page } from './types';

type AppModal =
  | 'deck'
  | 'card'
  | 'account'
  | 'settings'
  | 'withdraw-account'
  | 'free-review'
  | { type: 'edit-card' | 'delete-card'; cardId: string };

export default function App() {
  const [theme, setTheme] = useStoredState<'light' | 'dark'>('remory-theme', 'light');
  const [page, setPage] = useState<Page>('home');
  const [openDeckId, setOpenDeckId] = useState<string>();
  const [modal, setModal] = useState<AppModal | null>(null);
  const [notice, setNotice] = useState('');
  const [statsFilters, setStatsFilters] = useState<StatsFilters>({ period: 'all', deckId: null });
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const settingsTrigger = useRef<HTMLButtonElement>(null);

  const study = useStudyData();
  const { decks, cards, studyLogs, account, token, saving, activityVersion } = study;
  const review = useReviewSession(cards, study.recordReview);
  const date = new Date();
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 6);
  const tomorrow = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const remoteActivity = useStudyQuery<DailyCounts>(
    token,
    activityPath(localDay(weekStart), localDay(tomorrow)),
    activityVersion,
  );
  const activity = token
    ? remoteActivity.data
    : Object.fromEntries(getReviewWeek(studyLogs, cards).map(({ key, counts }) => [key, counts]));
  const todayReviews = activity?.[today()]?.total ?? 0;
  const selectedDeck = decks.find((deck) => deck.id === openDeckId) || decks[0];
  const selectedCards = cards.filter((card) => card.deckId === selectedDeck?.id);
  const cardModal = modal && typeof modal === 'object' ? modal : null;
  const actionCard = cardModal ? cards.find((card) => card.id === cardModal.cardId) : undefined;
  const reviewTheme = decks.find((deck) => deck.id === review.current?.deckId)?.theme;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const previousAccountId = useRef(account?.id);
  useEffect(() => {
    if (previousAccountId.current && !account) {
      setModal(null);
      setPage('home');
      setOpenDeckId(undefined);
      setStatsFilters({ period: 'all', deckId: null });
    }
    previousAccountId.current = account?.id;
  }, [account]);

  function afterAccountChange() {
    closeAccount();
    setPage('home');
    setOpenDeckId(undefined);
    setStatsFilters({ period: 'all', deckId: null });
  }

  async function connectAccount(action: AccountAction, email: string, password: string) {
    const imported = await study.connect(action, email, password);
    afterAccountChange();
    if (imported) setNotice('이 기기의 학습 기록을 계정에 가져왔어요.');
    else setNotice(action === 'signup' ? '가입이 완료됐어요.' : '계정에 로그인했어요.');
  }

  async function logout() {
    await study.disconnect();
    afterAccountChange();
    setNotice('로그아웃했어요.');
  }

  async function withdrawAccount(password: string) {
    await study.withdrawAccount(password);
    closeSettings();
    setNotice('회원탈퇴가 완료됐어요.');
  }

  function openEditor() {
    setModal(decks.length ? 'card' : 'deck');
  }

  function closeEditor() {
    if (!saving) setModal(null);
  }

  function startReview(deckId?: string) {
    review.start(deckId);
    setPage('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startPractice(cardIds: string[]) {
    review.startPractice(cardIds);
    setPage('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startFreeReview(deckId: string) {
    review.startFree(deckId);
    setModal(null);
    setPage('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function chooseFreeReviewDeck() {
    setModal('free-review');
  }

  function navigate(next: Page) {
    if (saving) return;
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

  async function addDeck(title: string, subtitle: string, theme: DeckTheme, icon: string) {
    const id = await study.createDeck({ title, subtitle, theme, icon });
    if (!id) return;
    setModal(null);
    setOpenDeckId(id);
    setPage('deck-detail');
    setNotice('덱을 만들었어요.');
  }

  async function addCards(deckId: string, drafts: CardDraft[]) {
    if (!(await study.createCards(deckId, drafts))) return;
    setModal(null);
    setOpenDeckId(deckId);
    setPage('deck-detail');
    setNotice(`카드 ${drafts.length}장을 추가했어요.`);
  }

  async function editCard(cardId: string, content: CardContent) {
    if (!(await study.editCard(cardId, content))) return;
    setModal(null);
    setNotice('카드를 수정했어요.');
  }

  async function deleteCard(cardId: string) {
    if (!(await study.deleteCard(cardId))) return;
    setModal(null);
    setNotice('카드를 삭제했어요.');
  }

  function openSettings(trigger: HTMLButtonElement) {
    if (saving) return;
    settingsTrigger.current = trigger;
    setModal('settings');
  }

  function closeSettings() {
    setModal(null);
    settingsTrigger.current?.focus();
  }

  function openAccount(trigger: HTMLButtonElement) {
    if (saving) return;
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
        {study.restoring || study.restoreError ? (
          <section className="page account-restore" aria-label="계정 연결">
            {study.restoring ? (
              <p role="status">계정의 학습 기록을 불러오는 중이에요.</p>
            ) : (
              <>
                <p role="alert">계정의 학습 기록을 불러오지 못했어요.</p>
                <button className="big-primary" onClick={study.retryRestore}>
                  다시 연결
                </button>
                <button className="plain-link" onClick={study.continueAsGuest}>
                  비회원으로 계속
                </button>
              </>
            )}
          </section>
        ) : (
          <>
            <AppHeader
              onStats={() => navigate('stats')}
              reviewsToday={todayReviews}
              onAccount={openAccount}
              signedIn={Boolean(account)}
              onSettings={openSettings}
            />
            <div className="app-scroll" key={page}>
              {page === 'home' && (
                <HomePage
                  decks={decks}
                  cards={cards}
                  activity={activity}
                  openDeck={openDeck}
                  go={navigate}
                  startReview={startReview}
                  onCreate={openEditor}
                  onFreeReview={chooseFreeReviewDeck}
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
                  onEdit={(cardId) => setModal({ type: 'edit-card', cardId })}
                  onDelete={(cardId) => setModal({ type: 'delete-card', cardId })}
                  onStudy={() => startReview(selectedDeck.id)}
                  onFreeReview={() => startFreeReview(selectedDeck.id)}
                />
              )}
              {page === 'review' && (
                <ReviewPage
                  key={`${review.sessionId}-${review.current?.id ?? 'empty'}`}
                  current={review.current}
                  theme={reviewTheme}
                  progress={review.progress}
                  total={review.total}
                  finished={review.finished}
                  empty={review.total === 0}
                  flipped={review.flipped}
                  flip={review.flip}
                  rate={review.rate}
                  pendingRating={review.pendingRating}
                  saving={saving}
                  restart={startReview}
                  mode={review.mode}
                  onStats={() => navigate('stats')}
                  onFreeReview={chooseFreeReviewDeck}
                  emptyAction={
                    cards.length
                      ? undefined
                      : {
                          label: decks.length ? '첫 카드 추가' : '첫 덱 만들기',
                          onClick: openEditor,
                        }
                  }
                  onCalendar={() => navigate('calendar')}
                />
              )}
              {page === 'calendar' && (
                <CalendarPage logs={studyLogs} token={token} activityVersion={activityVersion} />
              )}
              {page === 'stats' && (
                <StatsPage
                  decks={decks}
                  cards={cards}
                  logs={studyLogs}
                  token={token}
                  activityVersion={activityVersion}
                  openDeck={openDeck}
                  startPractice={startPractice}
                  filters={statsFilters}
                  onFilterChange={setStatsFilters}
                  back={() => navigate('home')}
                />
              )}
            </div>
            <BottomNav page={page} onNavigate={navigate} />
          </>
        )}
      </main>
      {!study.restoring && !study.restoreError && page !== 'calendar' && page !== 'stats' && (
        <button
          className="floating-add"
          disabled={saving}
          onClick={openEditor}
          aria-label={decks.length ? '새 카드 추가' : '새 덱 만들기'}
        >
          <Plus size={23} />
        </button>
      )}
      {modal === 'free-review' && (
        <FreeReviewModal
          decks={decks}
          cards={cards}
          onStart={startFreeReview}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'settings' && (
        <SettingsModal
          dark={theme === 'dark'}
          onToggleDark={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          onClose={closeSettings}
          onWithdraw={account ? () => setModal('withdraw-account') : undefined}
        />
      )}
      {modal === 'withdraw-account' && account && (
        <Modal
          title="회원탈퇴"
          onClose={() => {
            if (!saving) setModal('settings');
          }}
        >
          <AccountDeletionForm
            email={account.email}
            onDelete={(_, password) => withdrawAccount(password)}
            onCancel={() => setModal('settings')}
          />
        </Modal>
      )}
      {modal === 'account' && (
        <AccountModal
          account={account}
          guestPending={study.guestPending}
          onAuthenticate={connectAccount}
          onLogout={logout}
          onClose={closeAccount}
        />
      )}
      {modal === 'deck' && <CreateDeckModal onClose={closeEditor} onCreate={addDeck} saving={saving} />}
      {modal === 'card' && (
        <CreateCardModal
          decks={decks}
          defaultDeckId={page === 'deck-detail' ? openDeckId : undefined}
          onClose={closeEditor}
          onCreate={addCards}
          saving={saving}
        />
      )}
      {cardModal?.type === 'edit-card' && actionCard && (
        <EditCardModal
          key={actionCard.id}
          card={actionCard}
          theme={selectedDeck?.theme}
          saving={saving}
          onClose={closeEditor}
          onSave={(content) => editCard(actionCard.id, content)}
        />
      )}
      {cardModal?.type === 'delete-card' && actionCard && (
        <DeleteCardModal
          card={actionCard}
          saving={saving}
          onClose={closeEditor}
          onDelete={() => deleteCard(actionCard.id)}
        />
      )}
      {study.syncError ? (
        <div className="toast sync-error" role="alert">
          <span>{study.syncError}</span>
          <button type="button" onClick={study.clearSyncError}>
            닫기
          </button>
        </div>
      ) : (
        notice && (
          <div className="toast" role="status">
            <Sparkles size={17} />
            {notice}
          </div>
        )
      )}
    </div>
  );
}
