const Parser = require("rss-parser");
const fs = require("fs");
const puppeteer = require("puppeteer");

const parser = new Parser({
  customFields: {
    item: [
      ["enclosure", "enclosure"],
      ["category", "category"]
    ]
  }
});

// -------------------- KATEGORİ --------------------
function detectCategory(item) {
  const text = (
    (item.title || "") +
    " " +
    (item.contentSnippet || "")
  ).toLowerCase();

  if (
    text.includes("futbol") ||
    text.includes("galatasaray") ||
    text.includes("fenerbahçe") ||
    text.includes("beşiktaş") ||
    text.includes("trabzonspor") ||
    text.includes("uefa")
  ) return "futbol";

  if (
    text.includes("basketbol") ||
    text.includes("nba") ||
    text.includes("euroleague")
  ) return "basketbol";

  if (
    text.includes("voleybol")
  ) return "voleybol";

  return "diger";
}

// -------------------- FULL İÇERİK (PUPPETEER) --------------------
async function getContent(url) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    const text = await page.evaluate(() => {
      const paragraphs = document.querySelectorAll("p");
      let content = "";

      paragraphs.forEach(p => {
        const t = p.innerText;
        if (t && t.length > 30) {
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

// -------------------- RSS ÇEK --------------------
async function fetchFromRSS(rssUrl, news) {
  try {
    const feed = await parser.parseURL(rssUrl);

    for (const item of feed.items) {

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

  } catch (err) {
    console.log("RSS hata:", err.message);
  }
}

// -------------------- ANA FONKSİYON --------------------
async function fetchNews() {

  let news = {
    futbol: [],
    basketbol: [],
    voleybol: [],
    diger: []
  };

  console.log("Haber çekiliyor...");

  // 🔥 KAYNAKLAR
  await fetchFromRSS("https://www.ahaber.com.tr/rss/spor.xml", news);

  // İstersen ek kaynak:
  // await fetchFromRSS("https://www.ntvspor.net/rss", news);

  fs.mkdirSync("data", { recursive: true });

  fs.writeFileSync(
    "data/news.json",
    JSON.stringify(news, null, 2),
    "utf-8"
  );

  console.log("✔ Haberler çekildi ve kaydedildi");
}

fetchNews();
