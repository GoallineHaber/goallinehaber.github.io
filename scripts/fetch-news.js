const Parser = require("rss-parser");
const fs = require("fs");

const parser = new Parser();

async function fetchNews() {

  const url = "https://www.ahaber.com.tr/rss/spor.xml";

  const news = {
    futbol: [],
    basketbol: [],
    voleybol: [],
    diger: []
  };

  try {

    const feed = await parser.parseURL(url);

    feed.items.slice(0, 20).forEach(item => {

      news.diger.push({
        title: item.title,
        link: item.link,
        date: new Date(item.pubDate).toISOString()
      });

    });

    fs.writeFileSync("data/news.json", JSON.stringify(news, null, 2));

    console.log("Haberler yazıldı");

  } catch (err) {

    console.log("RSS çekme hatası:", err);

  }

}

fetchNews();
