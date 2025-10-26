// type interfaces for frontend

// GET /api/v1/problems                       -> all problems list paginated response
export interface ProblemListItem {
    id: number;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    url: string

}

export interface ProblemListResponse {
    item: ProblemListItem[];
    page: number;
    page_size: number;
    status_code: number;
}

// GET /api/v1/problems/{id}                   -> problem details response by id
export interface SqlString {
    String: string;
    Valid: boolean;
}

export interface SqlInt64 {
    Int64: number;
    Valid: boolean;
}

export interface ProblemDetailsResponse {
    status_code: number;
    id: number;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    url: string;
    description: SqlString;
    question: SqlString;
    examples: SqlString;
    constraints: SqlString;
    follow_up: SqlString;
    likes: SqlInt64;
}


// GET /api/v1/problems/random                  -> random problem response
export interface RandomProblemResponse {
    status_code: number;
    id: number;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    description: SqlString
}

