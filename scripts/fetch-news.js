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

// Kategori algılama
function detectCategory(item) {
  const text = (item.title + item.link + item.contentSnippet).toLowerCase();
  if (text.includes("futbol")) return "futbol";
  if (text.includes("basketbol")) return "basketbol";
  if (text.includes("voleybol")) return "voleybol";
  return "diger";
}

// İçerik çekme ve full paragraf birleştirme
async function getContent(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    let paragraphs = [];
    $("p").each((i, el) => {
      const text = $(el).text().trim();
      if (text) paragraphs.push(text);
    });
    let fullText = paragraphs.join("\n\n");
    if (!fullText) fullText = "İçerik yüklenemedi";
    return fullText;
  } catch (err) {
    console.log("Hata içerik çekme:", err);
    return "İçerik yüklenemedi";
  }
}

// Haberleri çek ve JSON'a yaz
async function fetchNews() {
  const url = "https://www.ahaber.com.tr/rss/spor.xml";
  let news = { futbol: [], basketbol: [], voleybol: [], diger: [] };
  const feed = await parser.parseURL(url);

  for (const item of feed.items.slice(0, 20)) {
    const date = new Date(item.pubDate);
    let image = item.enclosure?.url || item.media?.$?.url || "fallback.jpg";
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
  console.log("✔ Haberler ve içerik başarıyla çekildi");
}

fetchNews();
