import feedparser
import json

rss_url = "https://www.fanatik.com.tr/rss/spor"

feed = feedparser.parse(rss_url)

news = []

for entry in feed.entries:
    news.append({
        "title": entry.get("title",""),
        "link": entry.get("link",""),
        "date": entry.get("published","")
    })

with open("data/news.json","w",encoding="utf-8") as f:
    json.dump(news,f,ensure_ascii=False,indent=2)
