import { Search, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider';
import type { CardFilters } from '../study/cardFilters';
import { emptyCardFilters } from '../study/cardFilters';
import { cardFields } from '../study/cards';
import type { CardKind } from '../types';
import SelectField from './SelectField';

export function CardSearchFilters({ filters, onChange }: {
  filters: CardFilters;
  onChange: (filters: CardFilters) => void;
}) {
  const { t } = useLanguage();
  const active = filters.search !== '' || filters.kind !== 'all' || filters.status !== 'all';
  return <div className="card-search-controls">
    <div className="search-field card-search-field" role="search" aria-label={t('cards.search')}>
      <Search size={18} aria-hidden="true" />
      <input type="search" aria-label={t('cards.search')} placeholder={t('cards.searchHint')}
        value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} />
      {filters.search && <button type="button" aria-label={t('cards.clearSearch')}
        onClick={() => onChange({ ...filters, search: '' })}><X size={17} aria-hidden="true" /></button>}
    </div>
    <div className="card-filter-row">
      <SelectField<CardFilters['kind']> label={t('cards.type')} value={filters.kind}
        options={[
          { value: 'all', label: t('cards.allTypes') },
          ...(Object.keys(cardFields) as CardKind[]).map((kind) => ({ value: kind, label: t(cardFields[kind].label) })),
        ]}
        onChange={(kind) => onChange({ ...filters, kind })} />
      <SelectField<CardFilters['status']> label={t('cards.status')} value={filters.status}
        options={[
          { value: 'all', label: t('cards.allStatuses') },
          { value: 'due', label: t('cards.due') },
          { value: 'upcoming', label: t('cards.upcoming') },
          { value: 'missed', label: t('cards.frequentlyMissed') },
        ]}
        onChange={(status) => onChange({ ...filters, status })} />
    </div>
    {active && <div className="card-filter-meta">
      {filters.status === 'missed' && <small>{t('cards.missedHint')}</small>}
      <button className="plain-link" type="button" onClick={() => onChange({ ...emptyCardFilters })}>{t('cards.resetFilters')}</button>
    </div>}
  </div>;
}
