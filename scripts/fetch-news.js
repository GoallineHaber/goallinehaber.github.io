const Parser = require("rss-parser");
const fs = require("fs");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const OpenAI = require("openai");

const client = new OpenAI({
apiKey: process.env.OPENAI_KEY
});

console.log(
"OPENAI KEY:",
process.env.OPENAI_KEY ? "VAR" : "YOK"
);

const parser = new Parser({
customFields: {
item: [
["media", "media"],
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
(item.contentSnippet || "") +
" " +
(item.content || "") +
" " +
(item.category || "")
).toLowerCase();

if (
text.includes("voleybol") ||
text.includes("filenin sultanları") ||
text.includes("sultanlar") ||
text.includes("sultan") ||
text.includes("smaç") ||
text.includes("servis")
) {
return "voleybol";
}

if (
text.includes("basketbol") ||
text.includes("nba") ||
text.includes("euroleague") ||
text.includes("pota") ||
text.includes("ribaund") ||
text.includes("final four")
) {
return "basketbol";
}

if (
text.includes("futbol") ||
text.includes("şampiyon") ||
text.includes("tff") ||
text.includes("hakem") ||
text.includes("kanarya") ||
text.includes("aslan") ||
text.includes("süper lig") ||
text.includes("trendyol") ||
text.includes("galatasaray") ||
text.includes("fenerbahçe") ||
text.includes("beşiktaş") ||
text.includes("trabzonspor") ||
text.includes("gol") ||
text.includes("lig") ||
text.includes("maç") ||
text.includes("uefa")
) {
return "futbol";
}

return "diger";
}

async function getContent(url) {
try {
const res = await fetch(url, {
timeout: 15000,
headers: {
"User-Agent":
"Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}
});

const html = await res.text();
const $ = cheerio.load(html);

let paragraphs = [];

const selectors = [
  "article p",
  ".article-body p",
  ".article-content p",
  ".news-content p",
  ".detail-news-text p",
  ".newsDetailText p",
  "p"
];

for (const selector of selectors) {
  $(selector).each((i, el) => {
    const text = $(el).text().trim();

    if (
      text.length > 50 &&
      !text.includes("Devamı için tıklayın") &&
      !text.includes("Google News") &&
      !text.includes("Bizi Takip Edin")
    ) {
      paragraphs.push(text);
    }
  });

  if (paragraphs.length > 5) break;
}

const fullText = [...new Set(paragraphs)]
  .join("\n\n")
  .trim();

return fullText || "İçerik yüklenemedi";

} catch (err) {
console.log("İçerik hatası:", err.message);
return "İçerik yüklenemedi";
}
}

async function aiRewrite(title, summary, content) {
try {
const prompt = `
Görev:

Bu spor haberini tamamen yeniden yaz.

Başlık:
${title}

Özet:
${summary}

İçerik:
${content}

Kurallar:

Orijinal metni kopyalama
Cümleleri yeniden kur
Gazeteci dili kullan
SEO uyumlu yaz
En az 5 paragraf oluştur
Akıcı ve profesyonel yaz

"Devamı için tıklayın" kullanma
`;

console.log("AI BAŞLADI");

const response = await client.chat.completions.create({
model: "gpt-4.1-mini",
messages: [
{
role: "user",
content: prompt
}
],
temperature: 0.8,
max_tokens: 1200
});

const result =
response.choices[0].message.content;

console.log("AI SONUCU:");
console.log(result);
console.log("----------------");

return result;
} catch (err) {
console.log("====================");
console.log("AI HATASI");
console.log(err);
console.log("====================");

return "[AI HATA VERDİ]\n\n" + content;
}
}

async function fetchFromRSS(
url,
news,
existingLinks
) {
try {
const feed = await parser.parseURL(url);

for (const item of feed.items.slice(0, 5)) {
  if (existingLinks.includes(item.link)) {
    console.log("Zaten var:", item.title);
    continue;
  }

  console.log("Yeni haber:", item.title);

  const date = new Date(
    item.pubDate || Date.now()
  );

  let image =
    item.enclosure?.url ||
    item.enclosure?.link ||
    item.media?.$?.url ||
    item.media?.url ||
    null;

  if (!image) {
    try {
      const res = await fetch(item.link);
      const html = await res.text();
      const $ = cheerio.load(html);

      image =
        $('meta[property="og:image"]').attr(
          "content"
        ) ||
        $('meta[name="twitter:image"]').attr(
          "content"
        ) ||
        "fallback.jpg";
    } catch {
      image = "fallback.jpg";
    }
  }

  const summary =
    item.contentSnippet || "Özet yok";

  const content = await getContent(
    item.link
  );

  let aiSource = content;

  if (
    !content ||
    content.includes("İçerik yüklenemedi") ||
    content.length < 300
  ) {
    aiSource = `

${item.title}

${item.contentSnippet || ""}

${item.content || ""}
`;
}

  console.log(
    "AI kaynak uzunluğu:",
    aiSource.length
  );

  const aiContent = await aiRewrite(
    item.title,
    summary,
    aiSource
  );

  const obj = {
    title: item.title || "Başlıksız Haber",
    link: item.link || "#",
    date: date.toISOString(),
    image,
    summary,
    content: aiContent,
    original_content: content
  };

  const category =
    detectCategory(item);

  news[category].push(obj);
  existingLinks.push(item.link);
}

} catch (err) {
console.log("RSS hata:", err.message);
}
}

async function fetchNews() {
const urls = [
"https://www.trtspor.com.tr/rss.xml",
"https://www.ntvspor.net/rss"
];

let news = {
futbol: [],
basketbol: [],
voleybol: [],
diger: []
};

if (fs.existsSync("data/news.json")) {
try {
news = JSON.parse(
fs.readFileSync(
"data/news.json",
"utf8"
)
);
} catch (err) {
console.log(
"JSON okuma hatası:",
err.message
);
}
}

const existingLinks = [];

Object.keys(news).forEach(cat => {
news[cat].forEach(item => {
existingLinks.push(item.link);
});
});

for (const url of urls) {
await fetchFromRSS(
url,
news,
existingLinks
);
}

Object.keys(news).forEach(cat => {
news[cat].sort((a, b) => {
return (
new Date(b.date) -
new Date(a.date)
);
});
});

if (!fs.existsSync("data")) {
fs.mkdirSync("data");
}

fs.writeFileSync(
"data/news.json",
JSON.stringify(news, null, 2)
);

console.log("✔️ HABERLER BAŞARIYLA ÇEKİLDİ");
}

fetchNews();
