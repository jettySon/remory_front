import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountModal } from '../src/components/dialogs/AccountModal';
import { LanguageProvider } from '../src/i18n/LanguageProvider';
import { ApiError } from '../src/api/request';

vi.mock('../src/components/GoogleSignInButton', () => ({
  GoogleSignInButton: ({ onCredential, disabled }: { onCredential: (proof: unknown) => Promise<void>; disabled: boolean }) => (
    <button type="button" disabled={disabled} onClick={() => void onCredential({ credential: 'fixture', nonce: 'fixture' })}>Google test login</button>
  ),
}));
let root: Root;
let node: HTMLDivElement;
const emailLogin = vi.fn();
const googleLogin = vi.fn();
async function render(guestPending = true, key = 'initial') {
  await act(async () => root.render(<LanguageProvider><AccountModal key={key} guestPending={guestPending}
    onAuthenticate={emailLogin} onGoogleAuthenticate={googleLogin} onClose={vi.fn()} onLogout={vi.fn()} /></LanguageProvider>));
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear(); sessionStorage.clear();
  emailLogin.mockReset().mockResolvedValue(undefined); googleLogin.mockReset().mockResolvedValue(undefined);
  node = document.createElement('div'); document.body.append(node); root = createRoot(node);
});
afterEach(async () => { await act(async () => root.unmount()); node.remove(); });
async function click(element: Element | undefined | null) {
  expect(element).toBeTruthy(); await act(async () => (element as HTMLElement).click());
}
async function fill(name: string, value: string) {
  const input = node.querySelector(`input[name="${name}"]`) as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit() {
  await act(async () => node.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}

describe('guest import selection in authentication UI', () => {
  it('defaults to keeping records and passes that choice to email login', async () => {
    await render();
    expect((node.querySelector('input[value="keep"]') as HTMLInputElement).checked).toBe(true);
    expect(document.activeElement).toBe(node.querySelector('input[value="keep"]'));
    expect(node.textContent).toContain('로그아웃하면 다시 사용할 수 있어요');
    await fill('email', 'person@example.com'); await fill('password', 'dummy-password'); await submit();
    expect(emailLogin).toHaveBeenCalledWith('login', 'person@example.com', 'dummy-password', 'keep');
  });

  it('keeps the chosen option when switching to signup and resets it when reopening', async () => {
    await render(); await click(node.querySelector('input[value="import"]'));
    await click([...node.querySelectorAll('button')].find((button) => button.textContent === '회원가입'));
    await fill('email', 'person@example.com'); await fill('password', 'dummy-password'); await submit();
    expect(emailLogin).toHaveBeenCalledWith('signup', 'person@example.com', 'dummy-password', 'import');
    await render(true, 'reopened');
    expect((node.querySelector('input[value="keep"]') as HTMLInputElement).checked).toBe(true);
  });

  it('passes the selected option through Google authentication and existing-account linking', async () => {
    googleLogin.mockRejectedValueOnce(new ApiError(409, '', 'GOOGLE_LINK_REQUIRED')).mockResolvedValue(undefined);
    await render(); await click(node.querySelector('input[value="import"]'));
    await click([...node.querySelectorAll('button')].find((button) => button.textContent === 'Google test login'));
    expect(googleLogin).toHaveBeenNthCalledWith(1, { credential: 'fixture', nonce: 'fixture' }, undefined, 'import');
    await fill('password', 'dummy-password'); await submit();
    expect(googleLogin).toHaveBeenNthCalledWith(2, { credential: 'fixture', nonce: 'fixture' }, 'dummy-password', 'import');
  });

  it('hides the selection when there are no guest records', async () => {
    await render(false);
    expect(node.querySelector('.guest-import-options')).toBeNull();
  });
});
