const fetch = require("node-fetch");
const fs = require("fs");
const Parser = require("rss-parser");
const parser = new Parser();

const categories = {
  futbol: "https://www.ahaber.com.tr/spor/futbol/rss",
  basketbol: "https://www.ahaber.com.tr/spor/basketbol/rss",
  voleybol: "https://www.ahaber.com.tr/spor/voleybol/rss",
  diger: "https://www.ahaber.com.tr/spor/rss"
};

async function fetchNews() {
  const now = new Date();
  const newsData = { futbol: [], basketbol: [], voleybol: [], diger: [] };

  for(const [cat, url] of Object.entries(categories)) {
    try {
      const feed = await parser.parseURL(url);
      feed.items.forEach(item => {
        const date = new Date(item.pubDate || now);
        if((now - date) < 48*60*60*1000) {
          newsData[cat].push({
            title: item.title,
            link: item.link,
            date: date.toISOString()
          });
        }
      });
    } catch(e) {
      console.error(`Hata ${cat} kategorisinde:`, e);
    }
  }

  fs.writeFileSync("data/news.json", JSON.stringify(newsData, null, 2));
  console.log("Haberler güncellendi!");
}

fetchNews();
