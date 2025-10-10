package data

import (
	"context"
	"strconv"
	"strings"

	"github.com/padhs/ai_interview_buddy/backend/internal/types"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ProblemsRepo struct {
	pool *pgxpool.Pool
}

func NewProblemsRepo(pool *pgxpool.Pool) *ProblemsRepo {
	return &ProblemsRepo{pool: pool}
}

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
		if err := rows.Scan(&it.ID, &it.Title, &it.Difficulty, &it.URL); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

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
