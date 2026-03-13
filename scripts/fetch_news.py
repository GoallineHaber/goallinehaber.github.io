import feedparser
import json
from datetime import datetime, timedelta

rss_url = "https://www.ahaber.com.tr/rss/spor.xml"
feed = feedparser.parse(rss_url)

# 1️⃣ Mevcut JSON'u oku
try:
    with open("data/news.json", "r", encoding="utf-8") as f:
        news = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    news = {
        "futbol": [], "basketbol": [], "voleybol": [], "diger": []
    }

# 2️⃣ Yeni haberleri RSS'ten al
new_items = {"futbol": [], "basketbol": [], "voleybol": [], "diger": []}

for entry in feed.entries:
    title = entry.get("title", "")
    link = entry.get("link", "")
    try:
        date = datetime(*entry.published_parsed[:6]).isoformat()
    except:
        date = datetime.now().isoformat()

    # kendi sayfamıza yönlendirecek link
    item = {
        "title": title,
        "link": f"haber.html?url={link}",
        "date": date
    }

    text = (title + " " + entry.get("summary","")).lower()

    if any(x in text for x in ["galatasaray","fenerbahçe","beşiktaş","trabzonspor","futbol","süper lig","uefa"]):
        new_items["futbol"].append(item)
    elif any(x in text for x in ["basketbol","nba","euroleague"]):
        new_items["basketbol"].append(item)
    elif "voleybol" in text:
        new_items["voleybol"].append(item)
    else:
        new_items["diger"].append(item)

# 3️⃣ Yeni haberleri mevcut JSON'a ekle
for cat in new_items:
    for h in new_items[cat]:
        if h not in news[cat]:
            news[cat].append(h)

# 4️⃣ 48 saatten eski haberleri temizle
now = datetime.now()
for cat in news:
    news[cat] = [
        h for h in news[cat] if (now - datetime.fromisoformat(h['date'])) < timedelta(hours=48)
    ]

# 5️⃣ JSON'u tekrar yaz
with open("data/news.json","w",encoding="utf-8") as f:
    json.dump(news,f,ensure_ascii=False,indent=2)

print("Haberler güncellendi!")
