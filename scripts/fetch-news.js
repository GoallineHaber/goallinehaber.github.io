const Parser = require("rss-parser");
const fs = require("fs");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_KEY
});

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "media"],
      ["enclosure", "enclosure"],
      ["category", "category"]
    ]
  }
});

// KATEGORİ TESPİT
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
    (
      Array.isArray(item.category)
        ? item.category.join(" ")
        : item.category || ""
    )
  ).toLowerCase();

  // BASKETBOL
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

  // VOLEYBOL
  if (
    text.includes("voleybol") ||
    text.includes("filenin sultanları") ||
    text.includes("sultanlar ligi") ||
    text.includes("smaç") ||
    text.includes("servis")
  ) {
    return "voleybol";
  }

  // FUTBOL
  if (
    text.includes("futbol") ||
    text.includes("tff") ||
    text.includes("süper lig") ||
    text.includes("uefa") ||
    text.includes("şampiyonlar ligi") ||
    text.includes("galatasaray") ||
    text.includes("fenerbahçe") ||
    text.includes("beşiktaş") ||
    text.includes("trabzonspor")
  ) {
    return "futbol";
  }

  return "diger";
}

// HABER İÇERİĞİ ÇEK
async function getContent(url) {

  try {

    const res = await fetch(url, {
      timeout: 10000
    });

    const html = await res.text();

    const $ = cheerio.load(html);

    let paragraphs = [];

    $("p, .detail-news-text, .newsDetailText").each((i, el) => {

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

    let fullText =
      [...new Set(paragraphs)].join("\n\n");

    if (!fullText) {
      fullText = "İçerik yüklenemedi";
    }

    return fullText;

  } catch (err) {

    console.log(
      "İçerik hatası:",
      err.message
    );

    return "İçerik yüklenemedi";
  }
}

// AI İLE HABER YAZ
async function aiRewrite(title, summary, content) {

  try {

    const prompt = `
Başlık:
${title}

Özet:
${summary}

İçerik:
${content}

Verilen başlık ve özet bilgilerine göre profesyonel spor haberi yaz.

Kurallar:
- Kopya içerik olmasın
- SEO uyumlu olsun
- Gerçek spor sitesi dili kullan
- Akıcı yaz
- 3-4 paragraf yaz
- Haberi detaylandır
- "Devamı için tıklayın" gibi ifadeleri kullanma
`;

    const response =
      await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      });

    return response
      .choices[0]
      .message
      .content;

  } catch (err) {

    console.log(
      "AI hata:",
      err.message
    );

    return content;
  }
}

// RSS ÇEK
async function fetchFromRSS(url, news, existingLinks) {

  try {

    const feed =
      await parser.parseURL(url);

    for (const item of feed.items.slice(0, 5)) {

      // daha önce varsa geç
      if (
        existingLinks.includes(
          item.link
        )
      ) {

        console.log(
          "Zaten var:",
          item.title
        );

        continue;
      }

      console.log(
        "Yeni haber:",
        item.title
      );

      const date = new Date(
        item.pubDate || Date.now()
      );

      let image =
        item.enclosure?.url ||
        item.enclosure?.link ||
        item.media?.$?.url ||
        item.media?.url ||
        item["media:content"]?.url ||
        item["media:thumbnail"]?.url ||
        null;

      // foto yoksa sayfadan çek
      if (!image) {

        try {

          const res = await fetch(item.link);

          const html = await res.text();

          const $ = cheerio.load(html);

          image =
            $('meta[property="og:image"]').attr("content") ||
            $('meta[name="twitter:image"]').attr("content") ||
            $("img").first().attr("src") ||
            "fallback.jpg";

        } catch (err) {

          image = "fallback.jpg";
        }
      }

      const summary =
        item.contentSnippet || "Özet yok";

      const content =
        await getContent(item.link);

      let aiSource = content;

      // kötü içerik kontrolü
      if (
        !aiSource ||
        aiSource.includes("Devamı için tıklayın") ||
        aiSource.includes("İçerik yüklenemedi") ||
        aiSource.length < 100
      ) {

        aiSource = summary;
      }

      const aiContent =
        await aiRewrite(
          item.title,
          summary,
          aiSource
        );

      const obj = {
        title:
          item.title ||
          "Başlıksız Haber",

        link:
          item.link || "#",

        date:
          date.toISOString(),

        image: image,

        summary: summary,

        content: aiContent,

        original_content: content
      };

      const category =
        detectCategory(item);

      console.log(
        item.title,
        "=>",
        category
      );

      news[category].push(obj);

      existingLinks.push(item.link);
    }

  } catch (err) {

    console.log(
      "RSS hata:",
      err.message
    );
  }
}

// HABERLERİ ÇEK
async function fetchNews() {

  const urls = [
    "https://www.ahaber.com.tr/rss/spor.xml",
    "https://www.trtspor.com.tr/rss.xml",
    "https://www.ntvspor.net/rss"
  ];

  let news = {
    futbol: [],
    basketbol: [],
    voleybol: [],
    diger: []
  };

  // eski haberleri oku
  if (
    fs.existsSync("data/news.json")
  ) {

  try {

  const oldNews =
    JSON.parse(
      fs.readFileSync(
        "data/news.json",
        "utf8"
      )
    );

  // ESKİ HABERLERİ YENİDEN KATEGORİLE
  const rebuiltNews = {
    futbol: [],
    basketbol: [],
    voleybol: [],
    diger: []
  };

  Object.keys(oldNews).forEach(cat => {

    oldNews[cat].forEach(item => {

      const detectedCategory =
        detectCategory(item);

      rebuiltNews[
        detectedCategory
      ].push(item);

    });

  });

  news = rebuiltNews;

  console.log(
    "✔️ Eski haberler yeniden kategorilendi"
  );

} catch (err) {

  console.log(
    "JSON okuma hatası:",
    err.message
  );
}

  // eski linkler
  const existingLinks = [];

  Object.keys(news).forEach(cat => {

    news[cat].forEach(item => {

      existingLinks.push(item.link);

    });

  });

  // rss çek
  for (const url of urls) {

    await fetchFromRSS(
      url,
      news,
      existingLinks
    );
  }

  // TARİHE GÖRE SIRALA
  Object.keys(news).forEach(cat => {

    news[cat].sort((a, b) => {
      return (
        new Date(b.date) -
        new Date(a.date)
      );
    });

  });

  // klasör yoksa oluştur
  if (
    !fs.existsSync("data")
  ) {

    fs.mkdirSync("data");
  }

  // JSON YAZ
  fs.writeFileSync(
    "data/news.json",
    JSON.stringify(news, null, 2)
  );

  console.log(
    "✔️ HABERLER BAŞARIYLA ÇEKİLDİ"
  );
}

// ÇALIŞTIR
fetchNews();
