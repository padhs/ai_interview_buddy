# Run this script first before running data_cleaning.py
import requests
import pandas as pd
from bs4 import BeautifulSoup
import time

# load the csv file ->
df = pd.read_csv("ai_interview/db/questions/leetcode_problems.csv")

# Filter rows with 'SQL Schema' in the df['description] ->

mask = df["description"].str.strip().eq("SQL Schema")
sql_rows = df[mask]
print(f"Found {len(sql_rows)} problems with 'SQL Schema' in the description")

headers = {"User-Agent": "Mozilla/5.0 (compatible; LeetScraper/1.0)"}

def get_problem_details(problem_id):
    # fetch the problem details from leetcode.ca ->

    base_url = f"https://leetcode.ca/all/{problem_id}.html"
    
    try:
        res = requests.get(base_url, headers=headers, timeout=10)
        res.raise_for_status()

    except Exception as e:
        print(f"🥺 Error fetching problem:{problem_id} from {base_url}: {e}")
        return None
    
    soup = BeautifulSoup(res.text, "html.parser")
    # find the <div> tag that contains the <h3> and the <a> tag ->
    
    # Find all <a> tags
    all_links = soup.find_all("a", href=True)
    if len(all_links) < 2:
        print(f"⚠️ Not enough <a> tags found for {problem_id}")
        return None

    # The second last <a> tag corresponds to "Problem Solution"
    target_link = all_links[-2]
    href = target_link["href"].strip()
    if not href.startswith("http"):
        href = "https://leetcode.ca" + href

    # visit the actual problem page ->
    try:
        prob_page = requests.get(href, headers=headers, timeout=10)
        prob_page.raise_for_status()
    except Exception as e:
        print(f"❌ Failed to fetch problem page {href}: {e}")
        return None

    psoup = BeautifulSoup(prob_page.text, "html.parser")
    article = psoup.find("article")
    if not article:
        print(f"⚠️ No <article> found for {href}")
        return None

    # ✅ Find all h2 tags inside the article
    h2_tags = article.find_all("h2")
    if not h2_tags:
        print(f"⚠️ No <h2> tags found in {href}")
        return None

    # Get the first h2 tag and all elements until the next h2
    first_h2 = h2_tags[0]
    content_parts = []
    for sibling in first_h2.find_next_siblings():
        if sibling.name == "h2":  # stop at next h2
            break
        content_parts.append(sibling.get_text(" ", strip=True))

    text = "\n".join(content_parts).strip()
    return text or None

# iterate and scrape missing descriptions ->
for idx, row in sql_rows.iterrows():
    problem_id = int(row['id'])
    desc = get_problem_details(problem_id)
    if desc:
        df.at[idx, 'description'] = desc
        print(f"✅ Scraped description for problem:{problem_id}")
    else:
        print(f"💀: Skipped {problem_id} Failed to scrape description for problem:{problem_id}")
    time.sleep(3) # add a delay to avoid overwhelming the server

# save the updated dataframe ->
out_path = "ai_interview/db/questions/leetcode_problems_with_descriptions.csv"
df.to_csv(out_path, index=False)
print(f"💯 Saved updated dataframe to {out_path} Done. 👍")


#Let's test this for Two Sum since we already have the desc. 

# problem_id_to_test = 1
# test_result = get_problem_details(problem_id_to_test)
# print(test_result) # Let's see if we get the correct description