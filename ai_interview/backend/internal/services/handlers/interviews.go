package handlers

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/padhs/ai_interview_buddy/backend/internal/types"
)

func generateId() string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 16)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

// POST /api/v1/interviews
func CreateInterview(w http.ResponseWriter, r *http.Request) {
	clientKey := r.Header.Get("X-Client-Key")
	if clientKey != "" {
		// check existing active
		globalStore.Mu.Lock()
		if sid, ok := globalStore.ClientActive[clientKey]; ok {
			if sess, ok2 := globalStore.Sessions[sid]; ok2 && sess.Status == types.SessionActive && time.Now().Before(sess.ExpiresAt) {
				globalStore.Mu.Unlock()
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(map[string]any{
					"interviewId": sess.ID,
					"expiresAt":   sess.ExpiresAt,
				})
				return
			}
		}
		globalStore.Mu.Unlock()
	}

	id := generateId()
	sess := createSession(id, time.Hour)
	if clientKey != "" {
		globalStore.Mu.Lock()
		globalStore.ClientActive[clientKey] = sess.ID
		globalStore.Mu.Unlock()
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"interviewId": sess.ID,
		"expiresAt":   sess.ExpiresAt,
	})
}

// POST /api/v1/interviews/{id}/end
func EndInterview(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "missing id", http.StatusBadRequest)
		return
	}
	endSession(id)
	w.WriteHeader(http.StatusNoContent)
}

// DELETE /api/v1/interviews/{id}
func DeleteInterview(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "missing id", http.StatusBadRequest)
		return
	}
	deleteSession(id)
	w.WriteHeader(http.StatusNoContent)
}
