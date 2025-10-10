package types

type ProblemItem struct {
	ID         int64  `json:"id"`
	Title      string `json:"title"`
	Difficulty string `json:"difficulty"`
	URL        string `json:"url"`
}

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
