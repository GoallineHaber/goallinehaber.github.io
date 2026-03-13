import feedparser
import json
from datetime import datetime, timedelta
import os
from urllib.parse import quote

os.makedirs("data", exist_ok=True)

rss_url = "https://www.ahaber.com.tr/rss/spor.xml"
feed = feedparser.parse(rss_url)

try:
    with open("data/news.json", "r", encoding="utf-8") as f:
        news = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    news = {"futbol": [], "basketbol": [], "voleybol": [], "diger": []}

new_items = {"futbol": [], "basketbol": [], "voleybol": [], "diger": []}

for entry in feed.entries:
    title = entry.get("title", "")
    link = quote(entry.get("link", ""))
    
    try:
        date = datetime(*entry.published_parsed[:6]).isoformat()
    except:
        date = datetime.now().isoformat()
    
    image = ""
    if "media_content" in entry:
        image = entry.media_content[0].get("url", "")
    elif "media_thumbnail" in entry:
        image = entry.media_thumbnail[0].get("url", "")

    item = {"title": title, "link": f"haber.html?url={link}", "date": date, "image": image}

    text = (title + " " + entry.get("summary", "")).lower()

    if any(x in text for x in ["galatasaray","fenerbahçe","beşiktaş","trabzonspor","futbol","süper lig","uefa"]):
        new_items["futbol"].append(item)
    elif any(x in text for x in ["basketbol","nba","euroleague"]):
        new_items["basketbol"].append(item)
    elif "voleybol" in text:
        new_items["voleybol"].append(item)
    else:
        new_items["diger"].append(item)

for cat in new_items:
    for h in new_items[cat]:
        if h not in news[cat]:
            news[cat].append(h)

now = datetime.now()
for cat in news:
    news[cat] = [h for h in news[cat] if (now - datetime.fromisoformat(h['date'])) < timedelta(hours=48)]

with open("data/news.json", "w", encoding="utf-8") as f:
    json.dump(news, f, ensure_ascii=False, indent=2)

print("Haberler güncellendi!")
