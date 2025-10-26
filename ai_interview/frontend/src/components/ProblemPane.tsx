'use client';

import { useState, useEffect } from 'react';
import { fetchRandomProblem } from '../services/api';
import { parseProblem, ParsedProblem } from '../utils/ParseProblem';

export default function ProblemPane() {
  const [problem, setProblem] = useState<ParsedProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProblem = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetchRandomProblem();
        const parsedProblem = parseProblem(response);
        setProblem(parsedProblem);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load problem');
        console.error('Error loading problem:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProblem();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-800">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading problem...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isConnectionError = error.includes('Unable to connect to the server');
    
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-800">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-600 dark:text-red-400 mb-2 font-semibold">
              {isConnectionError ? 'Backend Server Not Available' : 'Failed to load problem'}
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error}</p>
            
            {isConnectionError && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4 text-left">
                <h4 className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">To fix this:</h4>
                <ol className="text-yellow-700 dark:text-yellow-300 text-sm space-y-1 list-decimal list-inside">
                  <li>Make sure your Go backend server is running</li>
                  <li>Check that it&apos;s listening on port 8080</li>
                  <li>For Docker setups: Ensure port 8080 is mapped with <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">-p 8080:8080</code></li>
                  <li>Verify the API endpoint: <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">GET /api/v1/problems/random</code></li>
                  <li>Test with: <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">curl http://localhost:8080/api/v1/problems/random</code></li>
                  <li>Check browser console for detailed error logs</li>
                </ol>
                <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                  <strong>Debug Info:</strong> Check browser console (F12) for detailed connection logs
                </div>
              </div>
            )}
            
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-800">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600 dark:text-gray-400">No problem data available</p>
        </div>
      </div>
    );
  }

  const { id, title, difficulty, description, examples, constraints, followUp } = problem;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatDifficulty = (difficulty: string) => {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Top Section - ID, Title, Difficulty */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Problem {id}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
            {formatDifficulty(difficulty)}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Description */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Description
          </h2>
          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
            {description}
          </div>
        </div>

        {/* Examples */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Examples
          </h2>
          <div className="space-y-4">
            {examples.map((example, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Example {index + 1}:
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Input:
                    </span>
                    <pre className="mt-1 text-sm text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 p-2 rounded">
                      {example.input}
                    </pre>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Output:
                    </span>
                    <pre className="mt-1 text-sm text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 p-2 rounded">
                      {example.output}
                    </pre>
                  </div>
                  {example.explanation && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Explanation:
                      </span>
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        {example.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Constraints */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Constraints
          </h2>
          <ul className="space-y-2">
            {constraints.map((constraint, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                <span className="text-gray-400 dark:text-gray-500 mt-1">•</span>
                <span className="text-sm">{constraint}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Follow-up */}
        {followUp && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Follow-up
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                {followUp}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
