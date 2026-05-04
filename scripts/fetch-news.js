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

// KATEGORİ
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
    text.includes("lig") ||
    text.includes("maç")
  ) return "futbol";

  if (
    text.includes("basketbol") ||
    text.includes("nba") ||
    text.includes("euroleague")
  ) return "basketbol";

  if (
    text.includes("voleybol") ||
    text.includes("smaç")
  ) return "voleybol";

  return "diger";
}

// 🚀 FULL CONTENT (BOT ENGELİ FIX + FALLBACK)
async function getContent(url) {
  try {
    const res = await fetch(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
      }
    });

    const html = await res.text();

    // DEBUG
    if (!html || html.length < 1000) {
      console.log("❌ BOŞ HTML:", url);
      return "İçerik alınamadı (bot engeli)";
    }

    const $ = cheerio.load(html);

    let paragraphs = [];

    // 1️⃣ ANA SELECTOR
    $(".detay-icerik p").each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 30) paragraphs.push(text);
    });

    // 2️⃣ YEDEK
    if (paragraphs.length === 0) {
      $(".article-body p").each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 30) paragraphs.push(text);
      });
    }

    // 3️⃣ SON ÇARE
    if (paragraphs.length === 0) {
      $("p").each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 80) paragraphs.push(text);
      });
    }

    if (paragraphs.length === 0) {
      console.log("❌ İÇERİK BULUNAMADI:", url);
      return "İçerik bulunamadı";
    }

    return paragraphs.join("\n\n");

  } catch (err) {
    console.log("🔥 HATA:", err.message);
    return "İçerik çekilemedi";
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

    // ⚠️ LIMIT (çok önemli)
    const items = feed.items.slice(0, 8);

    for (const item of items) {
      const date = new Date(item.pubDate || Date.now());

      let image =
        item.enclosure?.url ||
        item.media?.$?.url ||
        "fallback.jpg";

      const summary = item.contentSnippet || "Özet yok";

      console.log("⏳ Çekiliyor:", item.link);

      const content = await getContent(item.link);

      const obj = {
        title: item.title || "Başlıksız Haber",
        link: item.link || "#",
        date: date.toISOString(),
        image: image,
        summary: summary,
        content: content
      };

      const category = detectCategory(item);
      news[category].push(obj);
    }

    Object.keys(news).forEach(cat => {
      news[cat].sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    fs.writeFileSync("data/news.json", JSON.stringify(news, null, 2));

    console.log("✅ FULL HABERLER BAŞARIYLA ÇEKİLDİ");

  } catch (err) {
    console.log("❌ GENEL HATA:", err.message);
  }
}

fetchNews();
