import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function html(story, i, total) {
 return `<!doctype html><html><head><meta charset="utf-8"><style>
 *{box-sizing:border-box}html,body{margin:0;width:1080px;height:1350px}body{font-family:Arial,sans-serif;background:#101827;color:#f8fafc;padding:76px;display:flex;flex-direction:column}
 .top{font-size:24px;letter-spacing:4px;text-transform:uppercase;color:#93c5fd;font-weight:700}.rule{height:5px;width:120px;background:#60a5fa;margin:28px 0 58px}
 .pill{border:1px solid #64748b;border-radius:22px;padding:10px 18px;font-size:20px;margin-bottom:30px;width:max-content}
 h1{font-size:64px;line-height:1.12;margin:0 0 38px;font-weight:800;overflow-wrap:anywhere}.summary{font-size:34px;line-height:1.4;color:#d1d5db}
 .source{margin-top:auto;border-top:1px solid #475569;padding-top:24px;font-size:22px;color:#cbd5e1;line-height:1.4;overflow-wrap:anywhere}.footer{display:flex;justify-content:space-between;margin-top:26px;font-size:20px;color:#94a3b8}
 </style></head><body><div class="top">The Daily Brief</div><div class="rule"></div>
 <div class="pill">STORY ${i+1} OF ${total}</div><h1>${esc(story.title)}</h1>
 <div class="summary">${esc(story.summary || "Read the linked source for the full report. This slide summarizes the headline only.")}</div>
 <div class="source">Source: ${esc(story.source)}<br>${esc(story.url)}</div>
 <div class="footer"><span>News • Context • Sources</span><span>${i+1}/${total}</span></div></body></html>`;
}
export async function renderCarousel(stories, outputDir = "output") {
 await fs.mkdir(outputDir,{recursive:true}); const browser=await chromium.launch({headless:true}); const out=[];
 try { for(let i=0;i<stories.length;i++){const page=await browser.newPage({viewport:{width:1080,height:1350}});await page.setContent(html(stories[i],i,stories.length));const file=path.resolve(outputDir,`slide-${String(i+1).padStart(2,"0")}.jpg`);await page.screenshot({path:file,type:"jpeg",quality:90});out.push(file);await page.close();} }
 finally {await browser.close();} return out;
}
