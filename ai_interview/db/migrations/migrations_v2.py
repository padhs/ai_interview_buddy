# run this file to migrate data from csv to postgres db
# Do not run migration.py file

import pandas as pd
import psycopg2
from dotenv import dotenv_values

# --- Load environment variables ---
config = dotenv_values('ai_interview/.env')

csv_path = config.get('CSV_PATH', 'ai_interview/db/questions/leetcode_dataset_cleaned_split_null_handled_removed_cols.csv')
pg_host = config.get('PG_HOST', 'localhost')
pg_port = config.get('PG_PORT', '5432')
pg_user = config.get('POSTGRES_USER', 'postgres')
pg_password = config.get('POSTGRES_PASSWORD', 'password')
pg_database = config.get('POSTGRES_DB', 'ai_interview')

print("✅ Loaded environment variables. Connecting to DB with:")
print(f"Host={pg_host}, Port={pg_port}, User={pg_user}, Database={pg_database}")

# --- Helper functions ---
def norm_str(x):
    if pd.isna(x):
        return ''
    return str(x).strip()

def to_list_field(s):
    s = norm_str(s)
    if not s:
        return []
    return [p.strip() for p in s.split(',') if p.strip()]

def difficulty_enum(x):
    x = norm_str(x).lower()
    return x if x in ('easy', 'medium', 'hard') else 'easy'


def upsert_and_get_id(cur, table, name):
    """Insert or fetch ID safely from a unique name table."""
    name = name.strip()
    if not name:
        return None

    # Insert if not exists
    cur.execute(f"INSERT INTO {table} (name) VALUES (%s) ON CONFLICT DO NOTHING", (name,))
    # Fetch id
    cur.execute(f"SELECT id FROM {table} WHERE name = %s", (name,))
    row = cur.fetchone()
    return row[0] if row else None


def main():
    df = pd.read_csv(csv_path).fillna('')

    conn = psycopg2.connect(
        host=pg_host,
        port=pg_port,
        user=pg_user,
        password=pg_password,
        dbname=pg_database
    )

    cur = conn.cursor()
    inserted = 0

    try:
        for _, row in df.iterrows():
            # --- Insert problem ---
            cur.execute("""
                INSERT INTO problems (id, title, difficulty, url, likes, question, examples, constraints, follow_up, description)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO UPDATE SET
                    title=EXCLUDED.title,
                    difficulty=EXCLUDED.difficulty,
                    url=EXCLUDED.url,
                    likes=EXCLUDED.likes,
                    question=EXCLUDED.question,
                    examples=EXCLUDED.examples,
                    constraints=EXCLUDED.constraints,
                    follow_up=EXCLUDED.follow_up,
                    description=EXCLUDED.description
            """, (
                int(row["id"]),
                norm_str(row["title"]),
                difficulty_enum(row["difficulty"]),
                norm_str(row["url"]),
                int(row["likes"]) if str(row["likes"]).isdigit() else 0,
                norm_str(row["question"]),
                norm_str(row["examples"]),
                norm_str(row["constraints"]),
                norm_str(row["follow_up"]),
                norm_str(row.get("description", "")),
            ))

            # --- Companies ---
            for cname in to_list_field(row.get("companies", "")):
                company_id = upsert_and_get_id(cur, "companies", cname)
                if company_id:
                    cur.execute("""
                        INSERT INTO problem_companies (problem_id, company_id)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING
                    """, (row["id"], company_id))

            # --- Topics ---
            for tname in to_list_field(row.get("related_topics", "")):
                topic_id = upsert_and_get_id(cur, "topics", tname)
                if topic_id:
                    cur.execute("""
                        INSERT INTO problem_topics (problem_id, topic_id)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING
                    """, (row["id"], topic_id))

            inserted += 1
            if inserted % 100 == 0:
                print(f"Inserted {inserted} problems so far...")

        conn.commit()
        print(f"✅ Migration completed. Total problems inserted/updated: {inserted}")

    except Exception as e:
        conn.rollback()
        print(f"💀 Migration failed: {e}")

    finally:
        cur.close()
        conn.close()
        print("🔒 Connection closed.")


if __name__ == "__main__":
    main()
