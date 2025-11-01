'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session, SessionCtx } from '../../types/types';

const Ctx = createContext<SessionCtx | null>(null);

export const useSession = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
};

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSessionState] = useState<Session | null>(null);
  const [clientKey, setClientKey] = useState<string | null>(null);

  useEffect(() => {
    // stable client key
    try {
      let key = localStorage.getItem('aiib_client_key');
      if (!key) {
        key = crypto.randomUUID();
        localStorage.setItem('aiib_client_key', key);
      }
      setClientKey(key);
    } catch {}

    try {
      const raw = localStorage.getItem('aiib_session');
      if (raw) {
        const parsed = JSON.parse(raw) as Session;
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          setSessionState(parsed);
          return;
        }
      }
    } catch {}
    // no valid session; redirect off interview/stats
  }, []);

  useEffect(() => {
    if (session) {
      localStorage.setItem('aiib_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('aiib_session');
    }
  }, [session]);

  const api: SessionCtx = useMemo(() => ({
    session,
    clientKey,
    setSession: (s) => setSessionState(s),
    incrementRunCount: () => setSessionState((prev) => prev ? { ...prev, runCount: Math.min(3, prev.runCount + 1) } : prev),
    resetSession: () => setSessionState(null),
    endSession: () => setSessionState((prev) => {
      if (!prev) return prev;
      return { ...prev, expiresAt: Date.now() - 1 };
    }),
  }), [session, clientKey]);

  // Guard routes: if expired and not on welcome, push to /
  // Only redirect if session exists and is expired (not if session is null during initial load)
  useEffect(() => {
    if (session && session.expiresAt <= Date.now()) {
      // Session expired - redirect to welcome page
      router.push('/');
    }
  }, [session, router]);

  return (
    <Ctx.Provider value={api}>{children}</Ctx.Provider>
  );
}


