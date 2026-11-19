import { useLanguage } from '../i18n/LanguageProvider';
import type { MessageKey } from '../i18n/messages';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  authenticate,
  fetchAccount,
  deleteSignedInAccount,
  endSession,
  type AccountAction,
  type Session,
} from '../api/account';
import { readSession, rememberSession, restoreSession, subscribeSession, startSessionLifecycle, suspendSession, hasSavedAccount } from '../api/session';
import { ApiError } from '../api/request';
import { authenticateGoogle, deleteSignedInWithGoogle, type GoogleProof } from '../api/google';
import {
  deleteStudyCard,
  deleteStudyDeck,
  editStudyDeck,
  editStudyCard,
  fetchStudy,
  importStudy,
  saveCards,
  saveDeck,
  saveReview,
  type StudyData,
  type StudyLibrary,
} from '../api/study';
import { isStudyLog, newGuestStudy, readGuestStudy, writeGuestStudy, type GuestImportPreference } from '../study/guestData';
import { newStudyId } from '../study/review';
import { nextReviewAt } from '../study/reviewScheduler';
import type { CardContent, CardDraft, Deck, DeckContent, Rating, ReviewLog, ReviewMode } from '../types';

type Connection = { session: Session; library: StudyLibrary };
type StudyUpdate = (data: StudyData) => StudyData;

class MissingStudyItem extends Error {
  constructor(readonly messageKey: MessageKey) {
    super(messageKey);
  }
}

function mergeById<T extends { id: string }>(items: T[], updates: T[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const update of updates) byId.set(update.id, update);
  return [...byId.values()];
}

export function useStudyData() {
  const { t } = useLanguage();
  const [guest, setGuest] = useState(readGuestStudy);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activityVersion, setActivityVersion] = useState(0);
  const pendingDeck = useRef<{ key: string; id: string } | undefined>(undefined);
  const pendingCards = useRef<{ key: string; ids: string[] } | undefined>(undefined);
  const [syncError, setSyncError] = useState<MessageKey | ''>('');
  const inFlight = useRef(false);

  const restoreController = useRef<AbortController | null>(null);
  const connectionRef = useRef(connection);
  connectionRef.current = connection;

  useEffect(() => {
    const stopLifecycle = startSessionLifecycle();
    const unsubscribe = subscribeSession(({ session, reason }) => {
      if (!session) {
        restoreController.current?.abort();
        restoreController.current = null;
        setConnection(null);
        setRestoreError(false);
        pendingDeck.current = undefined;
        pendingCards.current = undefined;
        if (reason === 'external-login') {
          setRestoring(true);
          setRestoreAttempt((value) => value + 1);
        } else {
          setRestoring(false);
          if (reason === 'expired') setSyncError('errors.sessionExpired');
        }
        return;
      }
      if (inFlight.current && reason === 'login') return;
      if (connectionRef.current && connectionRef.current.session.account.id !== session.account.id) {
        restoreController.current?.abort();
        restoreController.current = null;
        setConnection(null);
        pendingDeck.current = undefined;
        pendingCards.current = undefined;
        setRestoreError(false);
        setRestoring(true);
        setRestoreAttempt((value) => value + 1);
        return;
      }
      if (connectionRef.current?.session.account.id === session.account.id) {
        setConnection((current) => current?.session.account.id === session.account.id ? { ...current, session } : current);
      } else if (!restoreController.current && !inFlight.current) {
        setRestoring(true);
        setRestoreAttempt((value) => value + 1);
      }
    });
    return () => { unsubscribe(); stopLifecycle(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    restoreController.current = controller;
    setRestoring(true);
    setRestoreError(false);
    void (async () => {
      try {
        const saved = await restoreSession();
        if (controller.signal.aborted || !saved) return;
        const [library, account] = await Promise.all([
          fetchStudy(saved.accessToken, controller.signal),
          fetchAccount(saved.accessToken, controller.signal),
        ]);
        if (!controller.signal.aborted) {
          const active = readSession();
          if (active?.account.id === saved.account.id) setConnection({ session: { ...active, account }, library });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          rememberSession(null);
          setSyncError('errors.sessionExpired');
        } else if (hasSavedAccount()) setRestoreError(true);
      } finally {
        if (restoreController.current === controller) {
          restoreController.current = null;
          if (!controller.signal.aborted) setRestoring(false);
        }
      }
    })();
    return () => { controller.abort(); if (restoreController.current === controller) restoreController.current = null; };
  }, [restoreAttempt]);

  useEffect(() => {
    if (!restoreError) return;
    const reconnect = () => { setRestoreAttempt((value) => value + 1); };
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, [restoreError]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.storageArea === localStorage) setGuest(readGuestStudy());
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function retryRestore() {
    setRestoring(true);
    setRestoreError(false);
    setRestoreAttempt((value) => value + 1);
  }

  function continueAsGuest() {
    restoreController.current?.abort();
    restoreController.current = null;
    suspendSession();
    setRestoring(false);
    setRestoreError(false);
  }

  function connect(action: AccountAction, email: string, password: string, preference: GuestImportPreference) {
    return connectSession(action, () => authenticate(action, email, password), preference);
  }

  function connectGoogle(proof: GoogleProof, password: string | undefined, preference: GuestImportPreference) {
    return connectSession('google', () => authenticateGoogle(proof, password), preference);
  }

  async function connectSession(
    action: AccountAction | 'google', signIn: () => Promise<Session>, preference: GuestImportPreference,
  ) {
    if (inFlight.current) throw new Error(t('account.connecting'));
    inFlight.current = true;
    try {
      let session: Session;
      try {
        session = await signIn();
      } catch (error) {
        if (action === 'google') throw error;
        const status = error instanceof ApiError ? error.status : undefined;
        const message = status === 401
          ? 'errors.credentials'
          : status === 409
            ? 'errors.emailTaken'
            : status === 400
              ? 'errors.accountFormat'
              : 'errors.accountServer';
        throw new Error(t(message));
      }

      const local = readGuestStudy();
      // 가져오기를 선택한 경우에만 전송·정리한다. 로그인 복원에서는 자동 이관하지 않는다.
      const shouldImport = preference === 'import' && local.changed;
      let library: StudyLibrary;
      try {
        if (shouldImport) await importStudy(session.accessToken, local.data);
        library = await fetchStudy(session.accessToken);
      } catch {
        if (readSession()?.account.id === session.account.id) void endSession(session.accessToken).catch(() => undefined);
        const message = t(shouldImport ? 'errors.import' : 'errors.studyRestore');
        throw new Error(action === 'signup' ? `${t('errors.signupDone')} ${message}` : message);
      }

      if (shouldImport) {
        try {
          // 서버 저장을 확인한 뒤, 이관 중 다른 탭에서 새 기록을 추가했는지도 확인한다.
          const latest = readGuestStudy();
          if (JSON.stringify(latest) === JSON.stringify(local)) {
            const empty = newGuestStudy();
            writeGuestStudy(empty);
            setGuest(empty);
          } else {
            setGuest(latest);
            if (latest.changed) setSyncError('errors.otherTab');
          }
        } catch {
          setSyncError('errors.localCleanup');
        }
      }
      // 로그인 중 다른 탭에서 추가한 비회원 기록도 로그아웃 후 바로 표시한다.
      if (!shouldImport) setGuest(readGuestStudy());
      const active = readSession();
      if (!active || active.account.id !== session.account.id) throw new ApiError(409, '', 'SESSION_CHANGED');
      pendingDeck.current = undefined;
      pendingCards.current = undefined;
      setConnection({ session: active, library });
      return shouldImport;
    } finally {
      inFlight.current = false;
    }
  }

  function clearAccount() {
    rememberSession(null);
    setConnection(null);
    pendingDeck.current = undefined;
    pendingCards.current = undefined;
  }

  async function disconnect() {
    if (!connection || inFlight.current) return;
    inFlight.current = true;
    try {
      await endSession(connection.session.accessToken);
      window.google?.accounts.id.disableAutoSelect();
      clearAccount();
    } catch {
      throw new Error(t('errors.logout'));
    } finally {
      inFlight.current = false;
    }
  }

  function withdrawAccount(password: string) {
    return withdraw((token) => deleteSignedInAccount(token, password));
  }

  function withdrawGoogleAccount(proof: GoogleProof) {
    return withdraw((token) => deleteSignedInWithGoogle(token, proof));
  }

  async function withdraw(removeAccount: (token: string) => Promise<void>) {
    if (!connection || inFlight.current) {
      throw new ApiError(401, 'No active session');
    }

    inFlight.current = true;
    setSaving(true);
    setSyncError('');
    try {
      await removeAccount(connection.session.accessToken);
      clearAccount();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && !error.code?.startsWith('GOOGLE_')) {
        clearAccount();
        setSyncError('errors.sessionExpired');
      }
      throw error;
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  async function updateStudy(
    updateGuest: StudyUpdate,
    updateAccount: (token: string) => Promise<(library: StudyLibrary) => StudyLibrary>,
  ) {
    if (inFlight.current || restoring || restoreError) return false;
    setSyncError('');
    if (!connection) {
      try {
        const next = { data: updateGuest(readGuestStudy().data), changed: true };
        writeGuestStudy(next);
        setGuest(next);
        return true;
      } catch (error) {
        setSyncError(error instanceof MissingStudyItem ? error.messageKey : 'errors.localSave');
        return false;
      }
    }

    inFlight.current = true;
    setSaving(true);
    const { session } = connection;
    try {
      let apply: (library: StudyLibrary) => StudyLibrary;
      try {
        apply = await updateAccount(session.accessToken);
      } catch (error) {
        if (error instanceof ApiError && error.status < 500) throw error;
        apply = await updateAccount(session.accessToken);
      }
      setConnection((current) => current && { ...current, library: apply(current.library) });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.code === 'SESSION_CHANGED') return false;
      if (error instanceof ApiError && error.status === 401) {
        if (!readSession()) {
          clearAccount();
          setSyncError('errors.sessionExpired');
        }
      } else {
        const status = error instanceof ApiError ? error.status : undefined;
        const message = status === 404
          ? 'errors.studyMissing'
          : status === 409
            ? 'errors.studyConflict'
            : status === 400
              ? 'errors.studyInvalid'
              : 'errors.save';
        setSyncError(message);
      }
      return false;
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  async function createDeck(draft: Omit<Deck, 'id'>) {
    const key = JSON.stringify(draft);
    const id = pendingDeck.current?.key === key ? pendingDeck.current.id : newStudyId();
    pendingDeck.current = { key, id };
    const deck = { ...draft, id };
    const saved = await updateStudy(
      (data) => ({ ...data, decks: mergeById(data.decks, [deck]) }),
      async (token) => {
        const result = await saveDeck(token, deck);
        return (library) => ({ ...library, decks: mergeById(library.decks, [result]) });
      },
    );
    if (saved) pendingDeck.current = undefined;
    return saved ? id : null;
  }

  function editDeck(deckId: string, content: DeckContent) {
    return updateStudy(
      (data) => {
        if (!data.decks.some((deck) => deck.id === deckId)) throw new MissingStudyItem('errors.deckEditMissing');
        // 덱 표시 정보만 변경하며 카드·복습 기록과 일정은 그대로 둔다.
        return { ...data, decks: data.decks.map((deck) => deck.id === deckId ? { ...deck, ...content } : deck) };
      },
      async (token) => {
        const edited = await editStudyDeck(token, deckId, content);
        return (library) => ({ ...library, decks: mergeById(library.decks, [edited]) });
      },
    );
  }

  async function deleteDeck(deckId: string) {
    const saved = await updateStudy(
      (data) => {
        const removed = new Set(data.cards.filter((card) => card.deckId === deckId).map((card) => card.id));
        return {
          decks: data.decks.filter((deck) => deck.id !== deckId),
          cards: data.cards.filter((card) => card.deckId !== deckId),
          logs: data.logs.filter((log) => !removed.has(log.cardId)),
        };
      },
      async (token) => {
        await deleteStudyDeck(token, deckId);
        return (library) => ({
          ...library,
          decks: library.decks.filter((deck) => deck.id !== deckId),
          cards: library.cards.filter((card) => card.deckId !== deckId),
        });
      },
    );
    if (saved && connection) setActivityVersion((value) => value + 1);
    return saved;
  }

  async function createCards(deckId: string, drafts: CardDraft[]) {
    const key = JSON.stringify({ deckId, drafts });
    const ids = pendingCards.current?.key === key ? pendingCards.current.ids : drafts.map(newStudyId);
    pendingCards.current = { key, ids };
    const request = drafts.map((draft, index) => ({ ...draft, id: ids[index] }));
    const dueAt = new Date().toISOString();
    const newCards = request.map((draft) => ({ ...draft, deckId, dueAt, repetitions: 0 }));
    const saved = await updateStudy(
      (data) => ({ ...data, cards: mergeById(data.cards, newCards) }),
      async (token) => {
        const cards = await saveCards(token, deckId, request);
        return (library) => ({ ...library, cards: mergeById(library.cards, cards) });
      },
    );
    if (saved) pendingCards.current = undefined;
    return saved;
  }

  function editCard(cardId: string, content: CardContent) {
    return updateStudy(
      (data) => {
        if (!data.cards.some((card) => card.id === cardId)) {
          throw new MissingStudyItem('errors.editMissing');
        }
        return {
          ...data,
          cards: data.cards.map((card) => (card.id === cardId ? { ...card, ...content } : card)),
        };
      },
      async (token) => {
        const edited = await editStudyCard(token, cardId, content);
        return (library) => ({ ...library, cards: mergeById(library.cards, [edited]) });
      },
    );
  }

  async function deleteCard(cardId: string) {
    const saved = await updateStudy(
      (data) => ({
        ...data,
        cards: data.cards.filter((card) => card.id !== cardId),
        logs: data.logs.filter((log) => log.cardId !== cardId),
      }),
      async (token) => {
        await deleteStudyCard(token, cardId);
        return (library) => ({ ...library, cards: library.cards.filter((card) => card.id !== cardId) });
      },
    );
    if (saved && connection) setActivityVersion((value) => value + 1);
    return saved;
  }

  async function recordReview(cardId: string, rating: Rating, mode: ReviewMode, id: string) {
    const log: ReviewLog = { id, cardId, rating, date: new Date().toISOString(), mode };
    const saved = await updateStudy(
      (data) => {
        if (data.logs.some((item) => item.id === id)) return data;
        if (!data.cards.some((card) => card.id === cardId)) {
          throw new MissingStudyItem('errors.reviewMissing');
        }
        const logs = [...data.logs, log];
        if (mode !== 'scheduled') return { ...data, logs };
        const dueAt = nextReviewAt(data.logs, log);
        const cards = data.cards.map((card) =>
          card.id === cardId ? { ...card, dueAt, repetitions: card.repetitions + 1 } : card,
        );
        return { ...data, cards, logs };
      },
      async (token) => {
        // 로그인 상태에서는 서버가 최신 복습 기록으로 계산한 일정과 횟수를 화면에 반영한다.
        const { progress } = await saveReview(token, { id, cardId, rating, mode });
        return (library) => ({
          ...library,
          cards: library.cards.map((card) => (card.id === progress.id ? { ...card, ...progress } : card)),
        });
      },
    );
    if (saved && connection) setActivityVersion((value) => value + 1);
    return saved;
  }

  const { decks, cards } = connection?.library ?? guest.data;
  const studyLogs = useMemo(
    () => (connection ? [] : guest.data.logs.filter(isStudyLog)),
    [connection, guest.data.logs],
  );
  return {
    decks,
    cards,
    studyLogs,
    createDeck,
    editDeck,
    deleteDeck,
    createCards,
    editCard,
    deleteCard,
    recordReview,
    connect,
    connectGoogle,
    disconnect,
    withdrawAccount,
    withdrawGoogleAccount,
    account: connection?.session.account,
    token: connection?.session.accessToken,
    activityVersion,
    guestPending: guest.changed,
    restoring,
    restoreError,
    retryRestore,
    continueAsGuest,
    saving,
    syncError: syncError && t(syncError),
    clearSyncError: () => setSyncError(''),
  };
}
