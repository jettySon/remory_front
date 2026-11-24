import type { GoogleProof } from './api/google';
import { isAndroidApp } from './platform/android';
import { useLanguage } from './i18n/LanguageProvider';
import type { Message } from './i18n/messages';
import { useEffect, useRef, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { AppHeader, BottomNav } from './components/Navigation';
import { AccountModal } from './components/dialogs/AccountModal';
import { CreateCardModal } from './components/dialogs/CreateCardModal';
import { CreateDeckModal } from './components/dialogs/CreateDeckModal';
import { DeleteDeckModal } from './components/dialogs/DeleteDeckModal';
import { EditDeckModal } from './components/dialogs/EditDeckModal';
import { DeleteCardModal } from './components/dialogs/DeleteCardModal';
import { EditCardModal } from './components/dialogs/EditCardModal';
import { ScheduledReviewModal } from './components/dialogs/ScheduledReviewModal';
import { FreeReviewModal } from './components/dialogs/FreeReviewModal';
import { SettingsModal } from './components/dialogs/SettingsModal';
import { AccountDeletionForm } from './components/AccountDeletionForm';
import { Modal, ModalLayer } from './components/Modal';
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
import { isDue, localDay, today } from './study/review';
import { activityPath } from './api/study';
import type { GuestImportPreference } from './study/guestData';
import type { AccountAction } from './api/account';
import type { CardContent, CardDraft, DeckContent, DeckTheme, Page } from './types';

type AppModal =
  | 'deck'
  | 'card'
  | 'account'
  | 'settings'
  | 'withdraw-account'
  | 'free-review'
  | 'scheduled-review'
  | { type: 'edit-card' | 'delete-card'; cardId: string }
  | { type: 'edit-deck' | 'delete-deck'; deckId: string };

export default function App() {
  const { t } = useLanguage();
  const [theme, setTheme] = useStoredState<'light' | 'dark'>('remory-theme', 'light');
  const [page, setPage] = useState<Page>('home');
  const [openDeckId, setOpenDeckId] = useState<string>();
  const [modalState, setModalState] = useState<{
    dialog: AppModal;
    key: number;
    closing: boolean;
  } | null>(null);
  const modal = modalState?.dialog;
  const [notice, setNotice] = useState<Message | null>(null);
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
  const itemModal = modal && typeof modal === 'object' ? modal : null;
  const cardModal = itemModal && 'cardId' in itemModal ? itemModal : null;
  const deckModal = itemModal && 'deckId' in itemModal ? itemModal : null;
  const actionDeck = deckModal ? decks.find((deck) => deck.id === deckModal.deckId) : undefined;
  const actionCard = cardModal ? cards.find((card) => card.id === cardModal.cardId) : undefined;
  const reviewDeck = decks.find((deck) => deck.id === (review.current?.deckId ?? review.deckId));

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!isAndroidApp()) return;
    window.__remoryHandleBack = () => {
      if (saving) return true;
      if (modalState) { setModal(null); return true; }
      if (page !== 'home') {
        setPage(page === 'deck-detail' ? 'decks' : 'home');
        window.scrollTo({ top: 0 });
        return true;
      }
      return false;
    };
    return () => { delete window.__remoryHandleBack; };
  }, [page, modalState, saving]);

  const previousAccountId = useRef(account?.id);
  useEffect(() => {
    if (previousAccountId.current && !account) {
      setModalState(null);
      setPage('home');
      setOpenDeckId(undefined);
      setStatsFilters({ period: 'all', deckId: null });
    }
    previousAccountId.current = account?.id;
  }, [account]);

  function afterAccountChange() {
    setModalState(null);
    accountTrigger.current?.focus();
    setPage('home');
    setOpenDeckId(undefined);
    setStatsFilters({ period: 'all', deckId: null });
  }

  async function connectAccount(action: AccountAction, email: string, password: string, preference: GuestImportPreference) {
    const imported = await study.connect(action, email, password, preference);
    afterAccountChange();
    if (imported) setNotice(['account.imported']);
    else setNotice([action === 'signup' ? 'account.signedUp' : 'account.loggedIn']);
  }

  async function connectGoogleAccount(proof: GoogleProof, password: string | undefined, preference: GuestImportPreference) {
    const imported = await study.connectGoogle(proof, password, preference);
    afterAccountChange();
    setNotice([imported ? 'account.imported' : 'account.loggedIn']);
  }

  async function withdrawGoogleAccount(proof: GoogleProof) {
    await study.withdrawGoogleAccount(proof);
    closeSettings();
    setNotice(['account.deleteSuccess']);
  }

  async function logout() {
    await study.disconnect();
    afterAccountChange();
    setNotice(['account.loggedOut']);
  }

  async function withdrawAccount(password: string) {
    await study.withdrawAccount(password);
    closeSettings();
    setNotice(['account.deleteSuccess']);
  }

  function setModal(next: AppModal | null) {
    setModalState((current) => {
      if (next !== null) {
        return { dialog: next, key: (current?.key ?? 0) + 1, closing: false };
      }
      return current && !current.closing ? { ...current, closing: true } : current;
    });
  }

  function openEditor() {
    setModal(decks.length ? 'card' : 'deck');
  }

  function closeEditor() {
    if (!saving) setModal(null);
  }

  function startReview(deckId?: string) {
    if (saving) return;
    if (deckId === undefined && decks.length > 1) {
      setModal('scheduled-review');
      return;
    }
    const deck = decks.find((item) => item.id === (deckId ?? decks[0]?.id));
    const deckCards = cards.filter((card) => card.deckId === deck?.id);
    // 예정 카드가 없으면 같은 덱의 자유 복습으로 전환해 기존 복습일을 유지한다.
    if (deck && deckCards.length > 0 && !deckCards.some(isDue)) review.startFree(deck.id);
    // 덱이 없거나 사라진 경우 빈 복습 화면으로 이동한다. 다른 덱으로 대체하지 않는다.
    else review.start(deck?.id ?? '');
    setModal(null);
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
    setNotice(['decks.created']);
  }

  async function editDeck(deckId: string, content: DeckContent) {
    if (!(await study.editDeck(deckId, content))) return;
    setModal(null);
    setNotice(['decks.edited']);
  }

  async function deleteDeck(deckId: string) {
    if (!(await study.deleteDeck(deckId))) return;
    setModal(null);
    setOpenDeckId(undefined);
    setPage('decks');
    setStatsFilters((current) => current.deckId === deckId ? { ...current, deckId: null } : current);
    setNotice(['decks.deleted']);
  }

  async function addCards(deckId: string, drafts: CardDraft[]) {
    if (!(await study.createCards(deckId, drafts))) return;
    setModal(null);
    setOpenDeckId(deckId);
    setPage('deck-detail');
    setNotice(['cards.added', { count: drafts.length }]);
  }

  async function editCard(cardId: string, content: CardContent) {
    if (!(await study.editCard(cardId, content))) return;
    setModal(null);
    setNotice(['cards.edited']);
  }

  async function deleteCard(cardId: string) {
    if (!(await study.deleteCard(cardId))) return;
    setModal(null);
    setNotice(['cards.deleted']);
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
            {t('app.desktopFirst')}
            <br />
            <em>{t('app.desktopSecond')}</em>
          </h2>
          <p>
            {t('app.desktopLead')}
            <br />
            {t('app.desktopTail')}
          </p>
          <div className="desktop-stars">✳ &nbsp; ✧ &nbsp; ✳</div>
        </div>
      </div>
      <main className="phone-shell">
        {study.restoring || study.restoreError ? (
          <section className="page account-restore" aria-label={t('account.restore')}>
            {study.restoring ? (
              <p role="status">{t('account.restoring')}</p>
            ) : (
              <>
                <p role="alert">{t('account.restoreFailed')}</p>
                <button className="big-primary" onClick={study.retryRestore}>
                  {t('account.reconnect')}
                </button>
                <button className="plain-link" onClick={study.continueAsGuest}>
                  {t('account.continueGuest')}
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
                  key={selectedDeck.id}
                  deck={selectedDeck}
                  logs={studyLogs}
                  token={token}
                  activityVersion={activityVersion}
                  saving={saving}
                  onEditDeck={() => setModal({ type: 'edit-deck', deckId: selectedDeck.id })}
                  onDeleteDeck={() => setModal({ type: 'delete-deck', deckId: selectedDeck.id })}
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
                  lastReview={review.current ? study.lastReviewByCard.get(review.current.id) : undefined}
                  theme={reviewDeck?.theme}
                  deckTitle={reviewDeck?.title}
                  progress={review.progress}
                  total={review.total}
                  finished={review.finished}
                  empty={review.total === 0}
                  flipped={review.flipped}
                  flip={review.flip}
                  rate={review.rate}
                  pendingRating={review.pendingRating}
                  saving={saving}
                  restart={() => startReview()}
                  mode={review.mode}
                  onStats={() => navigate('stats')}
                  onFreeReview={chooseFreeReviewDeck}
                  emptyAction={
                    cards.length
                      ? undefined
                      : {
                          label: decks.length ? t('cards.addFirst') : t('decks.first'),
                          onClick: openEditor,
                        }
                  }
                  onCalendar={() => navigate('calendar')}
                />
              )}
              {page === 'calendar' && (
                <CalendarPage
                  logs={studyLogs}
                  token={token}
                  activityVersion={activityVersion}
                  onStats={() => navigate('stats')}
                />
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
      {!study.restoring && !study.restoreError && page !== 'calendar' && page !== 'stats' && page !== 'review' && (
        <button
          className="floating-add"
          disabled={saving}
          onClick={openEditor}
          aria-label={decks.length ? t('cards.add') : t('decks.new')}
        >
          <Plus size={23} />
        </button>
      )}
      {modalState && (
        <ModalLayer
          key={modalState.key}
          closing={modalState.closing}
          onExited={() => setModalState((current) => (
            current?.closing && current.key === modalState.key ? null : current
          ))}
        >
          {modal === 'scheduled-review' && (
            <ScheduledReviewModal decks={decks} cards={cards} saving={saving} onStart={startReview}
              onClose={closeEditor} />
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
              title={t('account.delete')}
              onClose={() => {
                if (!saving) setModal('settings');
              }}
            >
              <AccountDeletionForm
                email={account.email}
                googleOnly={account.hasPassword === false}
                onGoogleDelete={withdrawGoogleAccount}
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
              onGoogleAuthenticate={connectGoogleAccount}
              onLogout={logout}
              onClose={closeAccount}
            />
          )}
          {modal === 'deck' && <CreateDeckModal onClose={closeEditor} onCreate={addDeck} saving={saving} />}
          {deckModal?.type === 'edit-deck' && actionDeck && (
            <EditDeckModal key={actionDeck.id} deck={actionDeck} saving={saving} onClose={closeEditor}
              onSave={(content) => editDeck(actionDeck.id, content)} />
          )}
          {deckModal?.type === 'delete-deck' && actionDeck && (
            <DeleteDeckModal deck={actionDeck} count={cards.filter((card) => card.deckId === actionDeck.id).length}
              saving={saving} onClose={closeEditor} onDelete={() => deleteDeck(actionDeck.id)} />
          )}
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
        </ModalLayer>
      )}
      {study.syncError ? (
        <div className="toast sync-error" role="alert">
          <span>{study.syncError}</span>
          <button type="button" onClick={study.clearSyncError}>
            {t('common.close')}
          </button>
        </div>
      ) : (
        notice && (
          <div className="toast" role="status">
            <Sparkles size={17} />
            {t(...notice)}
          </div>
        )
      )}
    </div>
  );
}
