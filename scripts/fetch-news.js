const fs = require("fs");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const sources = [
  {
    name: "gundem",
    url: "https://www.ahaber.com.tr/gundem"
  }
];

async function getFullContent(link){
  try{
    const res = await fetch(link, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = await res.text();
    const $ = cheerio.load(html);

    let content = "";

    // 🔥 TÜM PARAGRAFLARI AL (EN SAĞLAM YÖNTEM)
    $("p").each((i, el)=>{
      const text = $(el).text().trim();

      if(text.length > 50){ // çöp filtre
        content += `<p>${text}</p>`;
      }
    });

    return content || "İçerik çekilemedi";

  }catch(err){
    console.log("HATA:", err.message);
    return "İçerik alınamadı";
  }
}

async function scrape(){
  const result = {};

  for(const src of sources){
    const res = await fetch(src.url);
    const html = await res.text();
    const $ = cheerio.load(html);

    result[src.name] = [];

    const links = $("a");

    for(let i=0;i<links.length;i++){
      let link = $(links[i]).attr("href");

      if(!link || !link.includes("/haber/")) continue;

      if(!link.startsWith("http")){
        link = "https://www.ahaber.com.tr" + link;
      }

      const title = $(links[i]).text().trim();

      if(!title || title.length < 10) continue;

      const content = await getFullContent(link);

      result[src.name].push({
        title,
        link,
        image: "",
        date: new Date().toISOString(),
        content
      });

      console.log("✔:", title);
    }
  }

  fs.writeFileSync("./data/news.json", JSON.stringify(result, null, 2));
}

scrape();
