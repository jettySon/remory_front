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
import { readSession, rememberSession } from '../api/session';
import { ApiError } from '../api/request';
import { authenticateGoogle, deleteSignedInWithGoogle, type GoogleProof } from '../api/google';
import {
  deleteStudyCard,
  editStudyCard,
  fetchStudy,
  importStudy,
  saveCards,
  saveDeck,
  saveReview,
  type StudyData,
  type StudyLibrary,
} from '../api/study';
import { isStudyLog, newGuestStudy, readGuestStudy, writeGuestStudy } from '../study/guestData';
import { newStudyId } from '../study/review';
import { nextReviewAt } from '../study/reviewScheduler';
import type { CardContent, CardDraft, Deck, Rating, ReviewLog, ReviewMode } from '../types';

type Connection = { session: Session; library: StudyLibrary };
type StudyUpdate = (data: StudyData) => StudyData;

class MissingStudyCard extends Error {
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
  const [savedSession, setSavedSession] = useState(readSession);
  const [restoring, setRestoring] = useState(Boolean(savedSession));
  const [restoreError, setRestoreError] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activityVersion, setActivityVersion] = useState(0);
  const pendingDeck = useRef<{ key: string; id: string } | undefined>(undefined);
  const pendingCards = useRef<{ key: string; ids: string[] } | undefined>(undefined);
  const [syncError, setSyncError] = useState<MessageKey | ''>('');
  const inFlight = useRef(false);

  useEffect(() => {
    if (!savedSession) return;
    const controller = new AbortController();
    Promise.all([
      fetchStudy(savedSession.accessToken, controller.signal),
      fetchAccount(savedSession.accessToken, controller.signal),
    ])
      .then(([library, account]) => {
        if (!controller.signal.aborted) {
          const session = { ...savedSession, account };
          rememberSession(session);
          setConnection({ session, library });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          rememberSession(null);
          setSavedSession(null);
          setSyncError('errors.sessionExpired');
        } else {
          setRestoreError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRestoring(false);
      });
    return () => controller.abort();
  }, [savedSession, restoreAttempt]);

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
    rememberSession(null);
    setSavedSession(null);
    setRestoreError(false);
  }

  function connect(action: AccountAction, email: string, password: string) {
    return connectSession(action, () => authenticate(action, email, password));
  }

  function connectGoogle(proof: GoogleProof, password?: string) {
    return connectSession('google', () => authenticateGoogle(proof, password));
  }

  async function connectSession(action: AccountAction | 'google', signIn: () => Promise<Session>) {
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
      let library: StudyLibrary;
      try {
        if (local.changed) await importStudy(session.accessToken, local.data);
        library = await fetchStudy(session.accessToken);
      } catch {
        void endSession(session.accessToken).catch(() => undefined);
        const message = t(local.changed ? 'errors.import' : 'errors.studyRestore');
        throw new Error(action === 'signup' ? `${t('errors.signupDone')} ${message}` : message);
      }

      if (local.changed) {
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
      rememberSession(session);
      pendingDeck.current = undefined;
      pendingCards.current = undefined;
      setConnection({ session, library });
      return local.changed;
    } finally {
      inFlight.current = false;
    }
  }

  function clearAccount() {
    rememberSession(null);
    setConnection(null);
    setSavedSession(null);
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
        setSyncError(error instanceof MissingStudyCard ? error.messageKey : 'errors.localSave');
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
      if (error instanceof ApiError && error.status === 401) {
        clearAccount();
        setSyncError('errors.sessionExpired');
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
          throw new MissingStudyCard('errors.editMissing');
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
          throw new MissingStudyCard('errors.reviewMissing');
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
