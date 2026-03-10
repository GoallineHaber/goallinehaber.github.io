import feedparser
import json

rss_url = "https://www.fanatik.com.tr/rss"
feed = feedparser.parse(rss_url)

news = {
    "futbol": [],
    "basketbol": [],
    "voleybol": [],
    "diger": []
}

for entry in feed.entries:
    title_lower = entry.title.lower()
    item = {
        "title": entry.title,
        "link": entry.link,
        "date": entry.published
    }
    if "futbol" in title_lower or "galatasaray" in title_lower or "beşiktaş" in title_lower or "fenerbahçe" in title_lower:
        news["futbol"].append(item)
    elif "basketbol" in title_lower or "nba" in title_lower:
        news["basketbol"].append(item)
    elif "voleybol" in title_lower:
        news["voleybol"].append(item)
    else:
        news["diger"].append(item)

with open("data/news.json", "w", encoding="utf-8") as f:
    json.dump(news, f, ensure_ascii=False, indent=2)
