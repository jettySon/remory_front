import { BarChart3, ChevronRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider';

export function StatsShortcut({ onOpen, description }: { onOpen: () => void; description?: string }) {
  const { t } = useLanguage();
  return (
    <button className="stat-shortcut" type="button" onClick={onOpen}>
      <span className="stat-icon">
        <BarChart3 size={21} aria-hidden="true" />
      </span>
      <span>
        <strong>{t('stats.title')}</strong>
        {description && <small>{description}</small>}
      </span>
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  );
}
