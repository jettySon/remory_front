import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, BarChart3, BookHeart, BookOpen, CalendarDays,
  Check, ChevronRight, Cloud, Code2, Download, Eye, EyeOff, Flower2,
  Heart, Home, Languages, Landmark, LibraryBig, Moon, Plus, Sun,
  RotateCcw, Search, Sparkles, UserRound, X
} from 'lucide-react';
import SelectField from './SelectField';
import type { CellValue, Sheet } from 'read-excel-file/browser';

type Page = 'home' | 'decks' | 'review' | 'garden' | 'stats' | 'deck-detail';
type Rating = 'again' | 'hard' | 'good' | 'easy';
type DeckTheme = 'peach' | 'lavender' | 'butter' | 'blue';
type Deck = { id: string; title: string; subtitle: string; theme: DeckTheme; icon: string };
type StudyCard = { id: string; deckId: string; front: string; back: string; dueAt: string; repetitions: number; kind?: CardKind; choices?: string[] };
type ReviewLog = { id: string; cardId: string; rating: Rating; date: string };

const initialDecks: Deck[] = [
  { id: 'english', title: '영어 단어', subtitle: '매일 조금씩 영어와 친해지기', theme: 'peach', icon: 'language' },
  { id: 'java', title: '개발 개념', subtitle: '알고 있는 것을 오래 기억하기', theme: 'lavender', icon: 'code' },
  { id: 'history', title: '한국사', subtitle: '이야기로 기억하는 역사', theme: 'butter', icon: 'history' },
  { id: 'general', title: '나의 메모', subtitle: '잊고 싶지 않은 작은 지식', theme: 'blue', icon: 'book' }
];
const yesterday = (daysBack = 0) => new Date(Date.now() - daysBack * 86_400_000).toISOString();
const initialCards: StudyCard[] = [
  { id: 'c1', deckId: 'java', front: 'REST API에서 멱등성이란?', back: '같은 요청을 여러 번 실행해도 서버의 최종 상태가 동일하게 유지되는 성질이에요.', dueAt: yesterday(1), repetitions: 2 },
  { id: 'c2', deckId: 'english', front: 'serendipity', back: '뜻밖의 행운, 우연히 발견한 기쁨\n\nA happy serendipity brought us together.', dueAt: yesterday(1), repetitions: 1 },
  { id: 'c3', deckId: 'history', front: '훈민정음이 반포된 해는?', back: '1446년, 세종 28년이에요.', dueAt: yesterday(1), repetitions: 0 },
  { id: 'c4', deckId: 'english', front: 'resilient', back: '회복력이 있는, 탄력 있는\n\nShe remained resilient despite difficulties.', dueAt: yesterday(1), repetitions: 2 },
  { id: 'c5', deckId: 'java', front: '트랜잭션 ACID의 네 가지 속성은?', back: '원자성(Atomicity), 일관성(Consistency), 격리성(Isolation), 지속성(Durability)', dueAt: yesterday(1), repetitions: 0 },
  { id: 'c6', deckId: 'general', front: '망각곡선과 간격 반복의 차이는?', back: '망각곡선은 시간이 지남에 따라 기억이 약해지는 경향을 설명하고, 간격 반복은 복습 간격을 조절해 기억을 강화하는 학습 방법이에요.', dueAt: yesterday(1), repetitions: 0 }
];
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const localDay = (date: string | Date) => new Date(date).toLocaleDateString('sv-SE');
const today = () => localDay(new Date());
const isDue = (c: StudyCard) => new Date(c.dueAt).getTime() <= Date.now();
const ratingLabels: Record<Rating, string> = { again: '다시', hard: '어려움', good: '보통', easy: '쉬움' };

function useStoredState<T>(key: string, initial: T): [T, (next: T | ((v: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : initial; }
    catch { return initial; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
}

function DeckIcon({ icon, size = 23 }: { icon: string; size?: number }) {
  if (icon === 'language') return <Languages size={size} strokeWidth={1.7} />;
  if (icon === 'code') return <Code2 size={size} strokeWidth={1.7} />;
  if (icon === 'history') return <Landmark size={size} strokeWidth={1.7} />;
  return <BookOpen size={size} strokeWidth={1.7} />;
}
function Star({ className = '' }: { className?: string }) {
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 0 2.8 9.2L24 12l-9.2 2.8L12 24l-2.8-9.2L0 12l9.2-2.8L12 0Z" fill="currentColor"/></svg>;
}
function SmallPill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`small-pill ${className}`}>{children}</span>;
}
function WeekRow({ logs }: { logs: ReviewLog[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(); dt.setHours(12, 0, 0, 0); dt.setDate(dt.getDate() - (6 - i));
    return { label: ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()], date: localDay(dt), n: logs.filter(l => localDay(l.date) === localDay(dt)).length };
  });
  return <div className="week-calendar">{days.map((d, i) => <div className="week-day" key={d.date}><span>{d.label}</span><div className={`week-dot tone-${i % 5} ${d.n ? 'active' : ''}`}>{d.n ? <Check size={14} strokeWidth={2.4} /> : <span className="week-blank" />}</div></div>)}</div>;
}
function Mascot({ className = '' }: { className?: string }) {
  return <img src="/mascot.svg" className={`mascot ${className}`} alt="볼이 발그레한 하얀 구름 캐릭터 몽이" draggable={false} />;
}
function AppHeader({ onStats, reviewsToday, dark, toggleTheme, onAccount }: {
  onStats: () => void; reviewsToday: number; dark: boolean; toggleTheme: () => void;
  onAccount: (trigger: HTMLButtonElement) => void;
}) {
  return <header className="app-header"><div className="brand"><span className="brand-cloud"><Cloud size={21} strokeWidth={2.2}/></span><span>remory<span className="brand-dot">.</span></span></div><div className="header-actions"><button className="theme-toggle" type="button" aria-label="다크 모드" aria-pressed={dark} onClick={toggleTheme}>{dark ? <Sun size={17}/> : <Moon size={17}/>}</button><button className="header-streak" onClick={onStats} aria-label="나의 학습 기록 보기"><Flower2 size={15}/><span>{reviewsToday ? '오늘도 반짝이는 중' : '작은 발자국 모으기'}</span><ChevronRight size={14}/></button><button className="account-trigger" type="button" aria-haspopup="dialog" onClick={e => onAccount(e.currentTarget)}><UserRound size={16} aria-hidden="true"/>로그인</button></div></header>;
}
function BottomNav({ page, onNavigate }: { page: Page; onNavigate: (next: Page) => void }) {
  const tabs = [
    { id: 'home' as Page, label: '홈', icon: Home },
    { id: 'decks' as Page, label: '학습 덱', icon: LibraryBig },
    { id: 'review' as Page, label: '복습', icon: BookHeart },
    { id: 'garden' as Page, label: '학습 기록', icon: CalendarDays }
  ];
  return <nav className="bottom-nav" aria-label="주요 화면">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onNavigate(id)} className={`nav-item ${page === id || (page === 'deck-detail' && id === 'decks') ? 'selected' : ''}`} aria-current={page === id ? 'page' : undefined}><span className="nav-icon"><Icon size={21} strokeWidth={1.8}/></span><span>{label}</span></button>)}</nav>;
}
function SectionHeading({ title, action, onClick }: { title: string; action?: string; onClick?: () => void }) {
  return <div className="section-heading"><h3>{title}</h3>{action && <button className="subtle-action" onClick={onClick}>{action}<ChevronRight size={15}/></button>}</div>;
}
function DeckTile({ deck, count, onClick }: { deck: Deck; count: number; onClick: () => void }) {
  return <button className={`deck-tile ${deck.theme}`} onClick={onClick}><div className="deck-tile-art"><span className="deck-icon"><DeckIcon icon={deck.icon}/></span><Star className="tile-sparkle"/></div><div><strong>{deck.title}</strong><span>{count} cards</span></div></button>;
}
function HomePage({ decks, cards, logs, openDeck, go, startReview }: {
  decks: Deck[]; cards: StudyCard[]; logs: ReviewLog[]; openDeck: (id: string) => void;
  go: (p: Page) => void; startReview: (deckId?: string) => void;
}) {
  const due = cards.filter(isDue).length;
  const completed = logs.filter(l => localDay(l.date) === today()).length;
  return <div className="page home-page">
    <div className="welcome-eyebrow"><Star/> a little memory, every day</div>
    <div className="welcome-heading"><h1>오늘의 기억도<br/><em>조금씩 피어나요.</em></h1><span className="welcome-heart">♡</span></div>
    <section className="hero" aria-label="오늘의 복습"><div className="hero-orb orb-a"/><div className="hero-orb orb-b"/><Star className="hero-star first"/><Star className="hero-star second"/><span className="hero-petal p1">✿</span><span className="hero-petal p2">✧</span><Mascot className="hero-mascot"/>
      <div className="hero-content"><SmallPill className="hero-eyebrow">☁ &nbsp; TODAY'S LITTLE MEMORY</SmallPill><h2>기억 산책을<br/>떠나볼까요?</h2><p>잊기 전에, 다정하게 다시 만나요.</p></div>
      <div className="hero-action-card"><div className="hero-count"><span>오늘 다시 만날 기억</span><strong>{due}<small> cards</small></strong></div><button className="round-primary" onClick={() => startReview()} aria-label="오늘의 복습 시작하기"><ArrowRight size={21}/></button></div>
    </section>
    <section className="week-section"><div className="section-heading"><h3>이번 주의 작은 발자국</h3><span className="caption-side">매일의 조각 ✦</span></div><WeekRow logs={logs}/></section>
    <section><SectionHeading title="나의 작은 공부방" action="전체보기" onClick={() => go('decks')}/><div className="deck-grid">{decks.slice(0, 4).map(d => <DeckTile key={d.id} deck={d} count={cards.filter(c => c.deckId === d.id).length} onClick={() => openDeck(d.id)}/>)}</div></section>
    <button className="stat-shortcut" onClick={() => go('stats')}><span className="stat-icon"><BarChart3 size={21}/></span><span><strong>차곡차곡 쌓인 기억</strong><small>오늘 {completed}장 복습했어요 · 기록 확인하기</small></span><ChevronRight size={18}/></button>
  </div>;
}
function DecksPage({ decks, cards, onOpen, onCreate }: { decks: Deck[]; cards: StudyCard[]; onOpen: (id: string) => void; onCreate: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = decks.filter(d => `${d.title} ${d.subtitle}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="page decks-page"><div className="page-eyebrow">MY LITTLE LIBRARY ✦</div><div className="page-heading"><div><h1>나의 작은 공부방</h1><p>기억하고 싶은 걸 차곡차곡 모아둬요.</p></div><span className="title-doodle">✿</span></div>
    <label className="search-field"><Search size={19}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="학습 덱 찾아보기" aria-label="학습 덱 검색"/></label>
    <div className="deck-count-line"><span>나의 학습 덱 <strong>{decks.length}</strong></span><span>언제든 다시 만날 수 있어요 ♡</span></div>
    <div className="deck-grid decks-big">{filtered.map(d => <DeckTile key={d.id} deck={d} count={cards.filter(c => c.deckId === d.id).length} onClick={() => onOpen(d.id)}/>)}</div>
    {filtered.length === 0 && <div className="empty-state"><Cloud size={42}/><p>일치하는 학습 덱이 없어요.</p></div>}
    <button className="soft-create" onClick={onCreate}><span><Plus size={20}/></span>나만의 학습 덱 만들기 <ArrowRight size={18}/></button>
    <div className="note-sticker"><Sparkles size={19}/><span>작은 지식도 모이면 커다란 기억이 돼요.</span></div>
  </div>;
}
function DeckDetailPage({ deck, cards, back, onAdd, onStudy }: { deck: Deck; cards: StudyCard[]; back: () => void; onAdd: () => void; onStudy: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return <div className="page"><button className="back-link" onClick={back}><ArrowLeft size={19}/> 학습 덱</button><div className={`deck-detail-banner ${deck.theme}`}><span className="detail-mini-art"><DeckIcon icon={deck.icon} size={38}/></span><span className="detail-spark">✦</span><span className="eyebrow-dark">{deckKinds.find(kind => kind.icon === deck.icon)?.label ?? '일반'}</span><h1>{deck.title}</h1><p>{deck.subtitle}</p><div className="detail-foot"><span>{cards.length}개의 기억 카드</span><button onClick={onStudy}>복습하기 <ArrowRight size={17}/></button></div></div><SectionHeading title="카드 목록" action={`${cards.length}개 카드`}/>
    <div className="card-list">{cards.map((card, i) => <button key={card.id} className="card-list-row" onClick={() => setExpanded(expanded === card.id ? null : card.id)}><span className="list-index">{String(i+1).padStart(2,'0')}</span><span className="list-card-content"><small>{cardFields[card.kind ?? 'basic'].label}</small><strong>{card.front}</strong>{expanded === card.id && <small>{card.back}</small>}</span><ChevronRight size={17} className={expanded === card.id ? 'rotated' : ''}/></button>)}</div>
    {cards.length === 0 && <div className="empty-state"><Cloud size={45}/><p>첫 카드를 심어 볼까요?</p></div>}
    <button className="soft-create" onClick={onAdd}><span><Plus size={20}/></span>새로운 기억 카드 만들기 <ArrowRight size={18}/></button>
  </div>;
}
function ReviewPage({ current, theme, progress, total, finished, empty, flipped, flip, rate, restart, onCalendar }: {
  current?: StudyCard; theme?: DeckTheme; progress: number; total: number; finished: boolean; empty: boolean; flipped: boolean;
  flip: () => void; rate: (r: Rating) => void; restart: () => void; onCalendar: () => void;
}) {
  const [choice, setChoice] = useState<string>();
  if (finished) return <div className="page completion"><span className="page-eyebrow">TODAY'S LITTLE ACHIEVEMENT</span><div className="completion-art"><div className="completion-orb"/><span className="float-star one">✦</span><span className="float-star two">✧</span><Mascot/></div><h1>오늘의 기억 산책,<br/><em>참 잘했어요!</em></h1><p>{total}개의 기억을 다정하게 다시 만났어요.<br/>오늘의 작은 노력이 내일의 힘이 될 거예요.</p><div className="completion-reward"><Flower2 size={22}/><span>복습 기록 +{total}</span><Sparkles size={18}/></div><button className="big-primary" onClick={onCalendar}>학습 캘린더 보기 <ArrowRight size={19}/></button><button className="plain-link" onClick={restart}>남은 복습 확인하기</button></div>;
  if (empty || !current) return <div className="page empty-review"><span className="page-eyebrow">ALL CLEAR TODAY ✦</span><div className="completion-art smaller"><Mascot/></div><h1>오늘은 기억들이<br/><em>편히 쉬는 날이에요.</em></h1><p>예정된 복습이 없어요.<br/>새로운 카드를 만들어 기억을 심어보세요.</p><button className="big-primary" onClick={onCalendar}>학습 캘린더 보기 <ArrowRight size={19}/></button></div>;
  return <div className="page review-page"><div className="review-top"><div><span className="page-eyebrow">A MOMENT TO REMEMBER</span><h1>기억 산책 중 ☁️</h1></div><span className="review-index">{progress + 1} <small>/ {total}</small></span></div><div className="progress-track"><div style={{ width: `${((progress + 1) / total) * 100}%` }}/></div><p className="review-instruction">{current.choices ? '보기에서 정답을 골라 보세요.' : '마음속으로 답을 떠올린 뒤 카드를 뒤집어 보세요.'}</p>
    <button className={`flashcard ${theme ?? ''} ${flipped ? 'flipped' : ''}`} onClick={flip} aria-label={flipped ? '질문 다시 보기' : '정답 확인하기'}><span className="flashcard-top"><span>{flipped ? 'THE ANSWER' : cardFields[current.kind ?? 'basic'].label}</span><Star/></span><div className="flashcard-content"><span className="flashcard-emoji">{flipped ? '✦' : '☁'}</span><h2>{flipped ? current.back : current.front}</h2></div><span className="flashcard-bottom">{flipped ? '카드를 눌러 질문 다시 보기' : '카드를 톡 누르면 정답이 보여요'} <RotateCcw size={15}/></span></button>
    {current.choices && <div className="review-options" aria-label="보기">{current.choices.map(option =>
      <button type="button" key={option} disabled={flipped} aria-pressed={choice === option} onClick={() => { setChoice(option); flip(); }}>{option}</button>
    )}</div>}
    {flipped && choice && <p role="status">{choice === current.back ? '정답이에요!' : '선택한 답 · ' + choice}</p>}
    {!flipped ? <button className="big-primary reveal-btn" onClick={flip}>정답 확인하기 <ArrowRight size={19}/></button> : <div className="rating-section"><p>이 기억이 얼마나 선명했나요?</p><div className="rating-grid">{(['again','hard','good','easy'] as Rating[]).map(r => <button className={`rating rating-${r}`} key={r} onClick={() => rate(r)}><span>{ratingLabels[r]}</span><small>{r === 'again' ? '다시 만나기' : r === 'hard' ? '조금 어려워요' : r === 'good' ? '기억했어요' : '또렷해요'}</small></button>)}</div></div>}
    <p className="review-footnote">틀려도 괜찮아요. 기억은 여러 번 만나며 자라니까요. ♡</p></div>;
}
function CalendarCloud({ className }: { className: string }) {
  return <svg className={className} viewBox="0 0 48 34" fill="none" aria-hidden="true">
    <path d="M12 31C6 31 2 27 2 22s4-9 9-10C13 6 17 3 23 3c5 0 9 2 12 7 6 0 11 4 11 10s-5 11-11 11H12Z" fill="currentColor"/>
  </svg>;
}

function CalendarPage({ logs }: { logs: ReviewLog[] }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const currentDay = today();
  const monthLabel = `${year}년 ${monthIndex + 1}월`;
  const counts = new Map<string, number>();
  for (const log of logs) {
    const date = new Date(log.date);
    if (date.getFullYear() !== year || date.getMonth() !== monthIndex) continue;
    const day = localDay(date);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const days = Array.from({ length: new Date(year, monthIndex + 1, 0).getDate() }, (_, index) => index + 1);
  const moveMonth = (offset: number) => setMonth(new Date(year, monthIndex + offset, 1));
  return <div className="page">
    <div className="page-heading"><div><h1>학습 캘린더</h1><p>복습한 날을 한눈에 확인해요.</p></div><CalendarCloud className="calendar-heading-cloud"/></div>
    <section className="monthly-calendar" aria-label="월별 학습 기록">
      <div className="month-heading">
        <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달"><ArrowLeft size={18}/></button>
        <h2 aria-live="polite">{monthLabel}</h2>
        <button type="button" onClick={() => moveMonth(1)} disabled={localDay(month).slice(0, 7) >= currentDay.slice(0, 7)} aria-label="다음 달"><ArrowRight size={18}/></button>
      </div>
      <div className="month-grid">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => <span className="month-weekday" key={day}>{day}</span>)}
        {days.map(day => {
          const date = localDay(new Date(year, monthIndex, day));
          const count = counts.get(date) ?? 0;
          return <div key={day} className="month-day" style={day === 1 ? { gridColumnStart: month.getDay() + 1 } : undefined} aria-current={date === currentDay ? 'date' : undefined}>
            {count > 0 && <CalendarCloud className="month-cloud"/>}
            <time dateTime={date} aria-label={`${monthLabel} ${day}일, ${count ? `복습 ${count}회` : '복습 기록 없음'}`}>{day}</time>
          </div>;
        })}
      </div>
      <div className="month-footer">
        <p className="month-summary" aria-live="polite">{counts.size ? `이 달에 ${counts.size}일 복습했어요.` : '이 달의 복습 기록이 없어요.'}</p>
        <span className="month-legend"><CalendarCloud className="month-legend-cloud"/> 복습한 날</span>
      </div>
    </section>
  </div>;
}
function StatsPage({ logs, cards, back }: { logs: ReviewLog[]; cards: StudyCard[]; back: () => void }) {
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate()-(6-i)); return { d: ['일','월','화','수','목','금','토'][d.getDay()], n: logs.filter(l => localDay(l.date) === localDay(d)).length }; });
  const max = Math.max(...week.map(x=>x.n),1);
  return <div className="page stats-page"><button className="back-link" onClick={back}><ArrowLeft size={19}/> 홈으로</button><span className="page-eyebrow">THE LITTLE THINGS ADD UP</span><h1>차곡차곡 쌓인 기억 ✨</h1><p className="page-subtitle">오늘의 작은 노력도 기록하고 있어요.</p><div className="stat-grid"><div className="stat-block lavender"><span>전체 카드</span><strong>{cards.length}</strong><small>기억의 씨앗</small></div><div className="stat-block peach"><span>전체 복습</span><strong>{logs.length}</strong><small>기억을 만난 횟수</small></div></div><div className="chart-panel"><SectionHeading title="최근 7일 학습량"/><div className="bar-chart">{week.map((x,i)=><div className="bar-col" key={i}><div className="bar-container"><div className="bar" style={{height:`${Math.max(7,(x.n/max)*100)}%`}}/></div><span>{x.d}</span></div>)}</div></div><div className="note-sticker"><Heart size={18}/><span>어제보다 조금 더 기억하고 있는 오늘이에요.</span></div></div>;
}
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => { const cb = (e: KeyboardEvent) => { if(e.key === 'Escape') onClose(); }; window.addEventListener('keydown', cb); return () => window.removeEventListener('keydown', cb); }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target === e.currentTarget) onClose();}}><div className="modal-sheet" role="dialog" aria-modal="true" aria-label={title}><div className="sheet-handle"/><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="닫기"><X size={21}/></button></div>{children}</div></div>;
}
function AccountModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isSignup = mode === 'signup';
  const isReset = mode === 'reset';
  const action = isReset ? '재설정 링크 받기' : isSignup ? '회원가입' : '로그인';

  function changeMode(next: typeof mode) {
    if (mode === next) return;
    setMode(next);
    setShowPassword(false);
    setSubmitted(false);
  }

  return <Modal title={isReset ? '비밀번호 재설정' : '리모리 계정'} onClose={onClose}>
    <div className="account-intro">
      <p><strong>계정 화면 미리보기</strong><br/>입력한 내용은 전송하거나 저장하지 않아요.</p>
      <Mascot className="account-mascot"/>
    </div>
    {isReset ? <p className="account-reset-guide">가입할 때 사용한 이메일을 입력해 주세요.</p> : <div className="entry-modes account-modes" role="group" aria-label="계정 메뉴">
      <button type="button" aria-pressed={!isSignup} onClick={() => changeMode('login')}>로그인</button>
      <button type="button" aria-pressed={isSignup} onClick={() => changeMode('signup')}>회원가입</button>
    </div>}
    <form key={mode} className="sheet-form" onInput={() => setSubmitted(false)} onSubmit={event => {
      event.preventDefault();
      setSubmitted(true);
    }}>
      <label>이메일
        <input type="email" name="email" autoComplete="email" autoCapitalize="none" autoFocus required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"/>
      </label>
      {!isReset && <div className="account-password">
        <label htmlFor="account-password">비밀번호</label>
        <div className="password-control">
          <input
            id="account-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            minLength={isSignup ? 8 : undefined}
            aria-describedby={isSignup ? 'account-password-hint' : undefined}
            required
          />
          <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'} aria-controls="account-password">
            {showPassword ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}
          </button>
        </div>
        {isSignup && <span className="field-hint" id="account-password-hint">비밀번호는 8자 이상 입력해 주세요.</span>}
      </div>}
      <button type="submit" className="big-primary form-submit">{action} <ArrowRight size={18} aria-hidden="true"/></button>
      {submitted && <p className="account-feedback" role="status">{isReset ? '미리보기에서는 재설정 이메일을 보내지 않아요.' : `실제 ${action}은 계정 서버 연결 후 이용할 수 있어요.`}</p>}
    </form>
    {isReset ? <button className="account-help-link" type="button" onClick={() => changeMode('login')}>
      <ArrowLeft size={15} aria-hidden="true"/> 로그인으로 돌아가기
    </button> : mode === 'login' && <button className="account-help-link" type="button" onClick={() => changeMode('reset')}>비밀번호를 잊었나요?</button>}
  </Modal>;
}

const deckKinds = [
  { icon: 'language', label: '외국어', theme: 'peach', card: 'word' },
  { icon: 'code', label: '개발', theme: 'lavender', card: 'basic' },
  { icon: 'history', label: '역사', theme: 'butter', card: 'cloze' },
  { icon: 'book', label: '일반', theme: 'blue', card: 'basic' }
] as const;
const cardFields = {
  basic: { label: '질문과 답', fields: ['질문', '답'] },
  word: { label: '단어와 예문', fields: ['단어', '뜻', '예문'] },
  cloze: { label: '빈칸 채우기', fields: ['문장 (빈칸은 ___로 표시)', '빈칸에 들어갈 말'] },
  choice: { label: '객관식', fields: ['질문', '정답', '오답 1', '오답 2'] }
};
type CardKind = keyof typeof cardFields;
type CardDraft = Pick<StudyCard, 'front' | 'back' | 'kind' | 'choices'>;
const themeLabels = { lavender: '라벤더', peach: '복숭아', butter: '버터 옐로', blue: '하늘색' };

type BulkRow = { line: number; values: string[] };

function readCellText(cell: CellValue | null): string {
  if (cell instanceof Date) return cell.toISOString().replace(/T00:00:00\.000Z$/, '');
  return cell == null ? '' : String(cell).trim();
}

function validateDraft(kind: CardKind, values: string[]): string | undefined {
  if (values.length !== cardFields[kind].fields.length || values.some(value => !value.trim())) {
    return '열 수와 빈 칸을 확인해 주세요.';
  }
  if (kind === 'cloze' && values[0].split('___').length !== 2) return '문장에 ___를 한 번 넣어 주세요.';
  if (kind === 'choice' && new Set(values.slice(1).map(value => value.trim())).size !== 3) {
    return '정답과 오답은 서로 달라야 해요.';
  }
}

function makeDraft(kind: CardKind, values: string[]): CardDraft {
  const [front, back, third, fourth] = values.map(value => value.trim());
  if (kind === 'word') return { kind, front, back: back + '\n\n' + third };
  if (kind === 'cloze') {
    return { kind, front, back: front.replace('___', () => back) };
  }
  if (kind === 'choice') {
    const choices = [back, third, fourth];
    const position = Math.floor(Math.random() * choices.length);
    [choices[0], choices[position]] = [choices[position], choices[0]];
    return { kind, front, back, choices };
  }
  return { kind, front, back };
}

function CreateDeckModal({ onClose, onCreate }: { onClose: () => void; onCreate: (title: string, subtitle: string, theme: DeckTheme, icon: string) => void }) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [kind, setKind] = useState<(typeof deckKinds)[number]>(deckKinds[3]);
  const [theme, setTheme] = useState<DeckTheme>(kind.theme);
  return <Modal title="새로운 공부방 만들기 ✿" onClose={onClose}>
    <form className="sheet-form" onSubmit={e => {
      e.preventDefault();
      if (title.trim()) onCreate(title.trim(), subtitle.trim(), theme, kind.icon);
    }}>
      <label>학습 덱 이름<input autoFocus required maxLength={35} value={title} onChange={e => setTitle(e.target.value)}/></label>
      <label>짧은 소개<input maxLength={70} value={subtitle} onChange={e => setSubtitle(e.target.value)}/></label>
      <SelectField label="덱 유형" value={kind.icon} options={deckKinds.map(item => ({ value: item.icon, label: item.label }))} onChange={icon => {
        const next = deckKinds.find(item => item.icon === icon) ?? deckKinds[3];
        setKind(next);
        setTheme(next.theme);
      }}/>
      <span className="form-label">공부방 색상</span>
      <div className="color-choices">{(Object.keys(themeLabels) as DeckTheme[]).map(color =>
        <button key={color} type="button" aria-label={themeLabels[color]} aria-pressed={theme === color} className={`color-choice ${color} ${theme === color ? 'picked' : ''}`} onClick={() => setTheme(color)}>{theme === color && <Check size={22}/>}</button>
      )}</div>
      <div className={`deck-theme-preview ${theme}`}><DeckIcon icon={kind.icon}/>{title.trim() || kind.label}</div>
      <button className="big-primary form-submit">공부방 만들기 <ArrowRight size={18}/></button>
    </form>
  </Modal>;
}

function CreateCardModal({ decks, defaultDeckId, onClose, onCreate }: { decks: Deck[]; defaultDeckId?: string; onClose: () => void; onCreate: (deckId: string, drafts: CardDraft[]) => void }) {
  const [deckId, setDeckId] = useState(defaultDeckId || decks[0]?.id || '');
  const deck = decks.find(item => item.id === deckId);
  const defaultKind = (item?: Deck) => deckKinds.find(type => type.icon === item?.icon)?.card ?? 'basic';
  const [kind, setKind] = useState<CardKind>(() => defaultKind(deck));
  const [values, setValues] = useState<string[]>([]);
  const [bulk, setBulk] = useState(false);
  const [input, setInput] = useState('');
  const [source, setSource] = useState<'paste' | 'excel'>('paste');
  const [workbook, setWorkbook] = useState<Sheet[]>([]);
  const [sheetName, setSheetName] = useState('');
  const [headerOverride, setHeaderOverride] = useState<boolean | null>(null);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [fileName, setFileName] = useState('');
  const readRequest = useRef(0);
  const [error, setError] = useState('');
  const fields = cardFields[kind].fields;
  const excel = source === 'excel';
  const sheet = workbook.find(item => item.sheet === sheetName);
  const firstRow = sheet?.data[0];
  const hasMatchingHeader = firstRow !== undefined &&
    fields.every((field, index) => readCellText(firstRow[index] ?? null) === field) &&
    firstRow.slice(fields.length).every(cell => !readCellText(cell));
  const skipHeader = headerOverride ?? hasMatchingHeader;
  const excelRows = useMemo(() => {
    const rows: BulkRow[] = [];
    sheet?.data.forEach((cells, index) => {
      if (skipHeader && index === 0) return;
      const values = cells.map(readCellText);
      while (values.length && !values[values.length - 1]) values.pop();
      if (values.length) rows.push({ line: index + 1, values });
    });
    return rows;
  }, [sheet, skipHeader]);
  const rows = excel ? excelRows : input.split(/\r?\n/).flatMap((line, index) =>
    line.trim() ? [{ line: index + 1, values: line.split('\t') }] : []
  );
  const excelRowError = useMemo(() => {
    for (const row of excelRows) {
      const issue = validateDraft(kind, row.values);
      if (issue) return `${row.line}행 · ${issue}`;
    }
    return '';
  }, [excelRows, kind]);
  const preview = values.some(value => value?.trim());

  async function loadWorkbook(file?: File) {
    const request = ++readRequest.current;
    setWorkbook([]);
    setSheetName('');
    setFileError('');
    setFileName(file?.name ?? '');
    setHeaderOverride(null);
    if (!file || !/\.xlsx$/i.test(file.name)) {
      setReading(false);
      if (file) setFileError('.xlsx 형식의 엑셀 파일을 선택해 주세요.');
      return;
    }

    setReading(true);
    try {
      const { default: readXlsxFile } = await import('read-excel-file/browser');
      const sheets = await readXlsxFile(file);
      if (request !== readRequest.current) return;
      setWorkbook(sheets);
      setSheetName(sheets[0]?.sheet ?? '');
      if (!sheets.length) setFileError('파일에 읽을 수 있는 시트가 없어요.');
    } catch {
      if (request === readRequest.current) setFileError('엑셀 파일을 읽지 못했어요. 파일이 열리는지 확인한 뒤 다시 선택해 주세요.');
    } finally {
      if (request === readRequest.current) setReading(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!deck || (bulk && excel && (reading || fileError || excelRowError))) return;
    const entries = bulk ? rows : [{ line: 1, values: fields.map((_, index) => values[index] ?? '') }];
    for (const entry of entries) {
      const issue = validateDraft(kind, entry.values);
      if (issue) {
        setError(bulk ? `${entry.line}번째 줄 · ${issue}` : issue.replace('열 수와 빈 칸', '입력 내용'));
        return;
      }
    }
    if (entries.length) onCreate(deck.id, entries.map(entry => makeDraft(kind, entry.values)));
  };
  return <Modal title="새로운 기억 심기 ✦" onClose={onClose}>
    <form className="sheet-form" onSubmit={submit} onInput={() => setError('')}>
      <SelectField label="학습 덱" value={deckId} options={decks.map(item => ({ value: item.id, label: item.title }))} onChange={id => {
        setDeckId(id);
        setError('');
        if (!preview && !input.trim()) setKind(defaultKind(decks.find(item => item.id === id)));
      }}/>
      <div className="entry-modes">
        <button type="button" aria-pressed={!bulk} onClick={() => { setBulk(false); setError(''); }}>직접 만들기</button>
        <button type="button" aria-pressed={bulk} onClick={() => { setBulk(true); setError(''); }}>일괄 등록</button>
      </div>
      <SelectField
        label="카드 유형"
        value={kind}
        options={(Object.keys(cardFields) as CardKind[]).map(type => ({ value: type, label: cardFields[type].label }))}
        onChange={type => { setKind(type); setError(''); }}
      />
      {bulk ? <div className="bulk-field">
        <div className="entry-modes bulk-sources" role="group" aria-label="가져오기 방식">
          <button type="button" aria-pressed={!excel} onClick={() => { setSource('paste'); setError(''); }}>붙여넣기</button>
          <button type="button" aria-pressed={excel} onClick={() => { setSource('excel'); setError(''); }}>엑셀 파일</button>
        </div>
        {excel ? <>
          <div className="workbook-template">
            <a href={`./templates/${kind}.xlsx`} download={`리모리-${cardFields[kind].label}-양식.xlsx`}>
              <Download size={16} aria-hidden="true"/> {cardFields[kind].label} 양식 다운로드
            </a>
            <span className="field-hint">첫 행의 열 제목은 그대로 두고, 아래 예시를 내 카드로 바꿔 주세요.</span>
          </div>
          <label htmlFor="bulk-workbook">엑셀 파일 선택</label>
          <div id="bulk-workbook-hint" className="field-hint">
            <span>.xlsx 파일의 첫 번째 열부터 카드 내용을 입력해 주세요.</span>
            <span><strong>열 순서</strong> {fields.join(' → ')}</span>
          </div>
          <div className="workbook-picker">
            <input
              id="bulk-workbook"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              aria-describedby="bulk-workbook-hint workbook-name"
              onClick={e => { e.currentTarget.value = ''; }}
              onChange={e => { if (e.target.files?.[0]) void loadWorkbook(e.target.files[0]); }}
            />
            <span className="workbook-picker-action" aria-hidden="true">{fileName ? '파일 변경' : '파일 찾아보기'}</span>
            <span id="workbook-name" className="workbook-name">{fileName || '선택한 파일 없음'}</span>
          </div>
          {workbook.length > 1 && <SelectField
            label="가져올 시트"
            value={sheetName}
            options={workbook.map(item => ({ value: item.sheet, label: item.sheet }))}
            onChange={name => { setSheetName(name); setHeaderOverride(null); }}
          />}
          {sheet && <label className="workbook-header">
            <input type="checkbox" checked={skipHeader} onChange={e => setHeaderOverride(e.target.checked)}/>
            첫 행은 열 제목이에요
          </label>}
          {(fileError || excelRowError) && <p className="form-error workbook-feedback" role="alert">{fileError || excelRowError}</p>}
          <div className="field-hint" role="status">
            {reading ? '엑셀 파일을 읽는 중이에요.' : sheet && !excelRowError && (excelRows.length ? `등록할 카드 ${excelRows.length}장` : '이 시트에서 가져올 행이 없어요.')}
          </div>
        </> : <>
          <label htmlFor="bulk-cards">스프레드시트에서 붙여넣기</label>
          <div id="bulk-cards-hint" className="field-hint">
            <span>제목 행을 빼고 복사해 주세요. 한 줄에 카드 한 장, 열 사이는 탭으로 구분해요.</span>
            <span><strong>열 순서</strong> {fields.join(' → ')}</span>
          </div>
          <textarea id="bulk-cards" aria-describedby="bulk-cards-hint" required rows={5} value={input} onChange={e => setInput(e.target.value)}/>
        </>}
      </div> : fields.map((field, index) => <label key={field}>{field}
        <textarea required rows={index === 0 ? 2 : 1} value={values[index] ?? ''} onChange={e => {
          const next = [...values];
          next[index] = e.target.value;
          setValues(next);
        }}/>
      </label>)}
      {!bulk && preview && <div className={`mini-preview ${deck?.theme ?? ''}`}>
        <small>미리보기 · {cardFields[kind].label}</small><strong>{values[0]}</strong>
        {kind === 'choice' && <p>{values.slice(1, 4).filter(Boolean).join(' · ')}</p>}
        <p>{kind === 'cloze' ? values[0]?.replace('___', () => values[1] || '___') : values[1]}</p>
        {kind === 'word' && <p>{values[2]}</p>}
      </div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="big-primary form-submit" disabled={!deck || (bulk && (!rows.length || (excel && Boolean(reading || fileError || excelRowError))))}>{bulk ? `${excel && excelRowError ? 0 : rows.length}장 등록하기` : '기억 카드 저장하기'} <ArrowRight size={18}/></button>
    </form>
  </Modal>;
}

export default function App() {
  const [theme, setTheme] = useStoredState<'light' | 'dark'>('remory-theme', 'light');
  const dark = theme === 'dark';
  const [page, setPage] = useState<Page>('home');
  const [decks, setDecks] = useStoredState<Deck[]>('recall-decks-v1', initialDecks);
  const [cards, setCards] = useStoredState<StudyCard[]>('recall-cards-v1', initialCards);
  const [logs, setLogs] = useStoredState<ReviewLog[]>('recall-logs-v1', []);
  const [openDeckId, setOpenDeckId] = useState('english');
  const [modal, setModal] = useState<'deck' | 'card' | 'account' | null>(null);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const closeAccount = () => {
    setModal(null);
    accountTrigger.current?.focus();
  };
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [notice,setNotice] = useState('');
  const studyLogs = useMemo(() => logs.filter(log => log.cardId !== 'seed' || !log.id.startsWith('seed-')), [logs]);
  const todayReviews = studyLogs.filter(l => localDay(l.date) === today()).length;
  const selectedDeck = decks.find(d=>d.id===openDeckId) || decks[0];
  const selectedCards = cards.filter(c=>c.deckId===selectedDeck?.id);
  const current = useMemo(()=>cards.find(c=>c.id===queue[index]),[cards,queue,index]);
  const startReview = (deckId?: string) => {
    const due = cards.filter(c => isDue(c) && (!deckId || c.deckId === deckId));
    setQueue(due.map(c=>c.id)); setIndex(0); setFinished(false); setFlipped(false); setPage('review');
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const navigate = (next: Page) => { if(next==='review') startReview(); else { setPage(next); window.scrollTo({top:0,behavior:'smooth'}); } };
  const openDeck = (id:string) => { setOpenDeckId(id); navigate('deck-detail'); };
  const rate = (rating: Rating) => {
    if(!current) return;
    // Deliberately a UI demo schedule, NOT the FSRS algorithm. Wire to Spring Boot later.
    const delayMs: Record<Rating,number> = {again:10*60_000,hard:86_400_000,good:3*86_400_000,easy:7*86_400_000};
    setCards(prev=>prev.map(c=>c.id===current.id?{...c,dueAt:new Date(Date.now()+delayMs[rating]).toISOString(),repetitions:c.repetitions+1}:c));
    setLogs(prev=>[...prev,{id:uid(),cardId:current.id,rating,date:new Date().toISOString()}]);
    setFlipped(false);
    if(index+1>=queue.length) setFinished(true); else setIndex(v=>v+1);
  };
  const addDeck = (title:string,subtitle:string,theme:DeckTheme,icon:string) => {
    const id=uid(); setDecks(prev=>[...prev,{id,title,subtitle:subtitle||'작은 기억을 차곡차곡',theme,icon}]);
    setModal(null); setOpenDeckId(id); setPage('deck-detail'); setNotice('새로운 공부방이 생겼어요 ✦');
  };
  const addCards = (deckId: string, drafts: CardDraft[]) => {
    const dueAt = new Date().toISOString();
    const newCards = drafts.map(draft => ({ ...draft, id: uid(), deckId, dueAt, repetitions: 0 }));
    setCards(prev => [...prev, ...newCards]);
    setModal(null);
    setOpenDeckId(deckId);
    setPage('deck-detail');
    setNotice(`기억 카드 ${drafts.length}장을 심었어요 ♡`);
  };
  useEffect(()=>{if(!notice) return; const timer=window.setTimeout(()=>setNotice(''),2800); return()=>window.clearTimeout(timer);},[notice]);
  return <div className="site-background" data-theme={theme}><div className="desktop-decoration"><div className="desktop-cloud">☁</div><div className="desktop-copy"><span>YOUR LITTLE MEMORY GARDEN</span><h2>작은 기억이<br/><em>꽃이 되는 곳.</em></h2><p>그날의 배움이 잊히지 않도록,<br/>오늘도 다정하게 다시 만나봐요.</p><div className="desktop-stars">✳ &nbsp; ✧ &nbsp; ✳</div></div></div>
    <main className="phone-shell"><AppHeader onStats={()=>navigate('stats')} reviewsToday={todayReviews} onAccount={trigger => { accountTrigger.current = trigger; setModal('account'); }} dark={dark} toggleTheme={() => setTheme(dark ? 'light' : 'dark')}/><div className="app-scroll" key={page}>
      {page==='home'&&<HomePage decks={decks} cards={cards} logs={studyLogs} openDeck={openDeck} go={navigate} startReview={startReview}/>}
      {page==='decks'&&<DecksPage decks={decks} cards={cards} onOpen={openDeck} onCreate={()=>setModal('deck')}/>}
      {page==='deck-detail'&&selectedDeck&&<DeckDetailPage deck={selectedDeck} cards={selectedCards} back={()=>navigate('decks')} onAdd={()=>setModal('card')} onStudy={()=>startReview(selectedDeck.id)}/>}
      {page==='review'&&<ReviewPage key={current?.id} current={current} theme={decks.find(deck => deck.id === current?.deckId)?.theme} progress={index} total={queue.length} finished={finished} empty={queue.length===0} flipped={flipped} flip={()=>setFlipped(v=>!v)} rate={rate} restart={()=>startReview()} onCalendar={()=>navigate('garden')}/>}
      {page==='garden'&&<CalendarPage logs={studyLogs}/>}
      {page==='stats'&&<StatsPage cards={cards} logs={studyLogs} back={()=>navigate('home')}/>}
    </div><BottomNav page={page} onNavigate={navigate}/></main>
    <div className="desktop-footer">REMORY <span>✦</span> DREAMY PASTEL EXPERIENCE · FRONTEND PROTOTYPE</div>
    {page !== 'garden' && <button className="floating-add" onClick={()=>setModal('card')} aria-label="새 카드 추가"><Plus size={23}/></button>}
    {modal==='account'&&<AccountModal onClose={closeAccount}/>}
    {modal==='deck'&&<CreateDeckModal onClose={()=>setModal(null)} onCreate={addDeck}/>}
    {modal==='card'&&<CreateCardModal decks={decks} defaultDeckId={page==='deck-detail'?openDeckId:undefined} onClose={()=>setModal(null)} onCreate={addCards}/>}
    {notice&&<div className="toast" role="status"><Sparkles size={17}/>{notice}</div>}
  </div>;
}
