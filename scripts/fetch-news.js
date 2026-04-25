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
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000
    });

    // 🔥 DEVAMINI OKU TIKLAMA
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

    // 🔥 İÇERİK ÇEK
    const content = await page.evaluate(() => {
      let article = null;

      if (document.querySelector(".detay-text")) {
        article = document.querySelector(".detay-text");
      } else if (document.querySelector(".news-detail")) {
        article = document.querySelector(".news-detail");
      } else if (document.querySelector(".article-body")) {
        article = document.querySelector(".article-body");
      }

      if (!article) return "";

      const paragraphs = Array.from(article.querySelectorAll("p"))
        .map(p => p.innerText.trim())
        .filter(text =>
          text.length > 30 &&
          !text.toLowerCase().includes("devamını") &&
          !text.toLowerCase().includes("tıklayınız")
        );

      return paragraphs.join("\n\n");
    });

    await browser.close();

    if (!content || content.length < 100) {
      return "İçerik alınamadı";
    }

    return content;

  } catch (err) {
    if (browser) await browser.close();
    console.log("Puppeteer hata:", err.message);

    // 🔥 FALLBACK (cheerio)
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 10000
      });

      const html = await res.text();
      const $ = cheerio.load(html);

      let content = "";

      $("p").each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 80) content += text + "\n\n";
      });

      return content || "İçerik alınamadı";

    } catch {
      return "İçerik alınamadı";
    }
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
