import { useLanguage } from '../i18n/LanguageProvider';
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
  const { t } = useLanguage();
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
          aria-label={t('settings.title')}
          aria-haspopup="dialog"
          onClick={(e) => onSettings(e.currentTarget)}
        >
          <Settings size={17} aria-hidden="true" />
        </button>
        <button className="header-streak" onClick={onStats} aria-label={t('stats.open')}>
          <Flower2 size={15} />
          <span>{reviewsToday ? t('home.headerReviews', { count: reviewsToday }) : t('stats.title')}</span>
          <ChevronRight size={14} />
        </button>
        <button
          className="account-trigger"
          type="button"
          aria-haspopup="dialog"
          onClick={(e) => onAccount(e.currentTarget)}
        >
          <UserRound size={16} aria-hidden="true" />
          {signedIn ? t('account.mine') : t('account.login')}
        </button>
      </div>
    </header>
  );
}
export function BottomNav({ page, onNavigate }: { page: Page; onNavigate: (next: Page) => void }) {
  const { t } = useLanguage();
  const tabs = [
    { id: 'home' as Page, label: t('nav.home'), icon: Home },
    { id: 'decks' as Page, label: t('nav.decks'), icon: LibraryBig },
    { id: 'review' as Page, label: t('nav.review'), icon: BookHeart },
    { id: 'calendar' as Page, label: t('nav.calendar'), icon: CalendarDays },
  ];
  return (
    <nav className="bottom-nav" aria-label={t('nav.main')}>
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
