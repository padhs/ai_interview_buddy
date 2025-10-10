package services

import (
	"net/http"
	"time"

	"github.com/padhs/ai_interview_buddy/backend/internal/services/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

func NewRouter(pool *pgxpool.Pool) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(10 * time.Second))

	//health
	r.Get("/api/v1/healthz", handlers.Healthz)

	//problems
	problems := handlers.NewProblemHandler(pool)
	r.Get("/api/v1/problems", problems.List)

	return r
}

func Listen(addr string, h http.Handler) error {
	return http.ListenAndServe(addr, h)
}
