package handlers

import (
	"time"

	"github.com/padhs/ai_interview_buddy/backend/internal/types"
)

var globalStore = &types.Store{
	Sessions:     make(map[string]*types.SessionInfo),
	RunListeners: make(map[string][]types.SSEListener),
	SessionRuns:  make(map[string][]types.RunResult),
	ClientActive: make(map[string]string),
	RunResults:   make(map[string]*types.Judge0GetResp),
}

func createSession(id string, ttl time.Duration) *types.SessionInfo {
	globalStore.Mu.Lock()
	defer globalStore.Mu.Unlock()
	sess := &types.SessionInfo{
		ID:        id,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(ttl),
		RunCount:  0,
		Status:    types.SessionActive,
	}
	globalStore.Sessions[id] = sess
	return sess
}

func getSession(id string) (*types.SessionInfo, bool) {
	globalStore.Mu.Lock()
	defer globalStore.Mu.Unlock()
	sess, ok := globalStore.Sessions[id]
	return sess, ok
}

func endSession(id string) {
	globalStore.Mu.Lock()
	defer globalStore.Mu.Unlock()
	if sess, ok := globalStore.Sessions[id]; ok {
		sess.Status = types.SessionEnded
		sess.ExpiresAt = time.Now()
	}
}

func deleteSession(id string) {
	globalStore.Mu.Lock()
	defer globalStore.Mu.Unlock()
	// remove session
	delete(globalStore.Sessions, id)
	// remove runs for session
	delete(globalStore.SessionRuns, id)
	// remove any clientActive pointing to this session
	for k, v := range globalStore.ClientActive {
		if v == id {
			delete(globalStore.ClientActive, k)
		}
	}
}

// getRunResult retrieves cached result for a runID, returns nil if not found
func getRunResult(runID string) (*types.Judge0GetResp, bool) {
	globalStore.Mu.Lock()
	defer globalStore.Mu.Unlock()
	result, ok := globalStore.RunResults[runID]
	return result, ok
}

// setRunResult stores the result for a runID to avoid duplicate Judge0 calls
func setRunResult(runID string, result *types.Judge0GetResp) {
	globalStore.Mu.Lock()
	defer globalStore.Mu.Unlock()
	globalStore.RunResults[runID] = result
}

func addListener(runID string) types.SSEListener {
	ch := make(types.SSEListener, 1)
	globalStore.Mu.Lock()
	globalStore.RunListeners[runID] = append(globalStore.RunListeners[runID], ch)
	globalStore.Mu.Unlock()
	return ch
}

func publish(runID string, payload []byte) {
	globalStore.Mu.Lock()
	listeners := globalStore.RunListeners[runID]
	delete(globalStore.RunListeners, runID)
	globalStore.Mu.Unlock()
	for _, l := range listeners {
		select {
		case l <- payload:
		default:
		}
		close(l)
	}
}

func appendRun(sessionID string, rr types.RunResult) {
	globalStore.Mu.Lock()
	globalStore.SessionRuns[sessionID] = append(globalStore.SessionRuns[sessionID], rr)
	globalStore.Mu.Unlock()
}

func getRuns(sessionID string) []types.RunResult {
	globalStore.Mu.Lock()
	defer globalStore.Mu.Unlock()
	return append([]types.RunResult(nil), globalStore.SessionRuns[sessionID]...)
}
