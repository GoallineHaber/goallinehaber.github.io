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
    const res = await fetch(link);
    const html = await res.text();
    const $ = cheerio.load(html);

    let content = "";

    $(".detail-content p").each((i, el)=>{
      content += `<p>${$(el).text()}</p>`;
    });

    if(!content){
      $("article p").each((i, el)=>{
        content += `<p>${$(el).text()}</p>`;
      });
    }

    return content || "İçerik çekilemedi";

  }catch(err){
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

    const articles = $("a").slice(0, 10);

    for(let i=0;i<articles.length;i++){
      const el = articles[i];

      let link = $(el).attr("href");

      if(!link || !link.includes("/haber/")) continue;

      if(!link.startsWith("http")){
        link = "https://www.ahaber.com.tr" + link;
      }

      const title = $(el).text().trim();

      if(!title) continue;

      const content = await getFullContent(link);

      result[src.name].push({
        title,
        link,
        image: "",
        date: new Date().toISOString(),
        content
      });

      console.log("✔ çekildi:", title);
    }
  }

  fs.writeFileSync("./data/news.json", JSON.stringify(result, null, 2));
}

scrape();
