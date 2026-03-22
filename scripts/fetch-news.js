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

function detectCategory(item) {
  const title = (item.title || "").toLowerCase();
  const rawCategory = (item.category || "").toLowerCase();

  // Önce RSS category kontrolü
  if (rawCategory.includes("futbol")) return "futbol";
  if (rawCategory.includes("basketbol")) return "basketbol";
  if (rawCategory.includes("voleybol")) return "voleybol";

  // fallback: başlık kontrolü
  if (title.includes("futbol")) return "futbol";
  if (title.includes("basketbol")) return "basketbol";
  if (title.includes("voleybol")) return "voleybol";

  // default
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

      const cat = detectCategory(item);
      news[cat].push(obj);
    });

    fs.writeFileSync("data/news.json", JSON.stringify(news, null, 2));

    console.log("✔ Haberler düzgün kategorilendi");

  } catch (err) {
    console.log("Hata:", err);
  }
}

fetchNews();
