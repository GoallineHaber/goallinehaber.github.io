const Parser = require("rss-parser");
const fs = require("fs");

const parser = new Parser({
customFields: {
item: [
["media:content","media"],
["enclosure","enclosure"]
]
}
});

async function fetchNews(){

const url = "https://www.ahaber.com.tr/rss/spor.xml";

let news = {
futbol: [],
basketbol: [],
voleybol: [],
diger: []
};

try{

const feed = await parser.parseURL(url);

feed.items.forEach(item => {

const date = new Date(item.pubDate);

let image = null;

// foto kontrol
if(item.enclosure && item.enclosure.url){
image = item.enclosure.url;
}

if(item.media && item.media.$ && item.media.$.url){
image = item.media.$.url;
}

const link = item.link.toLowerCase();
const title = item.title.toLowerCase();

const obj = {
title: item.title,
link: item.link,
date: date.toISOString(),
image: image
};

// kategori belirleme
if(link.includes("futbol") || title.includes("futbol")){
news.futbol.push(obj);
}
else if(link.includes("basketbol") || title.includes("basketbol")){
news.basketbol.push(obj);
}
else if(link.includes("voleybol") || title.includes("voleybol")){
news.voleybol.push(obj);
}
else{
news.diger.push(obj);
}

});

// JSON kaydet
fs.writeFileSync("data/news.json", JSON.stringify(news, null, 2));

console.log("✔ Haberler güncellendi");

}catch(err){

console.log("Hata:", err);

}

}

fetchNews();
