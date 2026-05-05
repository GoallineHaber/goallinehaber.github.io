const Parser = require("rss-parser");
const fs = require("fs");
const puppeteer = require("puppeteer");

const parser = new Parser();

function detectCategory(text) {
  text = text.toLowerCase();

  if (text.includes("futbol") || text.includes("galatasaray") || text.includes("fenerbah")) return "futbol";
  if (text.includes("basket"))  return "basketbol";
  if (text.includes("voleybol")) return "voleybol";

  return "diger";
}

// 🔥 FULL CONTENT
async function getContent(page, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

    // önemli bekleme
    await page.waitForSelector(".detay-text", { timeout: 5000 });

    const data = await page.evaluate(() => {
      let content = "";

      const container = document.querySelector(".detay-text");

      if (container) {
        content = container.innerHTML;
      }

      const title = document.querySelector("h1")?.innerText || "";
      const img = document.querySelector(".detay-img img")?.src || "";

      return { title, img, content };
    });

    return data;

  } catch (err) {
    console.log("İçerik hata:", err.message);
    return null;
  }
}

async function fetchNews() {
  const feed = await parser.parseURL("https://www.ahaber.com.tr/rss/spor.xml");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"]
  });

  const page = await browser.newPage();

  let news = {
    futbol: [],
    basketbol: [],
    voleybol: [],
    diger: []
  };

  for (const item of feed.items) {
    console.log("Çekiliyor:", item.title);

    const full = await getContent(page, item.link);

    const obj = {
      title: full?.title || item.title,
      link: item.link,
      date: new Date(item.pubDate || Date.now()).toISOString(),
      image: full?.img || "",
      
      // 🔥 KRİTİK NOKTA BURASI
      summary: full?.content || item.contentSnippet || ""
    };

    const cat = detectCategory(item.title);
    news[cat].push(obj);
  }

  fs.writeFileSync("data/news.json", JSON.stringify(news, null, 2));

  await browser.close();

  console.log("✅ FULL içerik JSON'a yazıldı");
}

fetchNews();
