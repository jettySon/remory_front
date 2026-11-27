// Public policy metadata only. Never copy SMTP credentials or private .env values here.
export type PrivacyConfig = {
  contactTeamName: string | null;
  contactEmail: string | null;
  effectiveDate: string | null;
  updatedAt: string;
};

export const privacyConfig: PrivacyConfig = {
  contactTeamName: '리모리 CS 팀',
  contactEmail: 'remory.mong@gmail.com',
  effectiveDate: '2026-11-27',
  updatedAt: '2026-11-27',
};

export function isPrivacyDraft(config: PrivacyConfig) {
  return !config.contactTeamName?.trim() || !config.contactEmail?.trim()
    || !config.effectiveDate;
}
