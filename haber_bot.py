import feedparser
from datetime import datetime
import os


rss_url = "https://www.fanatik.com.tr/rss"
feed = feedparser.parse(rss_url)


for entry in feed.entries[:5]:
    title = entry.title
    link = entry.link
    date = datetime.now().strftime("%Y-%m-%d")
    filename = f"_posts/{date}-{title[:30].replace(' ', '-')}.md"

    content = f"""---
title: "{title}"
date: {date}
source: Fanatik
link: {link}
---

[Haber kaynağı]({link})
"""

    # Eğer dosya yoksa oluştur
    if not os.path.exists(filename):
        with open(filename, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Haber eklendi: {title}")
    else:
        print(f"Haber zaten var: {title}")
