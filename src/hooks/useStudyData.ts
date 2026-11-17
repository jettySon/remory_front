import { useEffect, useMemo, useRef, useState } from 'react';
import { authenticate, endSession, type AccountAction, type Session } from '../api/account';
import { ApiError } from '../api/request';
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

const sessionKey = 'remory-account-session';
type Connection = { session: Session; library: StudyLibrary };
type StudyUpdate = (data: StudyData) => StudyData;

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(sessionKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as Session;
    return value.accessToken && Date.parse(value.expiresAt) > Date.now() ? value : null;
  } catch {
    return null;
  }
}

function rememberSession(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(sessionKey, JSON.stringify(session));
    else sessionStorage.removeItem(sessionKey);
  } catch {
    // The active session still works when browser storage is unavailable.
  }
}

function mergeById<T extends { id: string }>(items: T[], updates: T[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const update of updates) byId.set(update.id, update);
  return [...byId.values()];
}

export function useStudyData() {
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
  const [syncError, setSyncError] = useState('');
  const inFlight = useRef(false);

  useEffect(() => {
    if (!savedSession) return;
    const controller = new AbortController();
    fetchStudy(savedSession.accessToken, controller.signal)
      .then((library) => {
        if (!controller.signal.aborted) setConnection({ session: savedSession, library });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          rememberSession(null);
          setSavedSession(null);
          setSyncError('로그인이 만료됐어요. 다시 로그인해 주세요.');
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

  async function connect(action: AccountAction, email: string, password: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      let session: Session;
      try {
        session = await authenticate(action, email, password);
      } catch (error) {
        const fallback = '계정 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.';
        if (error instanceof ApiError) {
          const known =
            error.status === 401
              ? '이메일 또는 비밀번호를 확인해 주세요.'
              : error.status === 409
                ? '이미 가입된 이메일이에요.'
                : error.status === 400
                  ? '이메일과 비밀번호 형식을 확인해 주세요.'
                  : fallback;
          throw new Error(error.message || known);
        }
        throw new Error(fallback);
      }

      const local = readGuestStudy();
      let library: StudyLibrary;
      try {
        if (local.changed) await importStudy(session.accessToken, local.data);
        library = await fetchStudy(session.accessToken);
      } catch {
        void endSession(session.accessToken).catch(() => undefined);
        const signup = action === 'signup' ? '가입은 완료됐어요. 다시 로그인해 주세요. ' : '';
        throw new Error(
          `${signup}${local.changed ? '기록을 가져오지 못했어요. 이 기기의 기록은 보관했어요.' : '계정의 기록을 불러오지 못했어요.'}`,
        );
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
            if (latest.changed) setSyncError('다른 탭에서 변경된 비회원 기록은 이 기기에 보관했어요.');
          }
        } catch {
          setSyncError('기록은 계정에 저장됐지만, 이 기기의 비회원 기록을 비우지 못했어요.');
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

  async function disconnect() {
    if (!connection || inFlight.current) return;
    inFlight.current = true;
    try {
      await endSession(connection.session.accessToken);
      rememberSession(null);
      setConnection(null);
      setSavedSession(null);
    } catch {
      throw new Error('로그아웃하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      inFlight.current = false;
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
        setSyncError(error instanceof ApiError ? error.message : '이 기기에 학습 기록을 저장하지 못했어요.');
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
        rememberSession(null);
        setSavedSession(null);
        setConnection(null);
        setSyncError('로그인이 만료됐어요. 다시 로그인해 주세요.');
      } else {
        setSyncError(
          error instanceof ApiError && error.message
            ? error.message
            : '학습 기록을 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.',
        );
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
          throw new ApiError(404, '수정할 카드를 찾지 못했어요.');
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
          throw new ApiError(404, '복습할 카드를 찾지 못했어요.');
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
    disconnect,
    account: connection?.session.account,
    token: connection?.session.accessToken,
    activityVersion,
    guestPending: guest.changed,
    restoring,
    restoreError,
    retryRestore,
    continueAsGuest,
    saving,
    syncError,
    clearSyncError: () => setSyncError(''),
  };
}
