const Parser = require("rss-parser");
const fs = require("fs");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const parser = new Parser();

// 🔥 KATEGORİ
function detectCategory(item) {
  const text = (item.title || "").toLowerCase();

  if (text.includes("galatasaray") || text.includes("fenerbahçe") || text.includes("beşiktaş")) return "futbol";
  if (text.includes("nba") || text.includes("basketbol")) return "basketbol";
  if (text.includes("voleybol")) return "voleybol";

  return "diger";
}

// 🔥 AMP FULL CONTENT
async function getContent(url) {
  try {
    const ampUrl = url.replace(
      "https://www.ahaber.com.tr/",
      "https://www.ahaber.com.tr/amp/"
    );

    const res = await fetch(ampUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "tr-TR,tr;q=0.9",
        "Referer": "https://www.google.com/"
      }
    });

    const html = await res.text();
    const $ = cheerio.load(html);

    let content = "";

    $("article p").each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 50) {
        content += text + "\n\n";
      }
    });

    // 🔥 fallback (RSS summary kullan)
    if (!content) {
      return "Detay için habere tıklayın.";
    }

    return content;

  } catch (err) {
    return "Detay için habere tıklayın.";
  }
}

async function fetchNews() {
  const url = "https://www.ahaber.com.tr/rss/spor.xml";

  let news = {
    futbol: [],
    basketbol: [],
    voleybol: [],
    diger: []
  };

  const feed = await parser.parseURL(url);

  for (const item of feed.items.slice(0, 20)) {
    const fullContent = await getContent(item.link);

    const obj = {
      title: item.title,
      link: item.link,
      date: new Date(item.pubDate || Date.now()).toISOString(),
      image: item.enclosure?.url || "fallback.jpg",
      summary: fullContent
    };

    const category = detectCategory(item);
    news[category].push(obj);
  }

  fs.writeFileSync("data/news.json", JSON.stringify(news, null, 2));

  console.log("✔ Haberler güncellendi");
}

fetchNews();
