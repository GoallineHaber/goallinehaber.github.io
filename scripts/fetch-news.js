const Parser = require("rss-parser");
const fs = require("fs");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "media"],
      ["enclosure", "enclosure"],
      ["category", "category"]
    ]
  }
});

// 🔥 KATEGORİ ALGILAMA
function detectCategory(item) {
  const text = (
    (item.title || "") +
    (item.link || "") +
    (item.contentSnippet || "") +
    (item.content || "") +
    (item.category || "")
  ).toLowerCase();

  if (
    text.includes("futbol") ||
    text.includes("galatasaray") ||
    text.includes("fenerbahçe") ||
    text.includes("beşiktaş") ||
    text.includes("trabzonspor") ||
    text.includes("gol") ||
    text.includes("lig") ||
    text.includes("maç") ||
    text.includes("uefa")
  ) return "futbol";

  if (
    text.includes("basketbol") ||
    text.includes("nba") ||
    text.includes("euroleague") ||
    text.includes("pot") ||
    text.includes("ribaund")
  ) return "basketbol";

  if (
    text.includes("voleybol") ||
    text.includes("file") ||
    text.includes("smaç") ||
    text.includes("servis")
  ) return "voleybol";

  return "diger";
}

// 🔥 PUPPETEER FULL CONTENT
async function getContent(url) {
  try {
    // 🔥 AMP versiyonunu zorla
    const ampUrl = url.includes("/amp/")
      ? url
      : url.replace("https://www.ahaber.com.tr/", "https://www.ahaber.com.tr/amp/");

    const res = await fetch(ampUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = await res.text();
    const $ = cheerio.load(html);

    let content = "";

    $(".detay-text p, article p").each((i, el) => {
      const text = $(el).text().trim();

      if (
        text.length > 30 &&
        !text.toLowerCase().includes("devamını") &&
        !text.toLowerCase().includes("tıklayınız")
      ) {
        content += text + "\n\n";
      }
    });

    if (!content) return "İçerik alınamadı";

    return content;

  } catch (err) {
    console.log("AMP içerik hatası:", err.message);
    return "İçerik alınamadı";
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

  try {
    const feed = await parser.parseURL(url);

    for (const item of feed.items) {
      const date = new Date(item.pubDate || Date.now());

      let image =
        item.enclosure?.url ||
        item.media?.$?.url ||
        "fallback.jpg";

      console.log("Çekiliyor:", item.title);

      const fullContent = await getContent(item.link);

      const obj = {
        title: item.title || "Başlıksız Haber",
        link: item.link || "#",
        date: date.toISOString(),
        image: image,
        summary: fullContent
      };

      const category = detectCategory(item);
      news[category].push(obj);
    }

    // 🔥 SIRALA
    Object.keys(news).forEach(cat => {
      news[cat].sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    fs.writeFileSync("data/news.json", JSON.stringify(news, null, 2));

    console.log("✔ FULL HABERLER ÇEKİLDİ");

  } catch (err) {
    console.log("Genel hata:", err.message);
  }
}

fetchNews();
