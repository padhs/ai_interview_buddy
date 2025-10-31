// handler to execute code on judge0

package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/padhs/ai_interview_buddy/backend/internal/types"
)

func Judge0CodeExecution(w http.ResponseWriter, r *http.Request) {
	// Session gating
	sessionID := r.Header.Get("X-Session-ID")
	if sessionID == "" {
		sessionID = r.URL.Query().Get("sessionId")
	}
	if sessionID == "" {
		http.Error(w, "missing sessionId", http.StatusUnauthorized)
		return
	}
	sess, ok := getSession(sessionID)
	if !ok || sess.Status != types.SessionActive || time.Now().After(sess.ExpiresAt) {
		http.Error(w, "invalid or expired session", http.StatusUnauthorized)
		return
	}
	if sess.RunCount >= 3 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(map[string]any{"error": "max_runs_reached"})
		return
	}

	var req types.ExecuteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	//base64_encoded=true ** required by rapid api
	encodedSource := base64.StdEncoding.EncodeToString([]byte(req.SourceCode))
	encodedStdin := base64.StdEncoding.EncodeToString([]byte(req.Stdin))

	// Force mode by run count (0,1 => sample; 2 => hidden)
	// We do not store mode in Judge0; backend uses it if needed later.
	payload := map[string]interface{}{
		"language_id": req.LanguageID,
		"source_code": encodedSource,
		"stdin":       encodedStdin,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, "failed to marshal payload", http.StatusInternalServerError)
		return
	}

	judge0URL := os.Getenv("JUDGE0_URL")
	if judge0URL == "" {
		judge0URL = "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=false&fields=*"
	}

	log.Printf("DEBUG: Using Judge0 URL: %s", judge0URL)

	httpReq, err := http.NewRequest("POST", judge0URL, bytes.NewReader(data))
	if err != nil {
		http.Error(w, "failed to create request", http.StatusInternalServerError)
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")
	apiKey := os.Getenv("RAPIDAPI_KEY")
	if apiKey == "" {
		log.Printf("missing RAPIDAPI_KEY env; cannot call Judge0")
		http.Error(w, "missing RAPIDAPI_KEY", http.StatusInternalServerError)
		return
	}
	httpReq.Header.Set("X-RapidAPI-Key", apiKey)
	rapidHost := os.Getenv("RAPIDAPI_HOST")
	if rapidHost == "" {
		rapidHost = "judge0-ce.p.rapidapi.com"
	}
	httpReq.Header.Set("X-RapidAPI-Host", rapidHost)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Read entire body for robust logging/decoding
	bodyBytes, _ := io.ReadAll(resp.Body)
	bodyStr := string(bodyBytes)

	// Check status and log body when non-2xx
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("Judge0 submission error: status=%d rawBody=%q", resp.StatusCode, bodyStr)
		http.Error(w, "judge0 submission failed", http.StatusBadGateway)
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		log.Printf("Judge0 submission decode error: status=%d rawBody=%q err=%v", resp.StatusCode, bodyStr, err)
		http.Error(w, "invalid response from Judge0", http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// Judge0 create-submission (wait=false) usually returns only a token.
	// Avoid unsafe assertions; include status description only if present.
	var statusDescription interface{}
	if rawStatus, ok := result["status"].(map[string]interface{}); ok {
		statusDescription = rawStatus["description"]
	}
	token, _ := result["token"].(string)
	if token == "" {
		log.Printf("Judge0 submission missing token: rawBody=%q", bodyStr)
		http.Error(w, "invalid response from Judge0 (missing token)", http.StatusBadGateway)
		return
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"runID":      token,
		"status":     statusDescription,
		"statusCode": resp.StatusCode,
	})

	// Start background fetch loop to get result and publish via SSE
	go func(sessionID, runID string) {
		// Check if we already have the result cached to avoid unnecessary polling
		if cachedResult, ok := getRunResult(runID); ok {
			// We already have the result, publish it and return
			bodyBytes, _ := json.Marshal(cachedResult)
			publish(runID, bodyBytes)
			// increment run count and append run result if not already done
			if sess2, ok := getSession(sessionID); ok {
				globalStore.Mu.Lock()
				if sess2.RunCount < 3 {
					sess2.RunCount++
				}
				globalStore.Mu.Unlock()
			}
			rr := types.RunResult{
				Run:    0,
				Status: cachedResult.Status.Description,
				Time:   cachedResult.Time,
				Memory: cachedResult.Memory,
				Stdout: cachedResult.Stdout,
				Stderr: cachedResult.Stderr,
			}
			appendRun(sessionID, rr)
			return
		}

		// Poll Judge0 for up to 60s
		deadline := time.Now().Add(60 * time.Second)
		for {
			if time.Now().After(deadline) {
				return
			}

			// Check again if result was cached by another goroutine/request
			if cachedResult, ok := getRunResult(runID); ok {
				bodyBytes, _ := json.Marshal(cachedResult)
				publish(runID, bodyBytes)
				if sess2, ok := getSession(sessionID); ok {
					globalStore.Mu.Lock()
					if sess2.RunCount < 3 {
						sess2.RunCount++
					}
					globalStore.Mu.Unlock()
				}
				rr := types.RunResult{
					Run:    0,
					Status: cachedResult.Status.Description,
					Time:   cachedResult.Time,
					Memory: cachedResult.Memory,
					Stdout: cachedResult.Stdout,
					Stderr: cachedResult.Stderr,
				}
				appendRun(sessionID, rr)
				return
			}

			// GET submission
			apiURL := "https://judge0-ce.p.rapidapi.com/submissions/" + runID + "?base64_encoded=true&fields=stdout,stderr,compile_output,status,time,memory"
			reqGet, err := http.NewRequest("GET", apiURL, nil)
			if err != nil {
				time.Sleep(2 * time.Second)
				continue
			}
			apiKey := os.Getenv("RAPIDAPI_KEY")
			if apiKey == "" {
				return
			}
			reqGet.Header.Set("X-RapidAPI-Key", apiKey)
			host := os.Getenv("RAPIDAPI_HOST")
			if host == "" {
				host = "judge0-ce.p.rapidapi.com"
			}
			reqGet.Header.Set("X-RapidAPI-Host", host)

			respGet, err := (&http.Client{Timeout: 10 * time.Second}).Do(reqGet)
			if err != nil {
				time.Sleep(2 * time.Second)
				continue
			}
			body, _ := io.ReadAll(respGet.Body)
			respGet.Body.Close()
			if respGet.StatusCode >= 200 && respGet.StatusCode < 300 {
				// Peek status.id using shared type
				var parsed types.Judge0GetResp
				if err := json.Unmarshal(body, &parsed); err == nil {
					// Terminal statuses: ID > 2 per Judge0 (1: In Queue, 2: Processing)
					if parsed.Status.ID > 2 {
						// Cache the result to avoid duplicate calls
						setRunResult(runID, &parsed)
						// Publish to listeners as raw JSON
						publish(runID, body)
						// increment run count and append run result
						if sess2, ok := getSession(sessionID); ok {
							// increment only once
							globalStore.Mu.Lock()
							if sess2.RunCount < 3 {
								sess2.RunCount++
							}
							globalStore.Mu.Unlock()
						}
						// store minimal stats
						rr := types.RunResult{Run: 0, Status: parsed.Status.Description, Time: parsed.Time, Memory: parsed.Memory, Stdout: parsed.Stdout, Stderr: parsed.Stderr}
						appendRun(sessionID, rr)
						return
					}
				}
			}
			time.Sleep(2 * time.Second)
		}
	}(sessionID, token)
}
