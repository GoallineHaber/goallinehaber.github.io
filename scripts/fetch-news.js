const Parser = require("rss-parser");
const fs = require("fs");

const parser = new Parser();

async function fetchNews() {
  const feed = await parser.parseURL("https://www.ahaber.com.tr/rss/spor.xml");

  let news = {
    futbol: [],
    basketbol: [],
    voleybol: [],
    diger: []
  };

  for (const item of feed.items.slice(0, 20)) {
    const obj = {
      title: item.title,
      link: item.link,
      date: new Date(item.pubDate || Date.now()).toISOString(),
      image: item.enclosure?.url || "fallback.jpg",
      summary: item.contentSnippet || "Detay için tıklayın"
    };

    news.diger.push(obj);
  }

  fs.writeFileSync("data/news.json", JSON.stringify(news, null, 2));

  console.log("✔ Haberler güncellendi");
}

fetchNews();
