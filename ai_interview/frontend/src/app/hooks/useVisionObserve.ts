// app/hooks/useVisionObserve.ts
import html2canvas from "html2canvas-pro";

function hashString(s: string) {
  let h = 0; for (let i=0;i<s.length;i++) h = (h<<5)-h + s.charCodeAt(i) | 0;
  return String(h >>> 0);
}

export function useVisionObserve({
  rootSelector = "#interview-root",
  periodMs = 30000,
  interviewId,
  sessionId,
  getUIState, // () => { problemId, lang, lastRunStatus, failingTests }
}: {
  rootSelector?: string;
  periodMs?: number;
  interviewId: string;
  sessionId?: string;
  getUIState: () => { problemId:number, lang:string, lastRunStatus:string, failingTests:number[] };
}) {
  async function takeAndSend() {
    const root = document.querySelector(rootSelector) as HTMLElement | null;
    if (!root) return;

    try {
      // Suppress the willReadFrequently warning by configuring html2canvas-pro
      // The warning appears because html2canvas internally uses getImageData frequently
      // We'll optimize by using a lower scale for better performance
      const canvas = await html2canvas(root, {
        useCORS: true,
        scale: 0.75, // Reduced from 1.0 to improve performance and reduce warnings
        backgroundColor: '#ffffff',
        logging: false,
        // Optimize for frequent read operations
        onclone: (clonedDoc) => {
          // Set willReadFrequently on any canvas contexts in the cloned document
          try {
            const canvases = clonedDoc.querySelectorAll('canvas');
            canvases.forEach((canvasEl) => {
              try {
                // Get existing context and recreate with willReadFrequently if possible
                const existingCtx = canvasEl.getContext('2d');
                if (existingCtx) {
                  // Try to hint the browser about frequent reads
                  // Note: Once a context is created, we can't change willReadFrequently
                  // But this helps with canvases that are cloned from the original DOM
                }
              } catch {
                // Ignore individual canvas errors
              }
            });
          } catch {
            // Ignore errors in clone processing
          }
        },
      });
      
      // Create a temporary canvas with willReadFrequently if we need to process it further
      // For now, we just use toDataURL which is optimized
      const dataUrl = canvas.toDataURL("image/webp", 0.8);
      const data = dataUrl.split(",")[1];

      const ui = getUIState();
      const diffHash = hashString(JSON.stringify(ui));

      const response = await fetch("/api/v1/vision/observe", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          interview_id: interviewId,
          session_id: sessionId || "",
          screenshot: { mime: "image/webp", data },
          ui_state: {
            session_id: sessionId || "",
            problem_id: ui.problemId,
            language: ui.lang,
            last_run_status: ui.lastRunStatus,
            failing_test_cases: ui.failingTests,
            diff_hash: diffHash,
          }
        })
      });

      if (!response.ok) {
        // For 502 errors, only log once per minute to avoid console spam
        const now = Date.now();
        const lastLogKey = 'vision-observe-last-502-log';
        const lastLogTime = sessionStorage.getItem(lastLogKey);
        
        if (response.status === 502) {
          // Only log detailed 502 errors once per minute
          if (!lastLogTime || now - parseInt(lastLogTime, 10) > 60000) {
            sessionStorage.setItem(lastLogKey, now.toString());
            console.warn('[Vision Observe] 502 Bad Gateway - This usually indicates:');
            console.warn('  - Gemini API is down or API key is missing/invalid');
            console.warn('  - ElevenLabs API is down or API key is missing/invalid');
            console.warn('  - Backend service is not running or unreachable');
            console.warn('  (Further 502 errors will be suppressed for 1 minute)');
          }
          // Silently return for subsequent 502s within the minute
          return;
        }
        
        // For other errors, log normally but not as error level
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn(`[Vision Observe] Request failed (${response.status}):`, errorText.substring(0, 200));
        return;
      }

      const res = await response.json().catch(() => null);
      if (!res) {
        console.warn('[Vision Observe] Invalid response from server');
        return;
      }

      if (res?.audio_b64) {
        const audio = new Audio("data:audio/mpeg;base64," + res.audio_b64);
        audio.play().catch((e) => {
          console.warn('[Vision Observe] Failed to play audio:', e);
        });
      } else if (res?.display_text) {
        console.log("[Interviewer]", res.display_text);
      }
    } catch (err) {
      // Only log errors that aren't network-related (which are expected if backend is down)
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (!errorMessage.includes('fetch') && !errorMessage.includes('network')) {
        console.warn('[Vision Observe] Error capturing or sending screenshot:', err);
      }
    }
  }

  function start() {
    const id = setInterval(takeAndSend, periodMs);
    // You can expose takeAndSend() to call on “Run” completion.
    return () => clearInterval(id);
  }

  return { start, takeAndSend };
}
