"use client";
import ProblemPane from '@/components/ProblemPane';
import CodeEditorPane from '@/components/CodeEditorPane';
import VoiceAIWidget from '@/components/VoiceAIWidget';
import { useSession } from '@/components/SessionProvider';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InterviewPage() {
  const { session, incrementRunCount } = useSession();
  const router = useRouter();
  const [hasResult, setHasResult] = useState(false);
  type ExecStatus = { id: number; description: string };
  type ExecResult = { stdout?: string; stderr?: string; compile_output?: string; time?: string; memory?: number; status?: ExecStatus };
  const [codeStat, setCodeStat] = useState<ExecResult | null>(null);
  const runCount = session?.runCount ?? 0;
  const runLabel = runCount < 2 ? 'Run' : (runCount === 2 ? 'Submit' : 'Run');

  const onRun = async (lang: string, code: string) => {
    if (!session) return;
    if (runCount >= 3) return;
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

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
        <ProblemPane />
      </div>
      <div className="w-1/2 relative">
        <CodeEditorPane onRun={onRun} onSubmit={onSubmit} runDisabled={runCount >= 3} submitDisabled={runCount >= 3} runLabel={runLabel} />
        <div className="absolute top-2 right-4">
          <button disabled={!hasResult} onClick={() => setHasResult(true)} className="px-3 py-1.5 rounded border bg-white disabled:opacity-50">Result</button>
        </div>
        {hasResult && codeStat && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded shadow p-4 w-[600px] max-h-[80vh] overflow-auto">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Result</h3>
                <button onClick={() => setHasResult(false)} className="text-sm">Close</button>
              </div>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Status:</span> {codeStat?.status?.description || '-'}</div>
                <div className="grid grid-cols-3 gap-2">
                  <div><span className="font-medium">Time:</span> {codeStat?.time || '-'}</div>
                  <div><span className="font-medium">Memory:</span> {codeStat?.memory ?? '-'}</div>
                </div>
                {codeStat?.stdout && (
                  <div>
                    <div className="font-medium">Stdout</div>
                    <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap">{codeStat.stdout}</pre>
                  </div>
                )}
                {codeStat?.stderr && (
                  <div>
                    <div className="font-medium">Stderr</div>
                    <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap">{codeStat.stderr}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <VoiceAIWidget />
    </div>
  );
}


