import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  authenticate,
  endSession,
  fetchStudy,
  importStudy,
  putStudy,
  type AccountAction,
  type Session,
  type StudyData,
  type StudySnapshot,
} from '../api/account';
import { isStudyLog, newGuestStudy, readGuestStudy, writeGuestStudy } from '../study/guestData';
import type { CardDraft, Deck, Rating, ReviewLog, ReviewMode } from '../types';

const sessionKey = 'remory-account-session';
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const delayMs: Record<Rating, number> = {
  again: 10 * 60_000,
  hard: 86_400_000,
  good: 3 * 86_400_000,
  easy: 7 * 86_400_000,
};
type Connection = { session: Session; snapshot: StudySnapshot };
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

export function useStudyData() {
  const [guest, setGuest] = useState(readGuestStudy);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [savedSession, setSavedSession] = useState(readSession);
  const [restoring, setRestoring] = useState(Boolean(savedSession));
  const [restoreError, setRestoreError] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState('');
  const inFlight = useRef(false);

  useEffect(() => {
    if (!savedSession) return;
    const controller = new AbortController();
    fetchStudy(savedSession.accessToken, controller.signal)
      .then((snapshot) => {
        if (!controller.signal.aborted) setConnection({ session: savedSession, snapshot });
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
      let snapshot: StudySnapshot;
      try {
        snapshot = local.changed
          ? await importStudy(session.accessToken, {
              ...local.data,
              logs: local.data.logs.filter(isStudyLog),
            })
          : await fetchStudy(session.accessToken);
      } catch {
        void endSession(session.accessToken).catch(() => undefined);
        const signup = action === 'signup' ? '가입은 완료됐어요. 다시 로그인해 주세요. ' : '';
        throw new Error(
          `${signup}${local.changed ? '기록을 가져오지 못했어요. 이 기기의 기록은 보관했어요.' : '계정의 기록을 불러오지 못했어요.'}`,
        );
      }

      if (local.changed) {
        try {
          // Only clear the local queue once the account copy has been confirmed.
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
      setConnection({ session, snapshot });
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

  async function updateStudy(update: StudyUpdate) {
    if (inFlight.current || restoring || restoreError) return false;
    setSyncError('');
    if (!connection) {
      const next = { data: update(readGuestStudy().data), changed: true };
      try {
        writeGuestStudy(next);
        setGuest(next);
        return true;
      } catch {
        setSyncError('이 기기에 학습 기록을 저장하지 못했어요.');
        return false;
      }
    }

    inFlight.current = true;
    setSaving(true);
    const { session } = connection;
    const token = session.accessToken;
    try {
      let snapshot = connection.snapshot;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const applied = update(snapshot.data);
        if (applied === snapshot.data) {
          setConnection({ session, snapshot });
          return true;
        }
        try {
          const saved = await putStudy(token, { revision: snapshot.revision, data: applied });
          setConnection({ session, snapshot: saved });
          return true;
        } catch (error) {
          if (error instanceof ApiError && error.status < 500 && error.status !== 409) throw error;
          snapshot = await fetchStudy(token);
          setConnection({ session, snapshot });
        }
      }
      if (update(snapshot.data) === snapshot.data) return true;
      throw new Error('Concurrent study changes');
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

  async function createDeck(deck: Omit<Deck, 'id'>) {
    const id = uid();
    const saved = await updateStudy((data) =>
      data.decks.some((item) => item.id === id) ? data : { ...data, decks: [...data.decks, { ...deck, id }] },
    );
    return saved ? id : null;
  }

  function createCards(deckId: string, drafts: CardDraft[]) {
    const dueAt = new Date().toISOString();
    const newCards = drafts.map((draft) => ({ ...draft, id: uid(), deckId, dueAt, repetitions: 0 }));
    return updateStudy((data) => {
      const existing = new Set(data.cards.map((card) => card.id));
      const missing = newCards.filter((card) => !existing.has(card.id));
      return missing.length ? { ...data, cards: [...data.cards, ...missing] } : data;
    });
  }

  function recordReview(cardId: string, rating: Rating, mode: ReviewMode) {
    const now = Date.now();
    const dueAt = new Date(now + delayMs[rating]).toISOString();
    const log: ReviewLog = { id: uid(), cardId, rating, date: new Date(now).toISOString(), mode };
    return updateStudy((data) => {
      if (data.logs.some((item) => item.id === log.id)) return data;
      const cards =
        mode === 'scheduled'
          ? data.cards.map((card) =>
              card.id === cardId ? { ...card, dueAt, repetitions: card.repetitions + 1 } : card,
            )
          : data.cards;
      return { ...data, cards, logs: [...data.logs, log] };
    });
  }

  const { decks, cards, logs } = connection?.snapshot.data ?? guest.data;
  const studyLogs = useMemo(() => logs.filter(isStudyLog), [logs]);
  return {
    decks,
    cards,
    studyLogs,
    createDeck,
    createCards,
    recordReview,
    connect,
    disconnect,
    account: connection?.session.account,
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
