// Centralized TypeScript type definitions

// ---------------- Problem types ----------------
// GET /api/v1/problems                       -> all problems list paginated response
export interface ProblemListItem {
    id: number;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    url: string;
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
    description: SqlString;
}

// Parsed problem structure
export interface ParsedProblem {
    id: number;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    description: string;
    examples: Array<{
        input: string;
        output: string;
        explanation?: string;
    }>;
    constraints: string[];
    followUp?: string;
}

// ---------------- Session types ----------------
export interface Session {
    sessionId: string;
    expiresAt: number; // epoch ms
    runCount: number;
}

export interface SessionCtx {
    session: Session | null;
    clientKey: string | null;
    setSession: (s: Session) => void;
    incrementRunCount: () => void;
    resetSession: () => void;
    endSession: () => void;
}

// ---------------- Stats types ----------------
export interface SessionStats {
    sessionId: string;
    totalRuns: number;
    finalStatus: string;
    perRun: { status: string; time?: string; memory?: number }[];
    remarks?: string;
}

// ---------------- Component props types ----------------
export interface VoiceAIWidgetProps {
    problemId?: number;
    language?: string;
    lastRunStatus?: string;
}

export interface CodeEditorPaneProps {
    onRun?: (lang: string, code: string) => Promise<void> | void;
    onSubmit?: (lang: string, code: string) => Promise<void> | void;
    onFinish?: (lang: string, code: string) => Promise<void> | void;
    onLanguageChange?: (lang: string) => void;
    runDisabled?: boolean;
    submitDisabled?: boolean;
    runLabel?: string;
    showFinish?: boolean;
}

