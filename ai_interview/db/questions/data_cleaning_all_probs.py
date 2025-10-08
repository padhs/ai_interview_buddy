import pandas as pd
import re

# Load the scraped dataset
df = pd.read_csv("ai_interview/db/questions/leetcode_all_problems.csv")

# Fill NaN with empty strings
df = df.fillna("")

# --- Clean & Extract Columns ---

# 1️⃣ Extract numeric id from title (e.g. "3665 - Twisted Mirror Path count" → 3665)
df["id"] = df["title"].str.extract(r"^(\d+)")

# 2️⃣ Clean title by removing leading id and dash
df["title"] = df["title"].str.replace(r"^\d+\s*[-–]\s*", "", regex=True).str.strip()

# 3️⃣ Normalize description text
df["description"] = df["description"].str.replace(r"\s+", " ", regex=True).str.strip()

# 4️⃣ Clean URLs
df["url"] = df["url"].str.strip().str.replace(r"/+$", "", regex=True)

# 5️⃣ Convert id to integer (nullable Int64 type)
df["id"] = pd.to_numeric(df["id"], errors="coerce").astype("Int64")

# 6️⃣ Drop unnamed or empty columns
df = df.loc[:, ~df.columns.str.contains("^Unnamed")]

# 7️⃣ Reorder columns so that url comes *after description*
cols = ["id", "title", "description", "url"]
other_cols = [c for c in df.columns if c not in cols]
df = df[cols + other_cols]

# 8️⃣ Sort in ascending order of id
df = df.sort_values(by="id", ascending=True, na_position="last").reset_index(drop=True)

# --- Save the cleaned version ---
df.to_csv("ai_interview/db/questions/leetcode_all_problems_cleaned.csv", index=False)
print("✅ Cleaned dataset saved as leetcode_all_problems_cleaned.csv")
