package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/generative-ai-go/genai"
	"github.com/padhs/ai_interview_buddy/backend/internal/types"
	"google.golang.org/api/option"
)

// GET /api/v1/stats/session/{id}
func GetSessionStats(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "missing id", http.StatusBadRequest)
		return
	}
	sess, ok := getSession(id)
	if !ok {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	runs := getRuns(id)
	finalStatus := ""
	if len(runs) > 0 {
		finalStatus = runs[len(runs)-1].Status
	}

	// Generate interview remarks from Gemini
	remarks := generateInterviewRemarks(r.Context(), sess, runs)

	out := types.SessionStatsResponse{
		SessionID:   sess.ID,
		TotalRuns:   sess.RunCount,
		FinalStatus: finalStatus,
		PerRun:      runs,
		Remarks:     remarks,
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

func generateInterviewRemarks(ctx context.Context, sess *types.SessionInfo, runs []types.RunResult) string {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return ""
	}

	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return ""
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-2.5-flash")

	// Build summary of the interview session
	var summary strings.Builder
	summary.WriteString("Interview Session Summary:\n")
	summary.WriteString(fmt.Sprintf("- Total Runs: %d\n", sess.RunCount))
	summary.WriteString(fmt.Sprintf("- Session Duration: %v\n", sess.ExpiresAt.Sub(sess.CreatedAt)))
	summary.WriteString(fmt.Sprintf("- Final Status: %s\n\n", func() string {
		if len(runs) > 0 {
			return runs[len(runs)-1].Status
		}
		return "No runs completed"
	}()))

	summary.WriteString("Code Execution Results:\n")
	for i, run := range runs {
		summary.WriteString(fmt.Sprintf("Run %d: Status=%s", run.Run, run.Status))
		if run.Time != nil {
			summary.WriteString(fmt.Sprintf(", Time=%s", *run.Time))
		}
		if run.Memory != nil {
			summary.WriteString(fmt.Sprintf(", Memory=%d KB", *run.Memory))
		}
		summary.WriteString("\n")
		if i < len(runs)-1 {
			summary.WriteString("\n")
		}
	}

	prompt := fmt.Sprintf(`You are an AI Interviewer reviewing a coding interview session. 
Provide a concise, professional assessment (2-3 paragraphs) covering:
1. Overall performance and approach
2. Technical strengths and areas for improvement
3. Final recommendation

Session Summary:
%s

Provide your assessment:`, summary.String())

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil || len(resp.Candidates) == 0 {
		return ""
	}

	var remarks string
	for _, part := range resp.Candidates[0].Content.Parts {
		if t, ok := part.(genai.Text); ok {
			remarks += string(t)
		}
	}

	return strings.TrimSpace(remarks)
}
