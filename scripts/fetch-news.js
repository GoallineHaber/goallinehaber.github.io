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

// 🔥 FULL İÇERİK (PUPPETEER)
async function getContent(url) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox"]
    });

    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // 🔥 "Devamını oku" varsa tıkla
    try {
      const buttons = await page.$$("button, a");

      for (let btn of buttons) {
        const text = await page.evaluate(el => el.innerText, btn);

        if (text && text.toLowerCase().includes("devamını oku")) {
          await btn.click();
          await page.waitForTimeout(2000);
          break;
        }
      }
    } catch (e) {}

    // 🔥 içerik çek
    const content = await page.evaluate(() => {
      let article =
        document.querySelector(".detay-text") ||
        document.querySelector(".news-detail") ||
        document.querySelector(".article-body");

      if (!article) return "";

      return Array.from(article.querySelectorAll("p"))
        .map(p => p.innerText.trim())
        .filter(t =>
          t.length > 30 &&
          !t.toLowerCase().includes("devamını") &&
          !t.toLowerCase().includes("tıklayınız")
        )
        .join("\n\n");
    });

    await browser.close();

    if (!content) return "İçerik alınamadı";

    return content;

  } catch (err) {
    if (browser) await browser.close();
    console.log("İçerik hatası:", err.message);
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
