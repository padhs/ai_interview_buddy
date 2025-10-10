package utils

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/padhs/ai_interview_buddy/backend/internal/types"
)

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func HTTPError(w http.ResponseWriter, status int, msg string) {
	WriteJSON(w, status, types.ErrorResponse{
		Error:      msg,
		StatusCode: status,
	})
}

func ParseLimitOffsetPage(r *http.Request, defaultLimit, maxLimit int) (limit, offset, page, pageSize int, err error) {
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit = defaultLimit
	if limitStr != "" {
		n, e := strconv.Atoi(limitStr)
		if e != nil || n <= 0 {
			return 0, 0, 0, 0, errors.New("invalid Limit")
		}
		if n > maxLimit {
			n = maxLimit
		}
		limit = n
	}
	offset = 0
	if offsetStr != "" {
		n, e := strconv.Atoi(offsetStr)
		if e != nil || n < 0 {
			return 0, 0, 0, 0, errors.New("invalid offset")
		}
		offset = n
	}
	page = (offset / limit) + 1
	return limit, offset, page, limit, nil
}
