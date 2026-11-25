import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider';
import { isAndroidApp, openReviewNotificationSettings, readReviewReminder, saveReviewReminder,
  type ReviewReminderSettings } from '../platform/android';

export function ReviewReminderField() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<ReviewReminderSettings>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const pendingSave = useRef(false);

  useEffect(() => {
    if (!isAndroidApp()) return;
    const controller = new AbortController();
    function refresh() {
      if (document.visibilityState === 'hidden' || pendingSave.current) return;
      void readReviewReminder(controller.signal).then((next) => {
        if (!controller.signal.aborted && !pendingSave.current) {
          setSettings(next);
          setError(false);
          if (next.allowed) setPermissionBlocked(false);
        }
      }).catch(() => {
        if (!controller.signal.aborted && !pendingSave.current) setError(true);
      });
    }
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort();
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  async function save(enabled: boolean, time: string) {
    if (pendingSave.current || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return;
    pendingSave.current = true;
    setSaving(true);
    setError(false);
    try {
      const next = await saveReviewReminder(enabled, time);
      setSettings(next);
      setPermissionBlocked(enabled && !next.allowed);
    } catch {
      setError(true);
    } finally {
      pendingSave.current = false;
      setSaving(false);
    }
  }

  if (!isAndroidApp()) return null;
  const blocked = permissionBlocked || Boolean(settings?.enabled && !settings.allowed);
  return (
    <div className="settings-option reminder-setting">
      <button className="reminder-toggle" type="button" role="switch" aria-checked={settings?.enabled ?? false}
        disabled={!settings || saving} onClick={() => settings && void save(!settings.enabled, settings.time)}>
        <span className="settings-option-icon" aria-hidden="true"><Bell size={19} /></span>
        <span className="settings-option-label">{t('settings.reminder')}</span>
        <span className="settings-switch" aria-hidden="true" />
      </button>
      {settings?.enabled && (
        <label className="reminder-time">
          {t('settings.reminderTime')}
          <input type="time" value={settings.time} disabled={saving || !settings.allowed}
            onChange={(event) => void save(true, event.currentTarget.value)} />
        </label>
      )}
      {blocked ? (
        <div className="reminder-hint" role="status">
          <span>{t('settings.reminderBlocked')}</span>
          <button type="button" onClick={openReviewNotificationSettings}>{t('settings.reminderSystem')}</button>
        </div>
      ) : <p className="reminder-hint">{t('settings.reminderHint')}</p>}
      {error && <p className="reminder-hint" role="alert">{t('settings.reminderError')}</p>}
    </div>
  );
}
