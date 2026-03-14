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

const url="https://www.ahaber.com.tr/rss/spor.xml";

let news={
futbol:[],
basketbol:[],
voleybol:[],
diger:[]
};

try{

const feed=await parser.parseURL(url);
const now=new Date();

feed.items.forEach(item=>{

const date=new Date(item.pubDate);

if((now-date) > 48*60*60*1000) return;

let image=null;

if(item.enclosure && item.enclosure.url){
image=item.enclosure.url;
}

if(item.media && item.media.$ && item.media.$.url){
image=item.media.$.url;
}

const link=item.link.toLowerCase();

const obj={
title:item.title,
link:item.link,
date:date.toISOString(),
image:image
};

if(link.includes("futbol")){
news.futbol.push(obj);
}
else if(link.includes("basketbol")){
news.basketbol.push(obj);
}
else if(link.includes("voleybol")){
news.voleybol.push(obj);
}
else{
news.diger.push(obj);
}

});

fs.writeFileSync("data/news.json",JSON.stringify(news,null,2));

console.log("Haberler güncellendi");

}catch(err){

console.log(err);

}

}

fetchNews();
