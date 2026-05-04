const Parser = require("rss-parser");
const fs = require("fs");
const puppeteer = require("puppeteer");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const parser = new Parser();

// KATEGORİ
function detectCategory(item) {
  const text = (item.title || "").toLowerCase();

  if (text.includes("galatasaray") || text.includes("fenerbahçe") || text.includes("beşiktaş")) return "futbol";
  if (text.includes("basketbol") || text.includes("nba")) return "basketbol";
  if (text.includes("voleybol")) return "voleybol";
  return "diger";
}

// 🔥 AI ÖZET
async function aiSummary(text) {
  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: "Aşağıdaki spor haberini 2 kısa cümle ile özetle:\n\n" + text
        }
      ]
    });

    return res.choices[0].message.content;

  } catch (err) {
    console.log("AI hata:", err.message);
    return text.split("\n\n").slice(0, 2).join(" "); // fallback
  }
}

// 🔥 FULL CONTENT
async function getContent(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 0 });
    await page.waitForSelector("p");

    const content = await page.evaluate(() => {
      let texts = [];

      document.querySelectorAll("p").forEach(p => {
        const t = p.innerText.trim();

        if (
          t.length > 40 &&
          !t.toLowerCase().includes("devamı için") &&
          !t.toLowerCase().includes("tıklayınız")
        ) {
          texts.push(t);
        }
      });

      return texts.join("\n\n");
    });

    return content || "İçerik alınamadı";

  } catch (err) {
    console.log("Hata:", err.message);
    return "İçerik alınamadı";
  }
}

// ANA
async function fetchNews() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  const url = "https://feeds.bbci.co.uk/sport/rss.xml";
  let news = {
    futbol: [],
    basketbol: [],
    voleybol: [],
    diger: []
  };

  for (const item of feed.items.slice(0, 8)) { // ⚠️ AI olduğu için limit düşük
    const fullContent = await getContent(page, item.link);

    // 🔥 AI ÖZET
    const summary = await getContent(item.link);

    const obj = {
  title: item.title,
  link: item.link,
  date: date.toISOString(),
  image: image,
  summary: summary // 🔥 FULL İÇERİK BURADA
};

    const cat = detectCategory(item);
    news[cat].push(obj);

    console.log("✔ çekildi:", item.title);
  }

  fs.writeFileSync("data/news.json", JSON.stringify(news, null, 2));

  await browser.close();

  console.log("🔥 AI + FULL HABER TAMAMLANDI");
}

fetchNews();
