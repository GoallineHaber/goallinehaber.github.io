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
    (item.category || "")
  ).toLowerCase();


  // VOLEYBOL
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


  // FUTBOL
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



// HABER İÇERİĞİ ÇEK

async function getContent(url) {

  try {

    const res = await fetch(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0"
      }
    });

    const html = await res.text();

    const $ = cheerio.load(html);

    let paragraphs = [];


    $("p, .detail-news-text, .newsDetailText, article p").each((i, el) => {

      const text =
        $(el).text().trim();

      if (
        text.length > 40 &&
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
      fullText =
        "İçerik yüklenemedi";
    }


    // çok uzunsa kısalt
    if (fullText.length > 700) {
      fullText =
        fullText.substring(0, 700);
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



// AI İLE YENİDEN YAZ

async function aiRewrite(title, summary, content) {

  try {

    const prompt = `

Aşağıda spor haberi bulunmaktadır.

Başlık:
${title}

Özet:
${summary}

Metin:
${content}

Kurallar:

- Haber devam ettirilmeyecek
- Eksik bilgi tahmin edilmeyecek
- Yeni bilgi eklenmeyecek
- Haberi uzatma
- Aynı cümleleri kullanma
- Kopya içerik üretme

Yapılacak:

- Haberi tamamen farklı cümlelerle yeniden yaz
- SEO uyumlu yaz
- En fazla 2 paragraf yaz
- En fazla 90 kelime kullan
- Profesyonel spor haber sitesi dili kullan

ÖNEMLİ:

Asla haberi tamamlamaya çalışma.
Sadece mevcut bilgiyi yeniden yaz.

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
        temperature: 0.2
      });

    const result =
      response.choices[0]
      .message.content;

    return result;

  } catch (err) {

    console.log(
      "AI hata:",
      err.message
    );

    return summary;
  }
}

// RSS ÇEK

async function fetchFromRSS(url, news, existingLinks, existingTitles) {

  try {

    const feed =
      await parser.parseURL(url);

    console.log("RSS OK:", url);
    console.log("Feed title:", feed.title);
    console.log("Bulunan haber:", feed.items.length);


    // maliyet azaltmak için 3 haber
    for (const item of feed.items.slice(0, 3)) {

      // link duplicate
      if (
        existingLinks.includes(item.link)
      ) {
        console.log("Zaten var link:", item.title);
        continue;
      }


      // title duplicate
      if (
        existingTitles.includes(
          (item.title || "").trim()
        )
      ) {
        console.log("Zaten var title:", item.title);
        continue;
      }

      console.log("Yeni haber:", item.title);


      const date = new Date(
        item.pubDate || Date.now()
      );


      // RESİM

      let image =
        item.enclosure?.url ||
        item.enclosure?.link ||
        item.media?.$?.url ||
        item.media?.url ||
        item["media:content"]?.url ||
        item["media:thumbnail"]?.url ||
        null;


      // yoksa sayfadan çek
      if (!image) {

        try {

          const res =
            await fetch(item.link);

          const html =
            await res.text();

          const $ =
            cheerio.load(html);

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


      // kötü içerik fallback
      if (
        !aiSource ||
        aiSource.includes("Devamı için tıklayın") ||
        aiSource.includes("İçerik yüklenemedi") ||
        aiSource.length < 120
      ) {

        aiSource = summary;
      }


      // varsayılan summary
      let aiContent = summary;


      // sadece yeterli içerikte AI çağır
      if (
        aiSource &&
        aiSource.length > 120
      ) {

        aiContent =
          await aiRewrite(
            item.title,
            summary,
            aiSource
          );
      }


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


      news[category].push(obj);

      existingLinks.push(item.link);

      existingTitles.push(
        (item.title || "").trim()
      );

    }

  } catch (err) {

    console.log(
      "RSS hata:",
      url,
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


  // eski json oku

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

      news = oldNews;

    } catch (err) {

      console.log(
        "JSON okuma hatası:",
        err.message
      );
    }
  }



  // duplicate listeler

  const existingLinks = [];

  const existingTitles = [];


  Object.keys(news).forEach(cat => {

    news[cat].forEach(item => {

      existingLinks.push(item.link);

      existingTitles.push(
        (item.title || "").trim()
      );

    });

  });



  // RSS çek

  for (const url of urls) {

    await fetchFromRSS(
      url,
      news,
      existingLinks,
      existingTitles
    );
  }



  // sırala

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



  // JSON yaz

  fs.writeFileSync(

    "data/news.json",

    JSON.stringify(
      news,
      null,
      2
    )
  );


  console.log(
    "✔ HABERLER GÜNCELLENDİ"
  );
}



// ÇALIŞTIR

fetchNews();
