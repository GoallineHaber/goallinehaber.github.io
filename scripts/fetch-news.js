const Parser = require("rss-parser");
const fs = require("fs");
const fetch = global.fetch;
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

function detectCategory(item) {
  const text = (
    (item.title || "") +
    " " +
    (item.link || "") +
    " " +
    (item.contentSnippet || "")
  ).toLowerCase();

  if (text.includes("futbol") || text.includes("galatasaray") || text.includes("fenerbahçe")) {
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

async function getContent(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    let text = "";

    $("p").each((i, el) => {
      text += $(el).text() + "\n";
    });

    return text || "İçerik yok";
  } catch (e) {
    return "İçerik yüklenemedi";
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

  const feed = await parser.parseURL(url);

  for (const item of feed.items) {

    const obj = {
      title: item.title,
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

  console.log("Haberler çekildi");
}

fetchNews();
