import {
  BookHeart,
  CalendarDays,
  ChevronRight,
  Cloud,
  Flower2,
  Home,
  LibraryBig,
  Settings,
  UserRound,
} from 'lucide-react';
import type { Page } from '../types';

export function AppHeader({
  onStats,
  reviewsToday,
  onSettings,
  onAccount,
  signedIn,
}: {
  onStats: () => void;
  reviewsToday: number;
  onSettings: (trigger: HTMLButtonElement) => void;
  signedIn: boolean;
  onAccount: (trigger: HTMLButtonElement) => void;
}) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-cloud">
          <Cloud size={21} strokeWidth={2.2} />
        </span>
        <span>
          remory<span className="brand-dot">.</span>
        </span>
      </div>
      <div className="header-actions">
        <button
          className="settings-trigger"
          type="button"
          aria-label="설정"
          aria-haspopup="dialog"
          onClick={(e) => onSettings(e.currentTarget)}
        >
          <Settings size={17} aria-hidden="true" />
        </button>
        <button className="header-streak" onClick={onStats} aria-label="학습 통계 보기">
          <Flower2 size={15} />
          <span>{reviewsToday ? `오늘 ${reviewsToday}장 복습` : '학습 통계'}</span>
          <ChevronRight size={14} />
        </button>
        <button
          className="account-trigger"
          type="button"
          aria-haspopup="dialog"
          onClick={(e) => onAccount(e.currentTarget)}
        >
          <UserRound size={16} aria-hidden="true" />
          {signedIn ? '내 계정' : '로그인'}
        </button>
      </div>
    </header>
  );
}
export function BottomNav({ page, onNavigate }: { page: Page; onNavigate: (next: Page) => void }) {
  const tabs = [
    { id: 'home' as Page, label: '홈', icon: Home },
    { id: 'decks' as Page, label: '학습 덱', icon: LibraryBig },
    { id: 'review' as Page, label: '복습', icon: BookHeart },
    { id: 'calendar' as Page, label: '학습 기록', icon: CalendarDays },
  ];
  return (
    <nav className="bottom-nav" aria-label="주요 화면">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className={`nav-item ${page === id || (page === 'deck-detail' && id === 'decks') ? 'selected' : ''}`}
          aria-current={page === id ? 'page' : undefined}
        >
          <span className="nav-icon">
            <Icon size={21} strokeWidth={1.8} />
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
