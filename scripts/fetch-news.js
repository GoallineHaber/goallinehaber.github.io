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

// FULL CONTENT ÇEKME
async function getContent(url) {
  try {
    const res = await fetch(url, { timeout: 10000 });
    const html = await res.text();
    const $ = cheerio.load(html);

    let paragraphs = [];

    // 1. ÖZEL SELECTOR (öncelikli)
    $(".detay-icerik p").each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 30) paragraphs.push(text);
    });

    // 2. ALTERNATİF SELECTOR
    if (paragraphs.length === 0) {
      $(".article-body p").each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 30) paragraphs.push(text);
      });
    }

    // 3. FALLBACK (GENEL)
    if (paragraphs.length === 0) {
      $("p").each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 50) paragraphs.push(text);
      });
    }

    return paragraphs.join("\n\n") || "İçerik bulunamadı";

  } catch (err) {
    console.log("Hata içerik:", err.message);
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

    // 🔥 SADECE İLK 10 HABER (rate limit için önemli)
    for (const item of feed.items.slice(0, 10)) {
      const date = new Date(item.pubDate || Date.now());

      let image =
        item.enclosure?.url ||
        item.media?.$?.url ||
        "fallback.jpg";

      const summary = item.contentSnippet || "Özet yok";

      // ✅ FULL CONTENT BURADA ÇEKİLİYOR
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

    console.log("✔️ FULL HABERLER ÇEKİLDİ");

  } catch (err) {
    console.log("Genel hata:", err.message);
  }
}

fetchNews();
