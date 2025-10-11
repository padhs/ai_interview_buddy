package types

import (
	"database/sql"
	"encoding/json"
	"fmt"
)

type Difficulty string

const (
	DifficultyEasy Difficulty = "easy"
	DifficultyMedium Difficulty = "medium"
	DifficultyHard Difficulty = "hard"
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
	StatusCode  int					`json:"status_code"`
	ID         	int  				`json:"id" db:"id"`
	Title      	string 				`json:"title" db:"title"`
	Difficulty 	Difficulty 			`json:"difficulty" db:"difficulty"`
	URL        	string 				`json:"url" db:"url"`
	Description sql.NullString 		`json:"description" db:"description"`
	Question    sql.NullString 		`json:"question" db:"question"`
	Examples    sql.NullString 		`json:"examples" db:"examples"`
	Constraints sql.NullString 		`json:"constraints" db:"constraints"`
	FollowUp    sql.NullString 		`json:"follow_up" db:"follow_up"`
	Likes       sql.NullInt64 		`json:"likes" db:"likes"`
}

//GET /api/v1/problems/random?difficulty={medium}&tags={BinaryTree}
type RandomProblem struct {
	StatusCode		int					`json:"status_code"`
	ID				int					`json:"id" db:"id"`
	Title			string				`json:"title" db:"title"`
	Difficulty		Difficulty			`json:"difficulty" db:"difficulty"`
	Description		sql.NullString 		`json:"description" db:"description"`
}

