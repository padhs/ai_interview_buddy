package handlers

import (
	"net/http"

	"github.com/padhs/ai_interview_buddy/backend/internal/utils"
)

func Healthz(w http.ResponseWriter, r *http.Request) {
	utils.WriteJSON(w, http.StatusOK, map[string]string{"staus": "ok"})
}
