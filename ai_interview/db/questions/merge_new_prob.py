# merge new problems with the old sheet ->
import pandas as pd

# Load both CSVs
existing = pd.read_csv("ai_interview/db/questions/leetcode_problems_with_descriptions.csv")
new = pd.read_csv("ai_interview/db/questions/leetcode_all_problems_cleaned.csv")

# Fill NA values
existing = existing.fillna("")
new = new.fillna("")

# Ensure IDs are numeric
existing["id"] = pd.to_numeric(existing["id"], errors="coerce").astype("Int64")
new["id"] = pd.to_numeric(new["id"], errors="coerce").astype("Int64")

# Filter new problems starting from id >= 1826
new_filtered = new[new["id"] >= 1826].copy()
print(f"🧮 Found {len(new_filtered)} new problems (id >= 1826) to append")

# Keep only columns that exist in both datasets
common_cols = [c for c in new_filtered.columns if c in existing.columns]
new_filtered = new_filtered[common_cols]

# Append new data to existing
merged = pd.concat([existing, new_filtered], ignore_index=True)

# Sort by id
merged = merged.sort_values(by="id", ascending=True, na_position="last").reset_index(drop=True)

# Save final merged dataset
merged.to_csv("ai_interview/db/questions/leetcode_problems_merged.csv", index=False)

print(f"✅ Merged dataset saved as leetcode_problems_merged.csv")
print(f"📈 Total rows after merge: {len(merged)}")
