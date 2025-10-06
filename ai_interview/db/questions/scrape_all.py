# 🤣 why not scrape all problems from leetcode.ca ->

import requests
import pandas as pd
from bs4 import BeautifulSoup
import time

BASE_URL = "https://leetcode.ca"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; LeetScraper/3.1)"}

def fetch_problem_list():
    """Scrape all problem URLs, IDs, and titles from the main page."""
    res = requests.get(BASE_URL, headers=HEADERS, timeout=10)
    res.raise_for_status()

    soup = BeautifulSoup(res.text, "html.parser")

    # Find the main container
    posts_div = soup.find("div", class_="posts-list")
    if not posts_div:
        raise Exception("❌ Couldn't find <div class='posts-list'> on homepage")

    articles = posts_div.find_all("article")
    if len(articles) <= 1:
        raise Exception("⚠️ No problem articles found")

    problems = []
    # Skip the first <article>
    for art in articles[1:]:
        a_tag = art.find("a", href=True)
        h2_tag = art.find("h2", class_="post-title")

        if not a_tag or not h2_tag:
            continue

        href = a_tag["href"]
        if not href.startswith("http"):
            href = BASE_URL + href

        # Extract id and title
        title_text = h2_tag.get_text(strip=True)
        if '.' in title_text:
            pid, title = title_text.split('.', 1)
            pid = pid.strip()
            title = title.strip()
        else:
            pid, title = None, title_text.strip()

        problems.append({
            "id": pid,
            "title": title,
            "url": href
        })

    print(f"🔍 Found {len(problems)} problems on {BASE_URL}")
    return problems


def fetch_problem_description(url):
    """Fetch the description section between first and second <h2> in problem page."""
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        res.raise_for_status()
    except Exception as e:
        print(f"❌ Failed to fetch {url}: {e}")
        return None

    soup = BeautifulSoup(res.text, "html.parser")
    article = soup.find("article")
    if not article:
        print(f"⚠️ No <article> found for {url}")
        return None

    # Extract content between first and second <h2>
    h2_tags = article.find_all("h2")
    if not h2_tags:
        print(f"⚠️ No <h2> tags found in {url}")
        return None

    first_h2 = h2_tags[0]
    content_parts = []
    for sibling in first_h2.find_next_siblings():
        if sibling.name == "h2":
            break
        content_parts.append(sibling.get_text(" ", strip=True))

    description = "\n".join(content_parts).strip()
    return description or None


def main():
    problems = fetch_problem_list()
    results = []

    counter = 3665

    for i, prob in enumerate(problems, start=1):
        if counter < 1790:
            break
        else:
            print(f"📘 [{i}/{len(problems)}] Fetching: {prob['id']}. {prob['title']}")
        desc = fetch_problem_description(prob["url"])
        results.append({
            "id": prob["id"],
            "title": prob["title"],
            "url": prob["url"],
            "description": desc or ""
        })
        counter -= 1
        time.sleep(3)  # polite delay between requests

    # Save to CSV
    df = pd.DataFrame(results)
    df.to_csv("leetcode_all_problems.csv", index=False)
    print(f"🎉 Saved {len(results)} problems to leetcode_all_problems.csv")


if __name__ == "__main__":
    main()
