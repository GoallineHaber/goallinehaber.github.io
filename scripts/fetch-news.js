const Parser = require("rss-parser");
const fs = require("fs");

const parser = new Parser({
customFields: {
item: [
["media:content","media"],
["enclosure","enclosure"],
["category","category"]
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

// foto
if(item.enclosure && item.enclosure.url){
image = item.enclosure.url;
}

if(item.media && item.media.$ && item.media.$.url){
image = item.media.$.url;
}

const category = (item.category || "").toLowerCase();
const title = item.title.toLowerCase();

let obj;

// kategori belirleme + başlığa kategori ekleme
if(category.includes("futbol") || title.includes("futbol")){
obj = {
title: "Futbol: " + item.title,
link: item.link,
date: date.toISOString(),
image: image
};
news.futbol.push(obj);
}

else if(category.includes("basketbol") || title.includes("basketbol")){
obj = {
title: "Basketbol: " + item.title,
link: item.link,
date: date.toISOString(),
image: image
};
news.basketbol.push(obj);
}

else if(category.includes("voleybol") || title.includes("voleybol")){
obj = {
title: "Voleybol: " + item.title,
link: item.link,
date: date.toISOString(),
image: image
};
news.voleybol.push(obj);
}

else{
obj = {
title: "Diğer: " + item.title,
link: item.link,
date: date.toISOString(),
image: image
};
news.diger.push(obj);
}

});

fs.writeFileSync("data/news.json", JSON.stringify(news,null,2));

console.log("✔ Haberler kategorilere ayrıldı");

}catch(err){

console.log("Hata:",err);

}

}

fetchNews();
