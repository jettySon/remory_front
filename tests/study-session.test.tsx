import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../src/i18n/LanguageProvider';
import { useStudyData } from '../src/hooks/useStudyData';
import { rememberSession, readSession, refreshSession } from '../src/api/session';
import { readGuestStudy, writeGuestStudy } from '../src/study/guestData';
import type { Session } from '../src/api/account';
import type { Deck } from '../src/types';

const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const session=(token='a',id='account-a'):Session=>({account:{id,email:`${id}@example.com`,hasPassword:true,googleLinked:false},accessToken:token.repeat(43),expiresAt:new Date(Date.now()+900_000).toISOString()});
const deck=(id='deck-a'):Deck=>({id,title:id,subtitle:'',theme:'blue',icon:'book'});
let root:Root;
let node:HTMLDivElement;
let state:ReturnType<typeof useStudyData>;
let token='a';
function Probe() { state=useStudyData(); return null; }
async function render(children:ReactNode=<Probe />) {
  await act(async()=>{ root.render(<LanguageProvider>{children}</LanguageProvider>); });
}
beforeEach(()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  vi.stubGlobal('BroadcastChannel',undefined);
  vi.stubGlobal('navigator',{locks:undefined});
  rememberSession(null);
  localStorage.clear();sessionStorage.clear();token='a';
  vi.stubGlobal('fetch',vi.fn(async path=>{
    if(String(path).endsWith('/auth/refresh')) return json(session(token));
    if(String(path).endsWith('/auth/me')) return json(session(token).account);
    if(String(path).endsWith('/study')) return json({decks:[deck()],cards:[]});
    if(String(path).endsWith('/auth/logout')) return new Response(null,{status:204});
    throw new Error('Unexpected test API');
  }));
  node=document.createElement('div');document.body.append(node);root=createRoot(node);
});
afterEach(async()=>{await act(async()=>root.unmount());rememberSession(null);node.remove();});

describe('study data with persistent sessions',()=>{
  it('restores account and library after startup without importing guest data',async()=>{
    await render();
    expect(state.restoring).toBe(false);
    expect(state.account?.id).toBe('account-a');
    expect(state.decks.map(value=>value.id)).toEqual(['deck-a']);
    expect(vi.mocked(fetch).mock.calls.filter(call=>String(call[0]).endsWith('/study/import'))).toHaveLength(0);
  });

  it('updates the access session after refresh while preserving the loaded library',async()=>{
    await render();
    const previous=state.decks;
    token='b';
    await act(async()=>{await refreshSession();});
    expect(state.token).toBe('b'.repeat(43));
    expect(state.decks).toBe(previous);
    expect(state.account?.id).toBe('account-a');
  });

  it('logout stays in guest mode instead of silently restoring the account',async()=>{
    await render();
    const refreshCount=vi.mocked(fetch).mock.calls.filter(call=>String(call[0]).endsWith('/auth/refresh')).length;
    await act(async()=>{await state.disconnect();});
    expect(state.account).toBeUndefined();
    expect(readSession()).toBeNull();
    expect(state.restoring).toBe(false);
    expect(vi.mocked(fetch).mock.calls.filter(call=>String(call[0]).endsWith('/auth/refresh'))).toHaveLength(refreshCount);
  });

  it('imports guest records only when selected and clears them after server confirmation',async()=>{
    const guestDeck=deck('guest-deck');
    writeGuestStudy({changed:true,data:{decks:[guestDeck],cards:[],logs:[]}});
    vi.mocked(fetch).mockImplementation(async path=>{
      if(String(path).endsWith('/auth/refresh')) return json({code:'SESSION_EXPIRED'},401);
      if(String(path).endsWith('/auth/login')) return json(session());
      if(String(path).endsWith('/study/import')) return new Response(null,{status:204});
      if(String(path).endsWith('/study')) return json({decks:[guestDeck],cards:[]});
      throw new Error('Unexpected test API');
    });
    await render();
    expect(state.account).toBeUndefined();
    let imported=false;
    await act(async()=>{imported=await state.connect('login','account-a@example.com','dummy-password','import');});
    expect(imported).toBe(true);
    expect(state.account?.id).toBe('account-a');
    expect(state.decks[0].id).toBe('guest-deck');
    expect(readGuestStudy().changed).toBe(false);
    expect(readGuestStudy().data.decks).toHaveLength(0);
  });

  it('preserves guest records and revokes the new session if import fails',async()=>{
    writeGuestStudy({changed:true,data:{decks:[deck('guest-deck')],cards:[],logs:[]}});
    vi.mocked(fetch).mockImplementation(async path=>{
      if(String(path).endsWith('/auth/refresh')) return json({code:'SESSION_EXPIRED'},401);
      if(String(path).endsWith('/auth/login')) return json(session());
      if(String(path).endsWith('/study/import')) return json({},500);
      if(String(path).endsWith('/auth/logout')) return new Response(null,{status:204});
      throw new Error('Unexpected test API');
    });
    await render();
    await act(async()=>{await expect(state.connect('login','account-a@example.com','dummy-password','import')).rejects.toThrow();});
    expect(readGuestStudy().changed).toBe(true);
    expect(readGuestStudy().data.decks[0].id).toBe('guest-deck');
    expect(state.account).toBeUndefined();
    expect(readSession()).toBeNull();
  });

  it('replaces the account library after a login event from another tab',async()=>{
    await render();
    vi.mocked(fetch).mockImplementation(async path=>{
      if(String(path).endsWith('/auth/refresh')) return json(session('b','account-b'));
      if(String(path).endsWith('/auth/me')) return json(session('b','account-b').account);
      if(String(path).endsWith('/study')) return json({decks:[deck('deck-b')],cards:[]});
      throw new Error('Unexpected test API');
    });
    await act(async()=>{
      localStorage.setItem('remory-account-hint',JSON.stringify(session('b','account-b').account));
      const event=JSON.stringify({id:'external-login-b',kind:'login'});
      localStorage.setItem('remory-auth-event',event);
      window.dispatchEvent(new StorageEvent('storage',{key:'remory-auth-event',newValue:event}));
    });
    expect(state.account?.id).toBe('account-b');
    expect(state.decks.map(value=>value.id)).toEqual(['deck-b']);
  });

  it('does not apply an old-account write after a cookie-only account switch during refresh',async()=>{
    await render();
    let resolveOld!:(value:Response)=>void;
    let oldDeck:unknown;
    vi.mocked(fetch).mockImplementation(async (path,options)=>{
      if(String(path).endsWith('/study/decks')) {
        oldDeck=JSON.parse(String(options?.body));
        return new Promise<Response>(resolve=>{resolveOld=resolve;});
      }
      if(String(path).endsWith('/auth/refresh')) return json(session('b','account-b'));
      if(String(path).endsWith('/auth/me')) return json(session('b','account-b').account);
      if(String(path).endsWith('/study')) return json({decks:[deck('deck-b')],cards:[]});
      throw new Error('Unexpected test API');
    });
    let pending!:ReturnType<typeof state.createDeck>;
    await act(async()=>{pending=state.createDeck({title:'old private deck',subtitle:'',theme:'blue',icon:'book'});});
    await act(async()=>{await refreshSession();});
    expect(state.account?.id).toBe('account-b');
    expect(state.decks.map(value=>value.id)).toEqual(['deck-b']);
    await act(async()=>{resolveOld(json(oldDeck));await pending;});
    expect(state.account?.id).toBe('account-b');
    expect(state.decks.map(value=>value.id)).toEqual(['deck-b']);
    expect(state.syncError).toBe('');
  });

  it('retains recovery information offline and lets the user explicitly continue as a guest',async()=>{
    localStorage.setItem('remory-account-hint',JSON.stringify(session().account));
    vi.mocked(fetch).mockRejectedValue(new TypeError('offline'));
    await render();
    expect(state.restoreError).toBe(true);
    expect(state.restoring).toBe(false);
    await act(async()=>{state.continueAsGuest();});
    expect(state.restoreError).toBe(false);
    expect(state.account).toBeUndefined();
    expect(localStorage.getItem('remory-logout-pending')).toBe('1');
  });
});
