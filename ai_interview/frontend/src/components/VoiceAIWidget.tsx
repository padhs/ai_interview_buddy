'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from './SessionProvider';
import { VoiceAIWidgetProps } from '../../types/types';
import html2canvas from 'html2canvas';

// Load the Lottie web component only on client via CDN to avoid bundling issues
let lottieLoading: Promise<void> | null = null;
function ensureLottie(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (customElements && customElements.get && customElements.get('lottie-player')) {
    return Promise.resolve();
  }
  if (lottieLoading) return lottieLoading;
  lottieLoading = new Promise<void>((resolve) => {
    const existing = document.querySelector('script[data-lottie-player]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
    script.async = true;
    script.defer = true;
    script.dataset.lottiePlayer = 'true';
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
  return lottieLoading;
}

export default function VoiceAIWidget({ problemId = 0, language = '', lastRunStatus = '' }: VoiceAIWidgetProps = {}) {
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const { session } = useSession();

  useEffect(() => {
    // Prepare lottie player custom element
    ensureLottie();

    const onStart = () => setIsAIPlaying(true);
    const onStop = () => setIsAIPlaying(false);

    window.addEventListener('ai-voice-playing', onStart as EventListener);
    window.addEventListener('ai-voice-stopped', onStop as EventListener);
    return () => {
      window.removeEventListener('ai-voice-playing', onStart as EventListener);
      window.removeEventListener('ai-voice-stopped', onStop as EventListener);
    };
  }, []);

  const requestMic = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Start recording with MediaRecorder
      try {
        const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        chunksRef.current = [];
        mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
        mr.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          chunksRef.current = [];
          
          // Capture code snapshot from editor
          let screenshotBase64 = '';
          try {
            const editorElement = (document.querySelector('.monaco-editor')?.parentElement?.parentElement as HTMLElement) || 
                                  (document.querySelector('#interview-root') as HTMLElement);
            if (editorElement) {
              const canvas = await html2canvas(editorElement, {
                useCORS: true,
                scale: 0.5,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                  // Replace unsupported oklch() colors with compatible rgb/rgba
                  const styleSheets = clonedDoc.styleSheets;
                  try {
                    for (let i = 0; i < styleSheets.length; i++) {
                      const sheet = styleSheets[i] as CSSStyleSheet;
                      try {
                        const rules = sheet.cssRules || sheet.rules;
                        if (rules) {
                          for (let j = 0; j < rules.length; j++) {
                            const rule = rules[j] as CSSStyleRule;
                            if (rule.style && rule.style.cssText) {
                              rule.style.cssText = rule.style.cssText.replace(/oklch\([^)]+\)/g, '#9ca3af');
                            }
                          }
                        }
                      } catch {
                        // CORS or other sheet access issues - ignore
                      }
                    }
                  } catch {
                    // Ignore stylesheet access errors
                  }
                  // Also replace in inline styles
                  const allElements = clonedDoc.querySelectorAll('*');
                  allElements.forEach((el) => {
                    const htmlEl = el as HTMLElement;
                    if (htmlEl.style && htmlEl.style.cssText) {
                      htmlEl.style.cssText = htmlEl.style.cssText.replace(/oklch\([^)]+\)/g, '#9ca3af');
                    }
                  });
                },
              });
              screenshotBase64 = canvas.toDataURL('image/webp', 0.8).split(',')[1];
            }
          } catch (err) {
            console.warn('Failed to capture screenshot:', err);
          }
          
          // Prepare UI context if available
          const context = session ? {
            session_id: session.sessionId,
            problem_id: problemId,
            language: language,
            last_run_status: lastRunStatus,
            failing_test_cases: [],
            diff_hash: '',
          } : null;

          // Send audio to Gemini + get TTS response
          try {
            const formData = new FormData();
            formData.append('audio', blob, 'recording.webm');
            if (screenshotBase64) {
              formData.append('screenshot', screenshotBase64);
            }
            if (context) {
              formData.append('context', JSON.stringify(context));
            }

            const res = await fetch('/api/v1/voice/chat', {
              method: 'POST',
              body: formData,
            });

            if (res.ok && res.headers.get('Content-Type')?.includes('audio/mpeg')) {
              // Play the audio response
              const audioBlob = await res.blob();
              const audioUrl = URL.createObjectURL(audioBlob);
              const audio = new Audio(audioUrl);
              
              window.dispatchEvent(new Event('ai-voice-playing'));
              audio.onended = () => {
                window.dispatchEvent(new Event('ai-voice-stopped'));
                URL.revokeObjectURL(audioUrl);
              };
              audio.play().catch(() => {
                window.dispatchEvent(new Event('ai-voice-stopped'));
                URL.revokeObjectURL(audioUrl);
              });
            }
          } catch {}
        };
        mr.start(1000);
        recorderRef.current = mr;
      } catch {}

      // Start simple speaking detection using Web Audio API
      type AudioContextCtor = new () => AudioContext;
      const win = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
      const Ctor: AudioContextCtor = (win.AudioContext ?? win.webkitAudioContext)!;
      const ctx: AudioContext = new Ctor();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        // Compute RMS to infer speaking
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setIsSpeaking(rms > 0.05);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
      setIsRecording(true);
    } catch (err: unknown) {
      const msg = (() => {
        if (typeof err === 'object' && err !== null && 'message' in err) {
          const m = (err as { message?: unknown }).message;
          return typeof m === 'string' ? m : 'Microphone access denied';
        }
        return 'Microphone access denied';
      })();
      setMicError(msg);
    }
  };

  const stopMic = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch {}
    }
    const s = mediaStreamRef.current;
    if (s) {
      s.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsSpeaking(false);
    setIsRecording(false);
  }, []);

  useEffect(() => () => stopMic(), [stopMic]);

  // Use the attached Lottie asset; encode spaces for a safe URL
  const lottieVoiceSrc = useMemo(() => encodeURI('/lottiefiles/Voice recognition.lottie'), []);
  const lottieSiriSrc = useMemo(() => encodeURI('/lottiefiles/loading siri.lottie'), []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Dual Lottie row */}
      <div className="flex items-center gap-2">
        {/* Left: loading siri */}
        {isAIPlaying && (
          <div className="w-28 h-28 pointer-events-none">
            {(() => {
              const Tag: string = 'lottie-player';
              const props = {
                autoplay: true,
                loop: true,
                mode: 'normal',
                src: lottieSiriSrc,
                style: { width: '112px', height: '112px' },
              } as React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                autoplay?: boolean; loop?: boolean; mode?: string; src?: string; style?: React.CSSProperties;
              };
              return React.createElement(Tag, props);
            })()}
          </div>
        )}
        {/* Right: voice recognition */}
        {isAIPlaying && (
          <div className="w-28 h-28 pointer-events-none">
            {(() => {
              const Tag: string = 'lottie-player';
              const props = {
                autoplay: true,
                loop: true,
                mode: 'normal',
                src: lottieVoiceSrc,
                style: { width: '112px', height: '112px' },
              } as React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                autoplay?: boolean; loop?: boolean; mode?: string; src?: string; style?: React.CSSProperties;
              };
              return React.createElement(Tag, props);
            })()}
          </div>
        )}
      </div>

      {/* Microphone control (start/stop recording only) */}
      <button
        onClick={() => (isRecording ? stopMic() : requestMic())}
        className={`
          group relative w-16 h-16 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-opacity-50
          ${isRecording ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300' : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300'}
          ${isSpeaking ? 'animate-pulse' : ''}
        `}
        aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
      >
        <div className="flex items-center justify-center w-full h-full">
          {/* Mic icon */}
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19v4m0 0H9m3 0h3" />
          </svg>
        </div>
        {/* Speaking ripple */}
        {isSpeaking && (
          <div className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-75"></div>
        )}
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          {isRecording ? 'Recording…' : 'Start mic'}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </button>

      {/* Mic error */}
      {micError && (
        <div className="max-w-xs text-xs text-red-200 bg-red-700 rounded px-2 py-1 shadow">{micError}</div>
      )}
    </div>
  );
}

// External hooks: trigger these events around ElevenLabs audio playback
// window.dispatchEvent(new CustomEvent('ai-voice-playing', { detail: true }));
// window.dispatchEvent(new Event('ai-voice-stopped'));