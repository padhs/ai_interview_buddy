package handlers

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/padhs/ai_interview_buddy/backend/internal/data"
	"github.com/padhs/ai_interview_buddy/backend/internal/types"
	"github.com/padhs/ai_interview_buddy/backend/internal/utils"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ---------------- types ----------------

type ProblemHandler struct {
	repo *data.ProblemsRepo
}

type GetProblemDetailsByIDHandler struct {
	repo *data.ProblemsRepo
}

type GetRandomProblemHandler struct {
	repo *data.ProblemsRepo
}

// ---------------- function prototypes (constructors) ----------------

func NewProblemHandler(pool *pgxpool.Pool) *ProblemHandler {
	return &ProblemHandler{
		repo: data.NewProblemsRepo(pool),
	}
}

func NewGetProblemDetailsByIDHandler(pool *pgxpool.Pool) *GetProblemDetailsByIDHandler {
	return &GetProblemDetailsByIDHandler{
		repo: data.NewProblemsRepo(pool),
	}
}

func NewGetRandomProblemHandler(pool *pgxpool.Pool) *GetRandomProblemHandler {
	return &GetRandomProblemHandler{
		repo: data.NewProblemsRepo(pool),
	}
}

// ---------------- handlers ----------------

// GET /api/v1/problems?limit=&offset=&difficulty=&tag=&q=
func (h *ProblemHandler) List(w http.ResponseWriter, r *http.Request) {
	limit, offset, page, pageSize, err := utils.ParseLimitOffsetPage(r, 20, 100)
	if err != nil {
		utils.HTTPError(w, http.StatusBadRequest, err.Error())
		return
	}

	query := strings.TrimSpace(r.URL.Query().Get("q"))
	difficulty := strings.TrimSpace(r.URL.Query().Get("difficulty"))
	tag := strings.TrimSpace(r.URL.Query().Get("tag"))

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	total, err := h.repo.Count(ctx, query, difficulty, tag)
	if err != nil {
		utils.HTTPError(w, http.StatusInternalServerError, "count query failed")
		return
	}

	items, err := h.repo.List(ctx, query, difficulty, tag, limit, offset, page, pageSize)
	if err != nil {
		utils.HTTPError(w, http.StatusInternalServerError, "list query failed")
		return
	}
	resp := types.ProblemsResponse{
		StatusCode: http.StatusOK,
		Items:      items,
		Page:       page,
		PageSize:   pageSize,
		Total:      total,
	}
	utils.WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/problems/{id}
func (h *GetProblemDetailsByIDHandler) GetProblemByIDHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "invalid problem id", http.StatusBadRequest)
		return
	}

	problem, err := h.repo.GetProblemByID(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	utils.WriteJSON(w, http.StatusOK, problem)

}

// GET /api/v1/problems/random?difficulty={medium}&tags={BinaryTree}
func (h *GetRandomProblemHandler) GetRandomProblemHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	difficulty := r.URL.Query().Get("difficulty")

	var diffPtr *types.Difficulty

	if difficulty != "" {
		diffPtr = (*types.Difficulty)(&difficulty)
	}

	problem, err := h.repo.GetRandomProblem(ctx, diffPtr)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	utils.WriteJSON(w, http.StatusOK, problem)

}
