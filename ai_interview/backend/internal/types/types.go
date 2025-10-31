package types

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

type Difficulty string

const (
	DifficultyEasy   Difficulty = "easy"
	DifficultyMedium Difficulty = "medium"
	DifficultyHard   Difficulty = "hard"
)

// implement encoding.TextMarshaler (TextMarshaler for json + pgx support)
func (d Difficulty) MarshalText() ([]byte, error) {
	return []byte(d), nil
}

func (d *Difficulty) UnmarshalText(text []byte) error {
	switch v := string(text); v {
	case "easy", "medium", "hard":
		*d = Difficulty(v)
		return nil
	default:
		return fmt.Errorf("invalid difficulty: %s", v)
	}
}

// JSON marshalling explicitly (pgx handles text natively)
func (d Difficulty) MarshalJSON() ([]byte, error) {
	return json.Marshal(string(d))
}

func (d *Difficulty) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	return d.UnmarshalText([]byte(s))
}

// GET /api/v1/problems
type ProblemItem struct {
	ID         int64  `json:"id"`
	Title      string `json:"title"`
	Difficulty string `json:"difficulty"`
	URL        string `json:"url"`
}

// GET /api/v1/problems
type ProblemsResponse struct {
	Items      []ProblemItem `json:"items"`
	Page       int           `json:"page"`
	PageSize   int           `json:"page_size"`
	Total      int64         `json:"total"`
	StatusCode int           `json:"status_code"`
}

type ErrorResponse struct {
	Error      string `json:"error"`
	StatusCode int    `json:"status_code"`
}

// GET /api/v1/problems/{id}
type ProblemDetails struct {
	StatusCode  int            `json:"status_code"`
	ID          int            `json:"id" db:"id"`
	Title       string         `json:"title" db:"title"`
	Difficulty  Difficulty     `json:"difficulty" db:"difficulty"`
	URL         string         `json:"url" db:"url"`
	Description sql.NullString `json:"description" db:"description"`
	Question    sql.NullString `json:"question" db:"question"`
	Examples    sql.NullString `json:"examples" db:"examples"`
	Constraints sql.NullString `json:"constraints" db:"constraints"`
	FollowUp    sql.NullString `json:"follow_up" db:"follow_up"`
	Likes       sql.NullInt64  `json:"likes" db:"likes"`
}

// GET /api/v1/problems/random?difficulty={medium}&tags={BinaryTree}
type RandomProblem struct {
	StatusCode  int            `json:"status_code"`
	ID          int            `json:"id" db:"id"`
	Title       string         `json:"title" db:"title"`
	Difficulty  Difficulty     `json:"difficulty" db:"difficulty"`
	Description sql.NullString `json:"description" db:"description"`
}

// ---------------- monaco editor ---------------- (app layer -> judge0 layer)
// POST /api/v1/execute

// request from monaco editor (client -> server)
type ExecuteRequest struct {
	LanguageID int    `json:"language_id"`
	SourceCode string `json:"source_code"`
	Stdin      string `json:"stdin"`
	ProblemID  int    `json:"problem_id"`
}

// response from monaco editor (server -> client)
type ExecuteResponse struct {
	RunID      string `json:"runID"`
	Status     string `json:"status"`
	StatusCode int    `json:"status_code"`
}

// judge0 submission payload (client -> judge0)
// type Judge0SubmissionPayload struct {
// 	LanguageID int `json:"language_id"`
// 	SourceCode string `json:"source_code"`
// 	Stdin string `json:"stdin"`
// }

// judge0 code execution result (judge0 -> backend)
type Judge0CodeExecutionResult struct {
	Status  string `json:"status"`           // e.g., "In Queue", "Processing", "Accepted", etc.
	Time    string `json:"time,omitempty"`   // seconds as string per Judge0
	Memory  int    `json:"memory,omitempty"` // kilobytes
	Stdout  string `json:"stdout,omitempty"`
	Stderr  string `json:"stderr,omitempty"`
	Compile string `json:"compile_output,omitempty"`
	// TestcaseResults can be added later if you run multiple testcases server-side.
	// TestcaseResults []TestcaseResult `json:"testcaseResults,omitempty"`
}

// subset of judge0 fields to return to client
type Judge0GetResp struct {
	Stdout        *string `json:"stdout"`
	Stderr        *string `json:"stderr"`
	CompileOutput *string `json:"compile_output"`
	Time          *string `json:"time"`
	Memory        *int    `json:"memory"`
	Status        struct {
		ID          int    `json:"id"`
		Description string `json:"description"`
	} `json:"status"`
}

// ---------------- vision ---------------- (app layer -> vision layer)
// POST /api/v1/vision/observe
type ObserveRequet struct {
	InterviewID string `json:"interview_id"`
	SessionID   string `json:"session_id"`
	Screenshot  struct {
		Mime string `json:"mime"`
		Data string `json:"data"`
	} `json:"screenshot"`
	UIState *ObserveUIState `json:"ui_state,omitempty"`
}

// UI state structure used in vision observation
type ObserveUIState struct {
	SessionID        string `json:"session_id"`
	ProblemID        int    `json:"problem_id"`
	Language         string `json:"language"`
	LastRunStatus    string `json:"last_run_status"`
	FailingTestCases []int  `json:"failing_test_cases"`
	DiffHash         string `json:"diff_hash"`
}

// Gemini response structure
type GeminiInterviewerResponse struct {
	Say string `json:"say"`
	Why string `json:"why"`
}

// response from vision layer (vision layer -> app layer)
type ObserveResponse struct {
	StatusCode  int    `json:"status_code"`
	Message     string `json:"message"`
	DisplayText string `json:"display_text"`
	Reasoning   string `json:"reason"`
	AudioB64    string `json:"audio_b64"`
}

// ---------------- voice ---------------- (app layer -> voice layer)
// POST /api/v1/voice/ingest
type VoiceIngestResponse struct {
	Transcript string `json:"transcript"`
}

// POST /api/v1/voice/tts
type VoiceTTSRequest struct {
	Text    string `json:"text"`
	VoiceID string `json:"voiceId"`
	ModelID string `json:"modelId"`
}

// ---------------- session management ---------------- (internal store types)
type SessionStatus string

const (
	SessionActive SessionStatus = "active"
	SessionEnded  SessionStatus = "ended"
)

type SessionInfo struct {
	ID        string
	CreatedAt time.Time
	ExpiresAt time.Time
	RunCount  int
	Status    SessionStatus
}

type RunResult struct {
	Run      int
	Status   string
	Time     *string
	Memory   *int
	Stdout   *string
	Stderr   *string
	PassRate *string
}

// GET /api/v1/stats/session/{id} response
type SessionStatsResponse struct {
	SessionID   string      `json:"sessionId"`
	TotalRuns   int         `json:"totalRuns"`
	FinalStatus string      `json:"finalStatus"`
	PerRun      []RunResult `json:"perRun"`
	Remarks     string      `json:"remarks,omitempty"`
}

// SSE listener is a one-shot channel closed after single event
type SSEListener chan []byte

// Store manages session and execution state
type Store struct {
	Mu           sync.Mutex
	Sessions     map[string]*SessionInfo
	RunListeners map[string][]SSEListener  // runID -> listeners
	SessionRuns  map[string][]RunResult    // sessionID -> runs
	ClientActive map[string]string         // clientKey -> sessionID
	RunResults   map[string]*Judge0GetResp // runID -> cached result (to avoid duplicate Judge0 calls)
}
