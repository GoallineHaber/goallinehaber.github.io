const Parser = require("rss-parser");
const fs = require("fs");
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

// 🔥 HABER KAYNAKLARI
const sources = [
  "https://www.ahaber.com.tr/rss/spor.xml",
  "https://www.ntvspor.net/rss"
];

// 🧠 KATEGORİ TESPİT
function detectCategory(item) {
  const text = (
    (item.title || "") +
    " " +
    (item.link || "") +
    " " +
    (item.contentSnippet || "")
  ).toLowerCase();

  if (
    text.includes("futbol") ||
    text.includes("galatasaray") ||
    text.includes("fenerbahçe") ||
    text.includes("beşiktaş") ||
    text.includes("trabzonspor") ||
    text.includes("süper lig") ||
    text.includes("uefa") ||
    text.includes("maç")
  ) {
    return "futbol";
  }

  if (
    text.includes("basketbol") ||
    text.includes("nba") ||
    text.includes("euroleague")
  ) {
    return "basketbol";
  }

  if (text.includes("voleybol")) {
    return "voleybol";
  }

  return "diger";
}

// 🔥 FULL CONTENT (PUPPETEER)
async function getContent(url) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    const text = await page.evaluate(() => {
      const paragraphs = document.querySelectorAll("p");
      let content = "";

      paragraphs.forEach(p => {
        const t = p.innerText;
        if (t && t.length > 20) {
          content += t + "\n\n";
        }
      });

      return content;
    });

    return text || "İçerik yok";

  } catch (err) {
    console.log("İçerik hatası:", err.message);
    return "İçerik yüklenemedi";

  } finally {
    if (browser) await browser.close();
  }
}

// 🚀 HABER ÇEKME
async function fetchNews() {

  let news = {
    futbol: [],
    basketbol: [],
    voleybol: [],
    diger: []
  };

  try {

    for (const source of sources) {

      const feed = await parser.parseURL(source);

      for (const item of feed.items) {

        console.log("Çekiliyor:", item.title);

        const obj = {
          title: item.title || "Başlık yok",
          link: item.link,
          date: new Date().toISOString(),
          image: item.enclosure?.url || "",
          summary: item.contentSnippet || "",
          content: await getContent(item.link)
        };

        const cat = detectCategory(item);
        news[cat].push(obj);
      }
    }

    // SORT (yeniden eskiye)
    Object.keys(news).forEach(cat => {
      news[cat].sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    // 📁 JSON yaz
    fs.mkdirSync("data", { recursive: true });

    fs.writeFileSync(
      "data/news.json",
      JSON.stringify(news, null, 2)
    );

    console.log("✔ HABERLER BAŞARIYLA ÇEKİLDİ");

  } catch (err) {
    console.log("GENEL HATA:", err.message);
  }
}

fetchNews();
