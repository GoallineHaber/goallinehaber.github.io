import feedparser
import json

rss_url = "https://www.fanatik.com.tr/rss"

feed = feedparser.parse(rss_url)

news = []

for entry in feed.entries[:20]:
    news.append({
        "title": entry.title,
        "link": entry.link,
        "date": entry.published
    })

with open("data/news.json", "w", encoding="utf-8") as f:
    json.dump(news, f, ensure_ascii=False, indent=2)
