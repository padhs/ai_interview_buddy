package services

import (
	"net/http"
	"time"

	"github.com/padhs/ai_interview_buddy/backend/internal/services/handlers"
	"github.com/padhs/ai_interview_buddy/backend/internal/services/vision"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
)

func NewRouter(pool *pgxpool.Pool) http.Handler {
	r := chi.NewRouter()

	// CORS middleware
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(10 * time.Second))

	//healthz
	r.Get("/api/v1/healthz", handlers.Healthz)

	//problems?limit=&offset=
	//problems
	//problems?difficulty=
	//problems?tag=
	problems := handlers.NewProblemHandler(pool)
	r.Get("/api/v1/problems", problems.List)

	//problems/random
	//problems/random?difficulty=&tag=
	//problems/random?difficulty=
	//problems/random?tag=
	r.Get("/api/v1/problems/random", handlers.NewGetRandomProblemHandler(pool).GetRandomProblemHandler)

	//problems/{id}
	r.Get("/api/v1/problems/{id}", handlers.NewGetProblemDetailsByIDHandler(pool).GetProblemByIDHandler)

	//---------- judge0 code execution route ------------
	// POST /api/v1/execute
	r.Post("/api/v1/execute", handlers.Judge0CodeExecution)

	// ---------- get code runID route ------------
	// GET /api/v1/execute/{runID}
	r.Get("/api/v1/execute/{runID}", handlers.ExecutedCodeHandler)

	// ---------- SSE events for execution -----------
	// GET /api/v1/execute/{runID}/events
	r.Get("/api/v1/execute/{runID}/events", handlers.ExecutionEvents)

	// ---------- Interview sessions -----------
	// POST /api/v1/interviews
	r.Post("/api/v1/interviews", handlers.CreateInterview)
	// POST /api/v1/interviews/{id}/end
	r.Post("/api/v1/interviews/{id}/end", handlers.EndInterview)
	// DELETE /api/v1/interviews/{id}
	r.Delete("/api/v1/interviews/{id}", handlers.DeleteInterview)

	// ---------- Stats -----------
	// GET /api/v1/stats/session/{id}
	r.Get("/api/v1/stats/session/{id}", handlers.GetSessionStats)

	// ---------- Vision -----------
	// POST /api/v1/vision/observe
	r.Post("/api/v1/vision/observe", vision.ObserveHandler)

	// ---------- Voice -----------
	// POST /api/v1/voice/ingest (Google STT - kept for fallback if needed)
	r.Post("/api/v1/voice/ingest", handlers.VoiceIngest)
	// POST /api/v1/voice/tts (TTS proxy)
	r.Post("/api/v1/voice/tts", handlers.VoiceTTS)
	// POST /api/v1/voice/chat (Audio -> Gemini STT+processing -> ElevenLabs TTS -> audio/mpeg)
	r.Post("/api/v1/voice/chat", handlers.VoiceChat)

	return r
}

func Listen(addr string, h http.Handler) error {
	return http.ListenAndServe(addr, h)
}
