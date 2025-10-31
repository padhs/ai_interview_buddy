"use client";
import ProblemPane from '@/components/ProblemPane';
import CodeEditorPane from '@/components/CodeEditorPane';
import VoiceAIWidget from '@/components/VoiceAIWidget';
import { useSession } from '@/components/SessionProvider';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useVisionObserve } from '../hooks/useVisionObserve';
import html2canvas from 'html2canvas';


export default function InterviewPage() {
  const { session, incrementRunCount, resetSession } = useSession();
  const router = useRouter();
  const [hasResult, setHasResult] = useState(false);
  type ExecStatus = { id: number; description: string };
  type ExecResult = { stdout?: string; stderr?: string; compile_output?: string; time?: string; memory?: number; status?: ExecStatus };
  const [codeStat, setCodeStat] = useState<ExecResult | null>(null);
  const [currentProblemId, setCurrentProblemId] = useState<number>(0);
  const [currentLanguage, setCurrentLanguage] = useState<string>('');
  const runCount = session?.runCount ?? 0;
  const runLabel = runCount < 2 ? 'Run' : (runCount === 2 ? 'Submit' : 'Run');
  const lastInteractionRef = useRef<number>(Date.now());
  const silentCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Vision observe minimal wiring
  const { start, takeAndSend } = useVisionObserve({
    interviewId: session?.sessionId ?? '',
    sessionId: session?.sessionId ?? '',
    getUIState: () => ({
      problemId: currentProblemId,
      lang: currentLanguage,
      lastRunStatus: codeStat?.status?.description ?? '',
      failingTests: [],
    }),
  });
  useEffect(() => {
    if (!session?.sessionId) return;
    const stop = start();
    return stop;
  }, [session?.sessionId, start]);

  // Track user interactions for silent check
  useEffect(() => {
    const updateInteraction = () => { lastInteractionRef.current = Date.now(); };
    window.addEventListener('click', updateInteraction);
    window.addEventListener('keydown', updateInteraction);
    return () => {
      window.removeEventListener('click', updateInteraction);
      window.removeEventListener('keydown', updateInteraction);
    };
  }, []);

  // 5-minute silent check - if user is silent, trigger AI prompt
  useEffect(() => {
    if (!session?.sessionId) return;

    const checkSilence = async () => {
      const timeSinceLastInteraction = Date.now() - lastInteractionRef.current;
      if (timeSinceLastInteraction >= 5 * 60 * 1000) { // 5 minutes
        // User has been silent for 5 minutes - trigger AI prompt
        try {
          const root = document.querySelector('#interview-root');
          if (!root) return;
          
          const canvas = await html2canvas(root as HTMLElement, { useCORS: true, scale: 0.5 });
          const screenshotBase64 = canvas.toDataURL('image/webp', 0.8).split(',')[1];
          
          const context = {
            session_id: session.sessionId,
            problem_id: currentProblemId,
            language: currentLanguage,
            last_run_status: codeStat?.status?.description ?? '',
            failing_test_cases: [],
            diff_hash: '',
          };

          // Call vision/observe to get AI response
          const res = await fetch('/api/v1/vision/observe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              interview_id: session.sessionId,
              session_id: session.sessionId,
              screenshot: { mime: 'image/webp', data: screenshotBase64 },
              ui_state: context,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.audio_b64) {
              const audio = new Audio('data:audio/mpeg;base64,' + data.audio_b64);
              window.dispatchEvent(new Event('ai-voice-playing'));
              audio.onended = () => {
                window.dispatchEvent(new Event('ai-voice-stopped'));
                lastInteractionRef.current = Date.now(); // Reset interaction time after AI speaks
              };
              audio.play().catch(() => {
                window.dispatchEvent(new Event('ai-voice-stopped'));
              });
            }
          }
        } catch (err) {
          console.warn('Silent check failed:', err);
        }
      }
    };

    silentCheckIntervalRef.current = setInterval(checkSilence, 60000); // Check every minute
    return () => {
      if (silentCheckIntervalRef.current) clearInterval(silentCheckIntervalRef.current);
    };
  }, [session?.sessionId, currentProblemId, currentLanguage, codeStat]);

  // Invalidate session on browser refresh and return to welcome page (DELETE)
  useEffect(() => {
    try {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const isReload = !!nav && (nav as PerformanceNavigationTiming).type === 'reload';
      if (isReload && session?.sessionId) {
        fetch(`/api/v1/interviews/${session.sessionId}`, { method: 'DELETE' }).finally(() => {
          // Clear local session and local UI state
          resetSession();
          // navigate to root
          router.push('/');
        });
      }
    } catch {}
  }, [session?.sessionId, router, resetSession]);

  const onRun = async (lang: string, code: string) => {
    if (!session) return;
    if (runCount >= 3) return;
    setCurrentLanguage(lang);
    lastInteractionRef.current = Date.now(); // Update interaction time
    const language_id = lang === 'javascript' ? 63 : 63; // minimal mapping fallback
    const res = await fetch(`/api/v1/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': session.sessionId,
      },
      body: JSON.stringify({ language_id, source_code: code, problem_id: 0, mode: runCount < 2 ? 'sample' : 'hidden' }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const runId: string = data.runID || data.runId;
    if (!runId) return;

    // Open SSE
    const es = new EventSource(`/api/v1/execute/${runId}/events`);
    let closed = false;
    es.addEventListener('completed', (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data);
        setCodeStat(parsed);
        setHasResult(true);
        incrementRunCount();
        // trigger a one-off observation
        takeAndSend();
        if (runCount + 1 >= 3) {
          // end session and navigate to stats
          fetch(`/api/v1/interviews/${session.sessionId}/end`, { method: 'POST' }).finally(() => {
            router.push('/stats');
          });
        }
      } catch {}
      es.close();
      closed = true;
    });
    es.onerror = () => {
      if (!closed) {
        es.close();
        // Fallback once to GET
        fetch(`/api/v1/execute/${runId}`).then(r => r.ok ? r.json() : null).then((parsed) => {
          if (parsed) {
            setCodeStat(parsed);
            setHasResult(true);
            incrementRunCount();
          }
        });
      }
    };
  };

  const onSubmit = onRun;

  const onFinishEarly = async (lang: string, code: string) => {
    if (!session) return;
    if ((session?.runCount ?? 0) >= 3) return;
    // Treat as final submission regardless of current count (hidden tests)
    const language_id = lang === 'javascript' ? 63 : 63;
    const res = await fetch(`/api/v1/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': session.sessionId,
      },
      body: JSON.stringify({ language_id, source_code: code, problem_id: 0, mode: 'hidden' }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const runId: string = data.runID || data.runId;
    if (!runId) return;

    const es = new EventSource(`/api/v1/execute/${runId}/events`);
    let closed = false;
    es.addEventListener('completed', (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data);
        setCodeStat(parsed);
        setHasResult(true);
      } catch {}
      // End interview and navigate to stats
      fetch(`/api/v1/interviews/${session.sessionId}/end`, { method: 'POST' }).finally(() => {
        es.close();
        closed = true;
        router.push('/stats');
      });
    });
    es.onerror = () => {
      if (!closed) {
        es.close();
        fetch(`/api/v1/execute/${runId}`).then(r => r.ok ? r.json() : null).then((parsed) => {
          if (parsed) {
            setCodeStat(parsed);
            setHasResult(true);
            fetch(`/api/v1/interviews/${session.sessionId}/end`, { method: 'POST' }).finally(() => {
              router.push('/stats');
            });
          }
        });
      }
    };
  };

  return (
    <div id="interview-root" className="h-screen flex bg-gray-50 dark:bg-gray-900">
      <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
        <ProblemPane onProblemLoaded={(id) => setCurrentProblemId(id)} />
      </div>
      <div className="w-1/2 relative">
        <CodeEditorPane 
          onRun={onRun} 
          onSubmit={onSubmit} 
          onFinish={onFinishEarly}
          onLanguageChange={(lang: string) => { setCurrentLanguage(lang); lastInteractionRef.current = Date.now(); }}
          runDisabled={runCount >= 3} 
          submitDisabled={runCount >= 3} 
          runLabel={runLabel}
          showFinish={runCount < 2}
        />
        <div className="absolute top-2 right-4">
          <button disabled={!hasResult} onClick={() => setHasResult(true)} className="px-3 py-1.5 rounded border bg-white disabled:opacity-50">Result</button>
        </div>
        {hasResult && codeStat && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-200">Run #{(session?.runCount ?? 0)}</span>
                  <h3 className="text-sm font-semibold tracking-wide">Execution Result</h3>
                </div>
                <button onClick={() => setHasResult(false)} className="text-gray-300 hover:text-white transition-colors" aria-label="Close">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="bg-white dark:bg-gray-900 px-5 py-4 max-h-[70vh] overflow-auto">
                <div className="flex items-center gap-3 mb-4">
                  {(() => {
                    const desc = codeStat?.status?.description || '-';
                    const badgeClass = desc.toLowerCase().includes('accepted') || desc.toLowerCase().includes('ok')
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : desc.toLowerCase().includes('time') || desc.toLowerCase().includes('memory')
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                      : desc.toLowerCase().includes('compil') || desc.toLowerCase().includes('error')
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
                    return (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                        {desc}
                      </span>
                    );
                  })()}
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="mr-4"><span className="font-medium">Time:</span> {codeStat?.time || '-'}</span>
                    <span><span className="font-medium">Memory:</span> {codeStat?.memory ?? '-'}</span>
                  </div>
                </div>

                {codeStat?.compile_output && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Compiler Output</div>
                    <pre className="text-xs bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-auto whitespace-pre-wrap font-mono">
                      {codeStat.compile_output}
                    </pre>
                  </div>
                )}

                {codeStat?.stdout && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Stdout</div>
                    <pre className="text-xs bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-auto whitespace-pre-wrap font-mono">
                      {codeStat.stdout}
                    </pre>
                  </div>
                )}

                {codeStat?.stderr && (
                  <div className="mb-2">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Stderr</div>
                    <pre className="text-xs bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-auto whitespace-pre-wrap font-mono text-rose-700 dark:text-rose-300">
                      {codeStat.stderr}
                    </pre>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/70 px-5 py-3 flex items-center justify-end gap-3">
                <button onClick={() => setHasResult(false)} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <VoiceAIWidget 
        problemId={currentProblemId}
        language={currentLanguage}
        lastRunStatus={codeStat?.status?.description ?? ''}
      />
    </div>
  );
}


