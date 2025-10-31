// app/hooks/useVisionObserve.ts
import html2canvas from "html2canvas";

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

    const canvas = await html2canvas(root, {useCORS:true, scale:1});
    const dataUrl = canvas.toDataURL("image/webp", 0.8);
    const data = dataUrl.split(",")[1];

    const ui = getUIState();
    const diffHash = hashString(JSON.stringify(ui));

    await fetch("/api/v1/vision/observe", {
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
    }).then(r=>r.json()).then(res=>{
      if (res?.audio_b64) {
        const audio = new Audio("data:audio/mpeg;base64," + res.audio_b64);
        audio.play();
      } else if (res?.display_text) console.log("[Interviewer]", res.display_text);
    }).catch(()=>{});
  }

  function start() {
    const id = setInterval(takeAndSend, periodMs);
    // You can expose takeAndSend() to call on “Run” completion.
    return () => clearInterval(id);
  }

  return { start, takeAndSend };
}
