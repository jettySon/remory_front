// Public policy metadata only. Never copy SMTP credentials or private .env values here.
export type PrivacyConfig = {
  operatorName: string | null;
  contactEmail: string | null;
  serverCountry: string | null;
  effectiveDate: string | null;
  updatedAt: string;
};

export const privacyConfig: PrivacyConfig = {
  operatorName: null,
  contactEmail: null,
  serverCountry: 'KR', // 한국 내 직접 운영 서버로 배포할 예정
  effectiveDate: null,
  updatedAt: '2026-11-19',
};

export function isPrivacyDraft(config: PrivacyConfig) {
  return !config.operatorName?.trim() || !config.contactEmail?.trim()
    || !config.serverCountry?.trim() || !config.effectiveDate;
}
