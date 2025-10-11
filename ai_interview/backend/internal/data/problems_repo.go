package data

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/padhs/ai_interview_buddy/backend/internal/types"
)

// ---------------- types ----------------

type ProblemsRepo struct {
	pool *pgxpool.Pool
}

// ---------------- function prototypes (constructors) ----------------

func NewProblemsRepo(pool *pgxpool.Pool) *ProblemsRepo {
	return &ProblemsRepo{pool: pool}
}

// ---------------- handlers ----------------

// GET /api/v1/problems?limit=&offset=&difficulty=&tag=&q=
func (r *ProblemsRepo) List(ctx context.Context, q, difficulty, tag string, limit, offset, page, pageSize int) ([]types.ProblemItem, error) {
	sql, args := buildProblemsListSQL(q, difficulty, tag, limit, offset)
	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]types.ProblemItem, 0, limit)
	for rows.Next() {
		var it types.ProblemItem
		if err := rows.Scan(
			&it.ID,
			&it.Title,
			&it.Difficulty,
			&it.URL); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

// GET /api/v1/problems?limit=&offset=&difficulty=&tag=&q=
func (r *ProblemsRepo) Count(ctx context.Context, q, difficulty, tag string) (int64, error) {
	sql, args := buildProblemsCountSQL(q, difficulty, tag)
	var total int64
	err := r.pool.QueryRow(ctx, sql, args...).Scan(&total)
	return total, err
}

// --- SQL builders ---

func buildProblemsListSQL(q, difficulty, tag string, limit, offset int) (string, []any) {
	sb := strings.Builder{}
	sb.WriteString(`
SELECT id, title, difficulty, url
FROM problems
`)
	where, args := buildWhere(q, difficulty, tag)
	if where != "" {
		sb.WriteString("WHERE ")
		sb.WriteString(where)
	}
	sb.WriteString("\nORDER BY id\nLIMIT $")
	sb.WriteString(strconv.Itoa(len(args) + 1))
	sb.WriteString(" OFFSET $")
	sb.WriteString(strconv.Itoa(len(args) + 2))
	args = append(args, limit, offset)
	return sb.String(), args
}

func buildProblemsCountSQL(q, difficulty, tag string) (string, []any) {
	sb := strings.Builder{}
	sb.WriteString(`SELECT COUNT(*) FROM problems `)
	where, args := buildWhere(q, difficulty, tag)
	if where != "" {
		sb.WriteString("WHERE ")
		sb.WriteString(where)
	}
	return sb.String(), args
}

func buildWhere(q, difficulty, tag string) (string, []any) {
	clauses := []string{}
	args := []any{}

	if difficulty != "" {
		args = append(args, difficulty)
		clauses = append(clauses, "difficulty = $"+strconv.Itoa(len(args)))
	}
	if tag != "" {
		args = append(args, tag)
		clauses = append(clauses, "$"+strconv.Itoa(len(args))+" = ANY(tags)")
	}
	if q != "" {
		args = append(args, "%"+q+"%")
		p1 := "$" + strconv.Itoa(len(args))
		args = append(args, "%"+q+"%")
		p2 := "$" + strconv.Itoa(len(args))
		clauses = append(clauses, "(title ILIKE "+p1+" OR description ILIKE "+p2+")")
	}
	if len(clauses) == 0 {
		return "", nil
	}
	return strings.Join(clauses, " AND "), args
}

// GET /api/v1/problems/{id}
func (r *ProblemsRepo) GetProblemByID(ctx context.Context, id int) (*types.ProblemDetails, error) {
	const query = `
		SELECT id, title, difficulty, url, description, question, examples, constraints, follow_up, likes
		FROM problems
		WHERE id = $1;
	`
	var problem types.ProblemDetails
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&problem.ID,
		&problem.Title,
		&problem.Difficulty,
		&problem.URL,
		&problem.Description,
		&problem.Question,
		&problem.Examples,
		&problem.Constraints,
		&problem.FollowUp,
		&problem.Likes,
	)
	if err != nil {
		return nil, err
	}

	return &problem, nil
}

// GET /api/v1/problems/random?difficulty={difficulty}&tag={tag}
func (r *ProblemsRepo) GetRandomProblem(ctx context.Context, difficulty *types.Difficulty) (*types.RandomProblem, error) {
	// For now, only filter by difficulty since tags column doesn't exist in problems table
	// TODO: Implement proper tag filtering by joining with problem_topics table
	var query string
	var args []interface{}

	if difficulty != nil && *difficulty != "" {
		query = `
			SELECT id, title, difficulty, description
			FROM problems
			WHERE difficulty = $1::difficulty_enum
			ORDER BY random()
			LIMIT 1;
		`
		args = []interface{}{*difficulty}
	} else {
		query = `
			SELECT id, title, difficulty, description
			FROM problems
			ORDER BY random()
			LIMIT 1;
		`
		args = []interface{}{}
	}

	var problem types.RandomProblem

	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&problem.ID,
		&problem.Title,
		&problem.Difficulty,
		&problem.Description,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("no problem was found for given filter(s)")
		}
		return nil, err
	}

	return &problem, nil
}
