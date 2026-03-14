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

    feed.items.slice(0, 30).forEach(item => {

      const link = item.link.toLowerCase();

      const newsItem = {
        title: item.title,
        link: item.link,
        date: new Date(item.pubDate).toISOString()
      };

      if (link.includes("futbol")) {

        news.futbol.push(newsItem);

      } else if (link.includes("basketbol")) {

        news.basketbol.push(newsItem);

      } else if (link.includes("voleybol")) {

        news.voleybol.push(newsItem);

      } else {

        news.diger.push(newsItem);

      }

    });

    fs.writeFileSync("data/news.json", JSON.stringify(news, null, 2));

    console.log("Haberler güncellendi");

  } catch (err) {

    console.log("RSS hatası:", err);

  }

}

fetchNews();
