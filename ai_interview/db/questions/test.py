# Test the cleaned file ->
import pandas as pd

# load cleaned file ->
file_path = "ai_interview/db/questions/leetcode_dataset_cleaned_split_null_handled_removed_cols.csv"
df = pd.read_csv(file_path)

# print description ->
print(df["description"][0])

# print question ->
print(df["question"][0])

# print examples ->
print(df["examples"][0])

# print constraints ->
print(df["constraints"][0])

# print follow_up ->
print(df["follow_up"][0])

print(df['description'][1])