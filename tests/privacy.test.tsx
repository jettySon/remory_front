import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../src/i18n/LanguageProvider';
import { PrivacyPage } from '../src/privacy/PrivacyPage';
import { PrivacyDocument } from '../src/privacy/PrivacyDocument';
import { privacyCopies } from '../src/privacy/content';
import { privacyConfig, isPrivacyDraft } from '../src/privacy/config';
import { SettingsModal } from '../src/components/dialogs/SettingsModal';
import { AccountModal } from '../src/components/dialogs/AccountModal';

vi.mock('../src/components/GoogleSignInButton', () => ({ GoogleSignInButton: () => null }));

let root: Root;
let node: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('The public privacy page must not contact authentication or analytics services.'); }));
  localStorage.clear(); sessionStorage.clear();
  node = document.createElement('div'); document.body.append(node); root = createRoot(node);
});
afterEach(async () => { await act(async () => root.unmount()); node.remove(); });

describe('public privacy policy', () => {
  it.each([
    ['ko', '호주'], ['en', 'Australia'], ['ja', 'オーストラリア'], ['zh-CN', '澳大利亚'],
  ] as const)('opens in %s without logging in or loading external services', async (locale, destination) => {
    localStorage.setItem('remory-locale', JSON.stringify(locale));
    await act(async () => root.render(<LanguageProvider title="privacy.title"><PrivacyPage /></LanguageProvider>));
    expect(node.querySelector('h1')?.textContent).toBe(privacyCopies[locale].title);
    expect(document.title).toBe(privacyCopies[locale].title);
    expect(fetch).not.toHaveBeenCalled();
    const countryFields = [...node.querySelectorAll('dd')].filter((field) => field.textContent === destination);
    expect(countryFields).toHaveLength(1);
    expect(countryFields[0]?.closest('section')?.id).toBe('privacy-overseas');
    expect(node.textContent).not.toMatch(/시드니|Sydney|シドニー|悉尼|ap-southeast-2/);
    expect(node.querySelector('iframe, script')).toBeNull();
    expect(node.querySelector('a[href="/account-deletion/"]')).not.toBeNull();
    const sections = [...node.querySelectorAll('.privacy-section')];
    expect(sections).toHaveLength(privacyCopies.ko.sections.length);
    for (const link of node.querySelectorAll('.privacy-contents a')) {
      const id = link.getAttribute('href')!.slice(1);
      expect(node.querySelector(`[id="${id}"]`)).not.toBeNull();
    }
  });

  it('retains local guest/account metadata and the saved dark theme while reading', async () => {
    const guest = JSON.stringify({ changed: true, data: { decks: [{ id: 'private-guest' }], cards: [], logs: [] } });
    const hint = JSON.stringify({ id: 'private-account', email: 'person@example.com' });
    localStorage.setItem('remory-guest-v2', guest);
    localStorage.setItem('remory-account-hint', hint);
    localStorage.setItem('remory-theme', '"dark"');
    await act(async () => root.render(<LanguageProvider><PrivacyPage /></LanguageProvider>));
    expect(localStorage.getItem('remory-guest-v2')).toBe(guest);
    expect(localStorage.getItem('remory-account-hint')).toBe(hint);
    expect(node.querySelector('[data-theme="dark"]')).not.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('renders the finalized date, hosting and contact information in the public HTML', () => {
    const html = renderToStaticMarkup(<PrivacyDocument copy={privacyCopies.ko} config={privacyConfig} />);
    expect(isPrivacyDraft(privacyConfig)).toBe(false);
    expect(html).toContain('<dt>이전 국가</dt><dd>호주</dd>');
    expect(html).toContain('AWS Lightsail');
    expect(html).toContain('<dt>시행일</dt><dd><time dateTime="2026-11-27">2026-11-27</time>');
    expect(html).toContain('<dt>개인정보 문의 담당</dt><dd>리모리 CS 팀</dd>');
    expect(html).toContain('href="mailto:remory.mong%40gmail.com">remory.mong@gmail.com</a>');
    expect(html).not.toContain('운영 정보 확인 중인 초안');
    expect(html).toContain('비회원 기록과 엑셀 파일');
    expect(html).toContain('400일');
    expect(html).toContain('현재 운영 서비스에서는 비밀번호 재설정 인증 메일을 발송하지 않습니다.');
    expect(html).toContain('/account-deletion/');
    expect(html).not.toContain('mailto:null');
    expect(html).not.toContain('<script');
  });

  it('labels a policy without required publication details as a draft', () => {
    const config = { ...privacyConfig, contactEmail: null };
    const html = renderToStaticMarkup(<PrivacyDocument copy={privacyCopies.ko} config={config} />);
    expect(isPrivacyDraft(config)).toBe(true);
    expect(html).toContain(privacyCopies.ko.draftTitle);
    expect(html).not.toContain('mailto:');
  });

  it('makes the same public URL available before login and from guest settings', async () => {
    await act(async () => root.render(<LanguageProvider><SettingsModal dark={false} onToggleDark={vi.fn()} onClose={vi.fn()} /></LanguageProvider>));
    expect(node.querySelector('a[href="/privacy/"]')?.textContent).toBe('개인정보 처리방침');
    await act(async () => root.render(<LanguageProvider><AccountModal guestPending={false} onClose={vi.fn()}
      onAuthenticate={async () => {}} onGoogleAuthenticate={async () => {}} onLogout={async () => {}} /></LanguageProvider>));
    expect(node.querySelector('a[href="/privacy/"]')?.textContent).toBe('개인정보 처리방침');
  });
});
