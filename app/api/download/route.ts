import { NextResponse } from "next/server";
import { URL } from "node:url";

const ALLOWED_HOSTS = new Set(["tiktok.com","www.tiktok.com","vm.tiktok.com","vt.tiktok.com"]);
const MAX_URL_LENGTH = 2048;

function isAllowedUrl(raw:string){
  try{ const u=new URL(raw); if(u.protocol!=="https:") return false; return ALLOWED_HOSTS.has(u.hostname.toLowerCase()); }catch{return false;}
}

export async function POST(req:Request){
  try{
    const body=await req.json(); const raw=typeof body?.url==="string"?body.url.trim():"";
    if(!raw||raw.length>MAX_URL_LENGTH||!isAllowedUrl(raw)) return NextResponse.json({success:false,error:"Please enter a valid public TikTok URL."},{status:400});
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),12000);
    const r=await fetch("https://www.tikwm.com/api/?url="+encodeURIComponent(raw),{headers:{"user-agent":"Vidzora/1.0"},signal:controller.signal,cache:"no-store"});
    clearTimeout(timer); if(!r.ok) throw new Error("Provider request failed.");
    const d=await r.json(); if(d?.code!==0||!d?.data) throw new Error("This video is unavailable or cannot be processed.");
    const formats=[d.data.play?{label:"Video • No watermark",url:d.data.play}:{},d.data.wmplay?{label:"Video • Watermark",url:d.data.wmplay}:{},d.data.music?{label:"Audio",url:d.data.music}:{}].filter(x=>x.url);
    if(!formats.length) throw new Error("No downloadable format was returned.");
    return NextResponse.json({success:true,platform:"TikTok",title:d.data.title||"TikTok video",thumbnail:d.data.cover,formats});
  }catch(e:any){
    const message=e?.name==="AbortError"?"The request timed out. Please try again.":(e?.message||"Unable to process this link.");
    return NextResponse.json({success:false,error:message},{status:502});
  }
}