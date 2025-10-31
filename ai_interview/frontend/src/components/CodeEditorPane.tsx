'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CodeEditorPaneProps } from '../../types/types';

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">Loading editor...</div>
});

const languages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
];

const defaultCode = {
  javascript: `class Solution {
  // Write your function(s) here
}
`,
  typescript: `class Solution {
  // Write your method(s) here
}
`,
  python: `class Solution:
    # Write your def(s) here
    pass
`,
  java: `class Solution {
    // Write your method(s) here
}
`,
  cpp: `class Solution {
public:
    // Write your function(s) here
};
`,
  csharp: `public class Solution {
    // Write your method(s) here
}
`,
  go: `package main

type Solution struct{}

func (s *Solution) Solve() {
    // Write your method(s) here
}
`,
  rust: `struct Solution;

impl Solution {
    pub fn solve(&self) {
        // Write your method(s) here
    }
}
`
};

export default function CodeEditorPane({ onRun, onSubmit, onFinish, onLanguageChange, runDisabled, submitDisabled, runLabel, showFinish }: CodeEditorPaneProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [code, setCode] = useState(defaultCode.javascript);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLanguageChange = (newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    setCode(defaultCode[newLanguage as keyof typeof defaultCode] || '');
    if (onLanguageChange) {
      onLanguageChange(newLanguage);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    try {
      if (onRun) await onRun(selectedLanguage, code);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (onSubmit) await onSubmit(selectedLanguage, code);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      if (onFinish) await onFinish(selectedLanguage, code);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Top Section - Language Selector and Buttons */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="language-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Language:
              </label>
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 
                            text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {runLabel === 'Submit' ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !!submitDisabled}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
                disabled:cursor-not-allowed rounded-md transition-colors duration-200 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleRun}
                disabled={isRunning || !!runDisabled}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 
                disabled:bg-green-400 disabled:cursor-not-allowed rounded-md transition-colors duration-200 flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Running...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-6a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {runLabel || 'Run'}
                  </>
                )}
              </button>
            )}

            {showFinish && runLabel !== 'Submit' && (
              <button
                onClick={handleFinish}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 
                disabled:cursor-not-allowed rounded-md transition-colors duration-200 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Finishing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Finish Interview
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={selectedLanguage}
          value={code}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            suggest: {
              showKeywords: true,
              showSnippets: true,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
          }}
          onMount={(editor, monaco) => {
            // Configure Monaco Editor on mount
            monaco.editor.setTheme('vs-dark');
          }}
        />
      </div>
    </div>
  );
}
