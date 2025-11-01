package vision

import (
	"bytes"
	"context"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/google/generative-ai-go/genai"
	"github.com/padhs/ai_interview_buddy/backend/internal/types"
	"google.golang.org/api/option"
)

//go:embed prompt.text
var promptTemplate string

var (
	maxImageBytes = 1 * 1024 * 1024 // 1MB --> guardrail against abuse
)

func ObserveHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req types.ObserveRequet
	if err := json.NewDecoder(io.LimitReader(r.Body, 2<<20)).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.InterviewID == "" || req.Screenshot.Data == "" || req.Screenshot.Mime == "" {
		http.Error(w, "missing required field(s)", http.StatusBadRequest)
		return
	}

	// basic rate/dupe controls (MVP: trust client diffHash)
	// if req.UIState != nil && req.UIState.DiffHash == "" {
	// 	// optinoal: reject empty hashes to force client-side dedupe
	// }

	// decode base64 image data
	imgBytes, err := base64.StdEncoding.DecodeString(req.Screenshot.Data)
	if err != nil || len(imgBytes) == 0 || len(imgBytes) > maxImageBytes {
		http.Error(w, "invalid screenshot data", http.StatusBadRequest)
		return
	}

	displayText, reason, err := callGeminiInterviewer(ctx, imgBytes, req.Screenshot.Mime, req.UIState)
	if err != nil {
		http.Error(w, "llm_error: "+err.Error(), http.StatusBadGateway)
		return
	}

	audioB64, err := synthesizeSpeech(ctx, displayText)
	if err != nil {
		http.Error(w, "tts_error: "+err.Error(), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(types.ObserveResponse{
		DisplayText: displayText,
		AudioB64:    audioB64,
		Reasoning:   reason,
		StatusCode:  http.StatusOK,
		Message:     "success",
	})
}

func callGeminiInterviewer(
	ctx context.Context,
	img []byte,
	mime string,
	ui *types.ObserveUIState,
) (string, string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")

	if apiKey == "" {
		return "", "", errors.New("missing GEMINI_API_KEY")
	}

	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return "", "", err
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-2.5-flash")

	// build prompt from embedded template
	uiJSON, _ := json.Marshal(ui)
	sys := promptTemplate

	// system instruction
	model.SystemInstruction = &genai.Content{Parts: []genai.Part{genai.Text(sys)}}

	// user content: image + ui json
	resp, err := model.GenerateContent(ctx,
		&genai.Blob{MIMEType: mime, Data: img},
		genai.Text("UI_STATE_JSON:\n"+string(uiJSON)),
	)
	if err != nil || len(resp.Candidates) == 0 {
		return "", "", err
	}

	// parse the JSON response (best-effort)
	var txt string
	for _, part := range resp.Candidates[0].Content.Parts {
		if t, ok := part.(genai.Text); ok {
			txt += string(t)
		}
	}
	var parsed types.GeminiInterviewerResponse

	_ = json.Unmarshal([]byte(txt), &parsed)
	if parsed.Say == "" {
		parsed.Say = "Could you walk me through your current approach and constraints that you are considering ?"
	}
	return parsed.Say, parsed.Why, nil
}

func synthesizeSpeech(ctx context.Context, text string) (string, error) {
	apiKey := os.Getenv("ELEVENLABS_API_KEY")
	voiceID := strings.TrimSpace(os.Getenv("ELEVENLABS_VOICE_ID"))
	if voiceID == "" {
		voiceID = "Eric" // default
	}

	if apiKey == "" {
		return "", errors.New("missing ELEVENLABS_API_KEY")
	}

	// Log voice ID being used for debugging (remove in production if needed)
	// fmt.Printf("[DEBUG] Using ElevenLabs voice ID: %s\n", voiceID)

	body := map[string]interface{}{
		"model_id": "eleven_multilingual_v2",
		"text":     text,
		"voice_settings": map[string]interface{}{
			"stability":         0.4,
			"similarity_boost":  0.8,
			"style":             0.5,
			"use_speaker_boost": true,
		},
	}
	jsonBody, _ := json.Marshal(body)

	req, _ := http.NewRequestWithContext(ctx, "POST",
		"https://api.elevenlabs.io/v1/text-to-speech/"+voiceID+"/stream", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("xi-api-key", apiKey)
	req.Header.Set("accept", "audio/mpeg")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", errors.New(fmt.Sprintf("tts_failed: %d - voice_id used: '%s' - %s", resp.StatusCode, voiceID, string(b)))
	}

	audioB64, _ := io.ReadAll(resp.Body)
	return base64.StdEncoding.EncodeToString(audioB64), nil
}
