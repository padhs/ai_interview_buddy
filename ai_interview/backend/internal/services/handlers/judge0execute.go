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
	var req types.ExecuteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	//base64_encoded=true ** required by rapid api
	encodedSource := base64.StdEncoding.EncodeToString([]byte(req.SourceCode))
	encodedStdin := base64.StdEncoding.EncodeToString([]byte(req.Stdin))

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
}
