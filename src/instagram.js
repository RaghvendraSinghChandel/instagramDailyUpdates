const base = "https://graph.facebook.com/v23.0";
async function post(path, params) {
 const res=await fetch(`${base}/${path}`,{method:"POST",body:new URLSearchParams(params)});
 const json=await res.json(); if(!res.ok || json.error) throw new Error(json.error?.message || `Meta API HTTP ${res.status}`); return json;
}
export async function publishCarousel(urls, caption) {
 const user=process.env.IG_USER_ID, token=process.env.IG_ACCESS_TOKEN;
 if(!user || !token) throw new Error("Missing IG_USER_ID or IG_ACCESS_TOKEN.");
 if(urls.length<2 || urls.length>10 || urls.some(u=>!/^https:\/\//i.test(u))) throw new Error("Carousel needs 2–10 public HTTPS image URLs.");
 const children=[];
 for(const image_url of urls) children.push((await post(`${user}/media`,{image_url,is_carousel_item:"true",access_token:token})).id);
 const parent=await post(`${user}/media`,{media_type:"CAROUSEL",children:children.join(","),caption,access_token:token});
 return post(`${user}/media_publish`,{creation_id:parent.id,access_token:token});
}
