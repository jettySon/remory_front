import { request, ApiError } from './request';
import type { Locale, MessageKey } from '../i18n/messages';

export type ResetChallenge = { challengeId: string; expiresAt: string; resendAt: string };
export type ResetVerification = { resetToken: string; expiresAt: string };

export const requestPasswordReset = async (email: string, locale: Locale) => {
  const result = await request<ResetChallenge>('/auth/password-reset/request', 'POST', undefined, { email: email.trim(), locale });
  // An older server can accept a request without returning a code challenge.
  if (!result?.challengeId || !Number.isFinite(Date.parse(result.expiresAt)) || !Number.isFinite(Date.parse(result.resendAt))) {
    throw new ApiError(503, '');
  }
  return result;
};

export const verifyPasswordResetCode = (challengeId: string, code: string) =>
  request<ResetVerification>('/auth/password-reset/verify', 'POST', undefined, { challengeId, code });

export const confirmPasswordReset = (token: string, password: string) =>
  request<void>('/auth/password-reset/confirm', 'POST', undefined, { token, password });

export function passwordResetError(error: unknown): MessageKey {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'RESET_CODE_INVALID': return 'reset.codeInvalid';
      case 'RESET_CODE_EXPIRED': return 'reset.codeExpired';
      case 'RESET_CODE_LOCKED': return 'reset.codeLocked';
      case 'RESET_VERIFICATION_EXPIRED': return 'reset.verificationExpired';
      case 'RESET_PASSWORD_FORMAT': return 'reset.passwordFormat';
      case 'RESET_MAIL_UNAVAILABLE': return 'reset.unavailable';
      case 'RESET_RATE_LIMITED': return 'reset.rateLimited';
    }
    if (error.status === 400) return 'errors.accountFormat';
    if (error.status === 429) return 'reset.rateLimited';
  }
  return 'errors.accountServer';
}
