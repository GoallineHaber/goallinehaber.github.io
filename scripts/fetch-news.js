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

// KATEGORİ
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
    text.includes("trabzonspor")
  ) {
    return "futbol";
  }

  if (text.includes("basketbol") || text.includes("nba")) {
    return "basketbol";
  }

  if (text.includes("voleybol")) {
    return "voleybol";
  }

  return "diger";
}

// 🔥 PUPPETEER İLE FULL İÇERİK
async function getContent(url) {
  try {
    const browser = await puppeteer.launch({
      headless: "new"
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "networkidle2",
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

    await browser.close();

    return text || "İçerik yok";

  } catch (err) {
    console.log("İçerik hatası:", err.message);
    return "İçerik yüklenemedi";
  }
}

// HABER ÇEKME
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

    fs.writeFileSync(
      "data/news.json",
      JSON.stringify(news, null, 2)
    );

    console.log("✔ Haberler çekildi");

  } catch (err) {
    console.log("Genel hata:", err.message);
  }
}

fetchNews();
