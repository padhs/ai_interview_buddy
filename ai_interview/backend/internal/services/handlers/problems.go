package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/padhs/ai_interview_buddy/backend/internal/data"
	"github.com/padhs/ai_interview_buddy/backend/internal/types"
	"github.com/padhs/ai_interview_buddy/backend/internal/utils"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ProblemHandler struct {
	repo *data.ProblemsRepo
}

func NewProblemHandler(pool *pgxpool.Pool) *ProblemHandler {
	return &ProblemHandler{
		repo: data.NewProblemsRepo(pool),
	}
}

// GET /api/v1/problemslimit=&offset=&difficulty=&tag=&q=
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
		Items:      items,
		Page:       page,
		PageSize:   pageSize,
		Total:      total,
		StatusCode: http.StatusOK,
	}
	utils.WriteJSON(w, http.StatusOK, resp)
}
