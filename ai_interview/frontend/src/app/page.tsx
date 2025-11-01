"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../components/SessionProvider';

export default function Home() {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setSession, clientKey } = useSession();

  const startInterview = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/interviews`, { method: 'POST', headers: clientKey ? { 'X-Client-Key': clientKey } : undefined });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Failed to create interview (${res.status}): ${txt}`);
      }
      const data = await res.json();
      const interviewId: string = data.interviewId;
      // Backend returns expiresAt as RFC3339 string; parse it to timestamp
      const expiresAt = data.expiresAt ? new Date(data.expiresAt).getTime() : Date.now() + 60 * 60 * 1000;
      setSession({ sessionId: interviewId, expiresAt, runCount: 0 });
      // Mark that we're navigating normally (not a reload)
      try {
        sessionStorage.setItem('aiib_navigating_to_interview', 'true');
      } catch {}
      // Preload a random problem as requested
      const pre = await fetch(`/api/v1/problems/random`);
      if (!pre.ok) console.warn('Preload problem failed', pre.status);
      router.push('/interview');
    } catch (e) {
      console.error('Start interview failed:', e);
      alert('Could not start interview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Interview Buddy</h1>
        <p className="text-gray-500">Practice coding interviews with realistic runs and a final submission.</p>
      </div>
      <>
      <div>
        <h2 className="font-medium">How it works</h2>
        <ul className="list-disc ml-6 text-sm text-white-700 space-y-1">
          <li>You’ll solve coding problems in an interview-like environment.</li>
          <li>Use Run (first 2 attempts); the 3rd attempt is Submit and final.</li>
          <li>Results appear via a Result dialog after backend finishes.</li>
        </ul>
      </div>
      <div>
        <h2 className="font-medium">Rules</h2>
        <ul className="list-disc ml-6 text-sm text-white-700 space-y-1">
          <li>Anti-cheating not enforced yet—use responsibly.</li>
          <li>Max 3 total submissions per session.</li>
          <li>Session valid for 1 hour or until you end it.</li>
        </ul>
      </div>
      <div className="flex items-center gap-2">
        <input id="accept" type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <label htmlFor="accept" className="text-sm">I accept the rules</label>
      </div>
      <div>
        <button onClick={startInterview} disabled={!accepted || loading} className="px-4 py-2 rounded bg-blue-600 text-white disabled:bg-gray-400">{loading ? 'Starting...' : 'Start Interview'}</button>
      </div>
      </>
    </div>
  );
}
