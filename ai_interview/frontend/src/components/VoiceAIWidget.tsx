'use client';

import { useState } from 'react';

export default function VoiceAIWidget() {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleClick = () => {
    setIsActive(!isActive);
    if (!isActive) {
      // TODO: Implement voice AI functionality
      console.log('Starting voice AI interviewer...');
      setIsListening(true);
      // Simulate listening state
      setTimeout(() => {
        setIsListening(false);
      }, 3000);
    } else {
      console.log('Stopping voice AI interviewer...');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={handleClick}
        className={`
          group relative w-16 h-16 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-opacity-50
          ${isActive 
            ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300' 
            : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300'
          }
          ${isListening ? 'animate-pulse' : ''}
        `}
        aria-label={isActive ? 'Stop AI Interviewer' : 'Start AI Interviewer'}
      >
        {/* Microphone Icon */}
        <div className="flex items-center justify-center w-full h-full">
          {isActive ? (
            // Stop icon
            <svg 
              className="w-6 h-6 text-white" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M6 6h12v12H6z"/>
            </svg>
          ) : (
            // Microphone icon
            <svg 
              className="w-6 h-6 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
              />
            </svg>
          )}
        </div>

        {/* Ripple effect for listening state */}
        {isListening && (
          <div className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-75"></div>
        )}

        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          {isActive ? 'Stop AI Interviewer' : 'Start AI Interviewer'}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </button>

      {/* Status indicator */}
      {isActive && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
      )}
    </div>
  );
}
