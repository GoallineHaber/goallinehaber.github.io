const Parser = require("rss-parser");
const fs = require("fs");

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "media"],
      ["enclosure", "enclosure"],
      ["category", "category"]
    ]
  }
});

/* 🔥 GELİŞMİŞ KATEGORİ ALGILAMA */
function detectCategory(item) {
  const title = (item.title || "").toLowerCase();
  const rawCategory = (item.category || "").toLowerCase();
  const link = (item.link || "").toLowerCase();
  const description = (item.contentSnippet || "").toLowerCase();

  // 1. RSS kategori
  if (rawCategory.includes("futbol")) return "futbol";
  if (rawCategory.includes("basketbol")) return "basketbol";
  if (rawCategory.includes("voleybol")) return "voleybol";

  // 2. Link üzerinden (EN GÜVENİLİR)
  if (link.includes("futbol")) return "futbol";
  if (link.includes("basketbol")) return "basketbol";
  if (link.includes("voleybol")) return "voleybol";

  // 3. Açıklama kontrolü
  if (description.includes("futbol")) return "futbol";
  if (description.includes("basketbol")) return "basketbol";
  if (description.includes("voleybol")) return "voleybol";

  // 4. Başlık fallback
  if (title.includes("futbol")) return "futbol";
  if (title.includes("basketbol")) return "basketbol";
  if (title.includes("voleybol")) return "voleybol";

  // 5. default
  return "diger";
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

    feed.items.forEach(item => {

      const date = new Date(item.pubDate);

      let image = null;

      // 🔥 RESİM ALMA
      if (item.enclosure && item.enclosure.url) {
        image = item.enclosure.url;
      }

      if (item.media && item.media.$ && item.media.$.url) {
        image = item.media.$.url;
      }

      const obj = {
        title: item.title,
        link: item.link,
        date: date.toISOString(),
        image: image
      };

      // 🔥 KATEGORİ BELİRLE
      const category = detectCategory(item);

      news[category].push(obj);

    });

    // 🔥 SIRALA (EN YENİ ÜSTTE)
    Object.keys(news).forEach(cat => {
      news[cat].sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    // 🔥 DOSYAYA YAZ
    fs.writeFileSync("data/news.json", JSON.stringify(news, null, 2));

    console.log("✔ Haberler başarıyla kategorilere ayrıldı");

  } catch (err) {
    console.log("Hata:", err);
  }
}

fetchNews();
