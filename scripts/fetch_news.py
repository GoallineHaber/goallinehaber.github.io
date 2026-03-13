import feedparser
import json
from datetime import datetime, timedelta

rss_urls = [
 "https://www.ahaber.com.tr/rss/spor.xml",
 "https://www.ntvspor.net/rss",
 "https://www.fanatik.com.tr/rss",
 "https://www.fotomac.com.tr/rss",
 "https://www.aspor.com.tr/rss",
 "https://www.sporx.com.tr/rss",
 "https://www.goal.com/tr/feeds/news",
 "https://www.trtspor.com.tr/rss"
]

# JSON dosyasını oku veya oluştur
try:
    with open("data/news.json", "r", encoding="utf-8") as f:
        news = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    news = {"futbol": [], "basketbol": [], "voleybol": [], "diger": []}

new_items = {"futbol": [], "basketbol": [], "voleybol": [], "diger": []}

# RSS’leri çek
for rss_url in rss_urls:
    feed = feedparser.parse(rss_url)
    print("RSS çekiliyor:", rss_url, "Haber sayısı:", len(feed.entries))

    for entry in feed.entries:
        title = entry.get("title", "")
        link = entry.get("link", "")
        
        try:
            date = datetime(*entry.published_parsed[:6]).isoformat()
        except:
            date = datetime.now().isoformat()
        
        # Görsel varsa al
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

# Yeni haberleri ekle
for cat in new_items:
    for h in new_items[cat]:
        if not any(existing["link"] == h["link"] for existing in news[cat]):
            news[cat].append(h)

# 48 saatten eski haberleri temizle
now = datetime.now()
for cat in news:
    news[cat] = [h for h in news[cat] if (now - datetime.fromisoformat(h['date'])) < timedelta(hours=48)]

# JSON’a yaz
with open("data/news.json", "w", encoding="utf-8") as f:
    json.dump(news, f, ensure_ascii=False, indent=2)

print("Haberler güncellendi!")
