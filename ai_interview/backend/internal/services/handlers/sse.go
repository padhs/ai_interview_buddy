package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

// GET /api/v1/execute/{runID}/events
func ExecutionEvents(w http.ResponseWriter, r *http.Request) {
	runID := chi.URLParam(r, "runID")
	if runID == "" {
		http.Error(w, "missing runID", http.StatusBadRequest)
		return
	}

	// Basic SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	listener := addListener(runID)
	timeout := time.NewTimer(60 * time.Second)

	select {
	case payload := <-listener:
		fmt.Fprintf(w, "event: completed\n")
		fmt.Fprintf(w, "data: %s\n\n", string(payload))
		flusher.Flush()
	case <-timeout.C:
		fmt.Fprintf(w, "event: timeout\n")
		fmt.Fprintf(w, "data: {}\n\n")
		flusher.Flush()
	case <-r.Context().Done():
		return
	}
}
