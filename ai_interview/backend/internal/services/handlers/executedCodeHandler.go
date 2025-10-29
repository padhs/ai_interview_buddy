// handler to get result of executed code from judge0 via runID

package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
)

func ExecutedCodeHandler(w http.ResponseWriter, r *http.Request) {
	// GET /api/v1/execute/{runID}
	runID := chi.URLParam(r, "runID")
	if runID == "" {
		http.Error(w, "missing runID in path", http.StatusBadRequest)
		return
	}

	// Build Judge0 GET URL
	apiURL := fmt.Sprintf("https://judge0-ce.p.rapidapi.com/submissions/%s?base64_encoded=true&fields=stdout,stderr,compile_output,status,time,memory", runID)

	httpReq, err := http.NewRequest("GET", apiURL, nil)
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

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		log.Printf("HTTP request to RapidAPI failed: %v", err)
		http.Error(w, "failed to reach Judge0 API", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusAccepted {
		http.Error(w, fmt.Sprintf("Judge0 API error (status %d)", resp.StatusCode), http.StatusBadGateway)
		return
	}

	var result struct {
		Stdout        *string        `json:"stdout"`
		Stderr        *string        `json:"stderr"`
		CompileOutput *string        `json:"compile_output"`
		Time          *string        `json:"time"`
		Memory        *int           `json:"memory"`
		Status        map[string]any `json:"status"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		http.Error(w, "invalid JSON from Judge0: "+err.Error(), http.StatusBadGateway)
		return
	}

	// Decode base64-encoded outputs if present
	decode := func(s *string) *string {
		if s == nil || *s == "" {
			return s
		}
		decoded, err := base64.StdEncoding.DecodeString(*s)
		if err != nil {
			// If decode fails, return original; do not hard-fail
			return s
		}
		out := string(decoded)
		return &out
	}

	result.Stdout = decode(result.Stdout)
	result.Stderr = decode(result.Stderr)
	result.CompileOutput = decode(result.CompileOutput)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}
