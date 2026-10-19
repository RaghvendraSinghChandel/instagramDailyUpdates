import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { collectNews } from "./news.js";
import { renderCarousel } from "./carousel.js";
import { publishCarousel } from "./instagram.js";

const limit=Number.parseInt(process.env.NEWS_LIMIT||"5",10), output=process.env.OUTPUT_DIR||"output";
const dbPath=process.env.DATABASE_PATH||"data/news.sqlite";
await fs.mkdir(path.dirname(dbPath),{recursive:true});
const db=new Database(dbPath);
db.exec("CREATE TABLE IF NOT EXISTS stories(id TEXT PRIMARY KEY,title TEXT,url TEXT,source TEXT,published_at TEXT,processed_at TEXT)");
db.exec("CREATE TABLE IF NOT EXISTS runs(id INTEGER PRIMARY KEY AUTOINCREMENT,started_at TEXT,status TEXT,details TEXT)");
const started=new Date().toISOString();
async function alert(msg){const url=process.env.DISCORD_WEBHOOK_URL;if(!url)return;try{await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({content:`Instagram news automation failed: ${msg}`})});}catch(e){console.error("Alert failed:",e.message);}}
try {
 const fetched=await collectNews(limit*3);
 const unseen=fetched.filter(s=>!db.prepare("SELECT 1 FROM stories WHERE id=?").get(s.id)).slice(0,Math.min(10,limit));
 if(unseen.length<2) throw new Error(`Only ${unseen.length} new stories found; carousel needs at least two.`);
 const images=await renderCarousel(unseen,output);
 const caption=`Today's news brief (${new Date().toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata"})}).\\n\\nSource links are shown on each slide. Read the original reporting for full context.\\n\\n#News #DailyBrief #CurrentAffairs`;
 let result="DRY_RUN";
 if(process.env.PUBLISH_TO_INSTAGRAM==="true"){
   const urls=(process.env.PUBLIC_IMAGE_URLS||"").split(",").map(s=>s.trim()).filter(Boolean);
   if(urls.length!==images.length) throw new Error("Set PUBLIC_IMAGE_URLS to one public HTTPS URL per slide; local files cannot be fetched by Meta.");
   result=JSON.stringify(await publishCarousel(urls,caption));
 } else console.log("DRY RUN: publishing disabled. Set up public media hosting and Meta credentials before enabling.");
 const insert=db.prepare("INSERT OR IGNORE INTO stories VALUES(?,?,?,?,?,?)");
 db.transaction(items=>items.forEach(s=>insert.run(s.id,s.title,s.url,s.source,s.publishedAt,new Date().toISOString())))(unseen);
 db.prepare("INSERT INTO runs(started_at,status,details) VALUES(?,?,?)").run(started,"SUCCESS",JSON.stringify({count:unseen.length,images,result}));
 console.log(`Success: rendered ${images.length} slides. Status: ${result}`);
} catch(e) {
 console.error(e);db.prepare("INSERT INTO runs(started_at,status,details) VALUES(?,?,?)").run(started,"FAILED",e.stack||e.message);await alert(e.message);process.exitCode=1;
} finally {db.close();}
