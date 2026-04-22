const Parser = require("rss-parser");
const fs = require("fs");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "media"],
      ["enclosure", "enclosure"],
      ["category", "category"]
    ]
  }
});

// 🔥 GELİŞMİŞ KATEGORİ ALGILAMA
function detectCategory(item) {
  const text = (
    (item.title || "") +
    (item.link || "") +
    (item.contentSnippet || "") +
    (item.content || "") +
    (item.category || "")
  ).toLowerCase();

  // FUTBOL
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

  // BASKETBOL
  if (
    text.includes("basketbol") ||
    text.includes("nba") ||
    text.includes("euroleague") ||
    text.includes("pot") ||
    text.includes("ribaund")
  ) return "basketbol";

  // VOLEYBOL
  if (
    text.includes("voleybol") ||
    text.includes("file") ||
    text.includes("smaç") ||
    text.includes("servis")
  ) return "voleybol";

  return "diger";
}

// içerik çek
async function getContent(url) {
  try {
    const res = await fetch(url, { timeout: 10000 });
    const html = await res.text();
    const $ = cheerio.load(html);

    let paragraphs = [];
    $("p").each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 50) paragraphs.push(text);
    });

    let fullText = paragraphs.join("\n\n");
    if (!fullText) fullText = "İçerik yüklenemedi";

    return fullText;
  } catch (err) {
    console.log("Hata içerik:", err.message);
    return "İçerik yüklenemedi";
  }
}

async function fetchNews() {
  const url = "https://www.ahaber.com.tr/rss/spor.xml";

  let news = { futbol: [], basketbol: [], voleybol: [], diger: [] };

  try {
    const feed = await parser.parseURL(url);

    for (const item of feed.items) {
      const date = new Date(item.pubDate || Date.now());

      let image =
        item.enclosure?.url ||
        item.media?.$?.url ||
        "fallback.jpg";

      const summary = await getContent(item.link);

      const obj = {
        title: item.title || "Başlıksız Haber",
        link: item.link || "#",
        date: date.toISOString(),
        image: image,
        summary: summary
      };

      const category = detectCategory(item);
      news[category].push(obj);
    }

    Object.keys(news).forEach(cat => {
      news[cat].sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    fs.writeFileSync("data/news.json", JSON.stringify(news, null, 2));
    console.log("✔ DÜZGÜN KATEGORİLİ HABERLER ÇEKİLDİ");
  } catch (err) {
    console.log("Genel hata:", err.message);
  }
}

fetchNews();
