# run this script to clean the data ->
import pandas as pd
import re

# Load the CSV
in_path = "ai_interview/db/questions/leetcode_problems_merged.csv"
df = pd.read_csv(in_path)

# --- Helper: Fix malformed exponents ---
def fix_constraint_exponents(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = re.sub(r"\b-10([0-9])\b", r"-10^\1", text)
    text = re.sub(r"\b10([0-9])\b", r"10^\1", text)
    return text

# Regex patterns
re_examples_label = re.compile(r"\bexamples?\s*:", re.I)
re_example_n_label = re.compile(r"\bexample\s*\d+\s*:", re.I)
re_constraints_label = re.compile(r"\bconstraints?\s*:", re.I)
re_followup_label = re.compile(r"\bfollow[-\s]*up\s*:", re.I)

def find_first(pattern, s):
    m = pattern.search(s)
    return m.start() if m else None

# --- Main parser ---
def parse_description(desc: str):
    if not isinstance(desc, str) or not desc.strip():
        return "", "", "", ""

    s = desc.lower()
    ex1 = find_first(re_examples_label, s)
    ex2 = find_first(re_example_n_label, s)
    ex_start_candidates = [x for x in [ex1, ex2] if x is not None]
    ex_start = min(ex_start_candidates) if ex_start_candidates else None

    cons_start = find_first(re_constraints_label, s)
    fol_start  = find_first(re_followup_label, s)
    n = len(s)

    # Question
    first_starts = [p for p in [ex_start, cons_start, fol_start] if p is not None]
    q_end = min(first_starts) if first_starts else n
    question = s[:q_end].strip()

    # Examples
    if ex_start is not None:
        ex_end_candidates = [p for p in [cons_start, fol_start] if p is not None and p > ex_start]
        ex_end = min(ex_end_candidates) if ex_end_candidates else n
        examples = s[ex_start:ex_end].strip()
    else:
        examples = ""

    # Constraints
    if cons_start is not None:
        cons_end = fol_start if (fol_start is not None and fol_start > cons_start) else n
        constraints = s[cons_start:cons_end].strip()
    else:
        constraints = ""

    # Follow-up
    if fol_start is not None:
        follow_up = s[fol_start:].strip()
    else:
        follow_up = ""

    # Strip labels
    if examples:
        examples = re.sub(r"^\s*(examples?\s*:|example\s*\d+\s*:)\s*", "", examples, flags=re.I)
    if constraints:
        constraints = re.sub(r"^\s*constraints?\s*:\s*", "", constraints, flags=re.I)
    if follow_up:
        follow_up = re.sub(r"^\s*follow[-\s]*up\s*:\s*", "", follow_up, flags=re.I)

    constraints = fix_constraint_exponents(constraints)

    normalize_space = lambda t: re.sub(r"\s+", " ", t).strip()
    return (
        normalize_space(question),
        normalize_space(examples),
        normalize_space(constraints),
        normalize_space(follow_up),
    )

# Apply parsing
parsed_cols = df["description"].apply(parse_description).apply(pd.Series)
parsed_cols.columns = ["question", "examples", "constraints", "follow_up"]

# Merge with original
df_out = pd.concat([df, parsed_cols], axis=1)

# Replace nulls with empty string in *all* columns
df_out = df_out.fillna("")

# Drop unwanted columns
drop_cols = [
    "is_premium", "solution_link", "acceptance_rate", "frequency", 
    "discuss_count", "accepted", "submissions", "rating", "dislikes", "asked_by_faang"
]
df_out = df_out.drop(columns=[c for c in drop_cols if c in df_out.columns])

# Drop duplicates
if "id" in df_out.columns:
    df_out = df_out.drop_duplicates(subset=["id"]).reset_index(drop=True)

# Save cleaned CSV
out_path = "ai_interview/db/questions/leetcode_dataset_cleaned_split_null_handled_removed_cols_v2.csv"
df_out.to_csv(out_path, index=False)

print("✅ Saved cleaned & split dataset to:", out_path)
