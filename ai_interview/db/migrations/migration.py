
import re
import dotenv
import pandas as pd
from dotenv import dotenv_values
import psycopg2

# load the environment variables ->
config = dotenv_values('ai_interview/.env')

csv_path = config.get('CSV_PATH', 'ai_interview/db/questions/leetcode_dataset_cleaned_split_null_handled_removed_cols.csv')
pg_host = config.get('PG_HOST', 'localhost')
pg_port = config.get('PG_PORT', '5432')
pg_user = config.get('POSTGRES_USER', 'postgres')
pg_password = config.get('POSTGRES_PASSWORD', 'password')
pg_database = config.get('POSTGRES_DB', 'ai_interview')

print("✅ Loaded environment variables.Connecting to db with...")
print(f"Host: {pg_host}")
print(f"Port: {pg_port}")
print(f"User: {pg_user}")
print(f"Password: {pg_password}")
print(f"Database: {pg_database}")


# handlers ->
def norm_str(x):
    if pd.isna(x):
        return '' # null handling

    return str(x).strip()

def to_list_field(s):
    s = norm_str(s)
    if not s:
        return []

    return [p.strip() for p in s.split(',') if p.strip()]

def parse_similar_questions(raw):
    raw = norm_str(raw)
    if not raw:
        return []
    groups = re.findall(r"\[(.*?)\]", raw)
    results = []
    for g in groups:
        parts = [p.strip() for p in g.split(",")]
        if len(parts) >= 2:
            title, url = parts[0], parts[1]
            if url.startswith("/"):
                url = "https://leetcode.com" + url
            results.append((title, url))
    return results

def difficulty_enum(x):
    x = norm_str(x).lower()
    return x if x in ('easy', 'medium', 'hard') else ''

def main():
    df = pd.read_csv(csv_path).fillna('')

    # connect to db ->
    conn = psycopg2.connect(
        host=pg_host,
        port=pg_port,
        user=pg_user,
        password=pg_password,
        database=pg_database
    )
    conn.autocommit = True
    cur = conn.cursor()

    # migrate data ->
    try:
        for _, row in df.iterrows():
            # insert problems ->
            cur.execute(
                # sql clause to insert problems ->
                """
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
                    follow_up=EXCLUDED.follow_up
                """, (
                    int(row["id"]), 
                    norm_str(row["title"]), 
                    difficulty_enum(row["difficulty"]),
                    norm_str(row["url"]), 
                    int(row["likes"]) if str(row["likes"]).isdigit() else 0,
                    norm_str(row["question"]), 
                    norm_str(row["examples"]),
                    norm_str(row["constraints"]), 
                    norm_str(row["follow_up"])
                )
            )

            # companies ->
            for cname in to_list_field(row.get("companies", "")):
                cur.execute("INSERT INTO companies (name) VALUES (%s) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id", (cname,))
                company_id = cur.fetchone()[0]
                cur.execute("INSERT INTO problem_companies (problem_id, company_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (row["id"], company_id))
            
            # topics ->
            for tname in to_list_field(row.get("related_topics", "")):
                cur.execute("INSERT INTO topics (name) VALUES (%s) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id", (tname,))
                topic_id = cur.fetchone()[0]
                cur.execute("INSERT INTO problem_topics (problem_id, topic_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (row["id"], topic_id))

            # similar questions ->
            for stitle, surl in parse_similar_questions(row.get("similar_questions","")):
                cur.execute("INSERT INTO similar_questions (problem_id, sim_title, sim_url) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING",
                            (row["id"], stitle, surl))
            
    
        conn.commit()
        print("✅ Data migrated successfully")

    except Exception as e:
        conn.rollback()
        print(f"☠ Migration failed: {e}")

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
    