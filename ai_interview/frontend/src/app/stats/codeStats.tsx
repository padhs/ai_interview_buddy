'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../components/SessionProvider';
import { SessionStats } from '../../../types/types';

export default function StatsPage() {
  const { session, resetSession } = useSession();
  const router = useRouter();
  const [data, setData] = useState<SessionStats | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/v1/stats/session/${session.sessionId}`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, [session]);

  const startNew = () => {
    resetSession();
    router.push('/');
  };

  if (!session) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Interview Session Summary</h1>
        <button onClick={startNew} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors">
          Start New Interview
        </button>
      </div>
      
      {data && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Runs</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalRuns}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Final Status</div>
                <div className={`text-2xl font-bold ${
                  data.finalStatus?.toLowerCase().includes('accepted') || data.finalStatus?.toLowerCase().includes('ok')
                    ? 'text-green-600 dark:text-green-400'
                    : data.finalStatus?.toLowerCase().includes('error') || data.finalStatus?.toLowerCase().includes('wrong')
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {data.finalStatus || '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Session ID</div>
                <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">{data.sessionId}</div>
              </div>
            </div>
          </div>

          {/* Code Execution Results */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Code Execution Results</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="p-3 text-left font-medium text-gray-700 dark:text-gray-300">Run</th>
                    <th className="p-3 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="p-3 text-left font-medium text-gray-700 dark:text-gray-300">Time (s)</th>
                    <th className="p-3 text-left font-medium text-gray-700 dark:text-gray-300">Memory (KB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.perRun?.map((r, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="p-3 font-medium text-gray-900 dark:text-white">{idx + 1}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          r.status?.toLowerCase().includes('accepted') || r.status?.toLowerCase().includes('ok')
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                            : r.status?.toLowerCase().includes('error') || r.status?.toLowerCase().includes('wrong')
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{r.time || '-'}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{r.memory ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interview Remarks */}
          {data.remarks && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Interview Assessment</h2>
              </div>
              <div className="prose prose-sm max-w-none text-blue-800 dark:text-blue-200 whitespace-pre-wrap leading-relaxed">
                {data.remarks}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


