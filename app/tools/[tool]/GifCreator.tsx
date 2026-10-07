"use client";

import ToolsAd from "../tools-ad";

import {useEffect,useMemo,useRef,useState} from "react";
import {GIFEncoder,applyPalette,quantize} from "gifenc";

const MAX_FILE=500*1024*1024;
const MAX_SECONDS=12;
const MAX_FRAMES=180;

function formatBytes(n:number){
  if(!Number.isFinite(n)||n<0)return "—";
  if(n<1024)return n+" B";
  const units=["KB","MB","GB"]; let v=n/1024;
  for(const u of units){if(v<1024)return v.toFixed(v<10?1:0)+" "+u;v/=1024}
  return v.toFixed(1)+" TB";
}
function wait(ms:number){return new Promise<void>(r=>setTimeout(r,ms));}

export default function GifCreator(){
  const [file,setFile]=useState<File|null>(null);
  const [src,setSrc]=useState("");
  const [duration,setDuration]=useState(0);
  const [start,setStart]=useState(0);
  const [end,setEnd]=useState(0);
  const [fps,setFps]=useState(10);
  const [width,setWidth]=useState(480);
  const [colors,setColors]=useState(128);
  const [loop,setLoop]=useState(true);
  const [status,setStatus]=useState("");
  const [error,setError]=useState("");
  const [progress,setProgress]=useState(0);
  const [output,setOutput]=useState("");
  const [outputSize,setOutputSize]=useState(0);
  const [working,setWorking]=useState(false);
  const videoRef=useRef<HTMLVideoElement|null>(null);
  const objectUrlRef=useRef("");
  const fileInputRef=useRef<HTMLInputElement|null>(null);

  useEffect(()=>()=>{if(objectUrlRef.current)URL.revokeObjectURL(objectUrlRef.current)},[]);
  useEffect(()=>()=>{if(output)URL.revokeObjectURL(output)},[output]);

  const range=useMemo(()=>Math.max(0,end-start),[start,end]);
  const frameCount=Math.max(1,Math.ceil(range*fps));
  const cappedFrames=Math.min(MAX_FRAMES,frameCount);

  function choose(next:File|null){
    setError("");setStatus("");
    if(output){URL.revokeObjectURL(output);setOutput("");}
    if(!next)return;
    if(!next.type.startsWith("video/")){setError("Please choose a video file.");return}
    if(next.size>MAX_FILE){setError("Maximum source size is 500 MB.");return}
    if(objectUrlRef.current)URL.revokeObjectURL(objectUrlRef.current);
    const url=URL.createObjectURL(next);objectUrlRef.current=url;
    setFile(next);setSrc(url);setProgress(0);
    if(fileInputRef.current)fileInputRef.current.value="";
  }

  function onMeta(){
    const v=videoRef.current;if(!v)return;
    const d=Number.isFinite(v.duration)?v.duration:0;
    if(!d){setError("This video does not expose a finite duration in this browser.");return}
    setDuration(d);setStart(0);setEnd(Math.min(d,MAX_SECONDS));
    setStatus(d>MAX_SECONDS?"Source is "+d.toFixed(1)+"s. GIF is limited to "+MAX_SECONDS+"s for mobile-safe processing.":"Video ready. Set the range and export.");
  }

  function clampRange(nextStart:number,nextEnd:number){
    const s=Math.max(0,Math.min(nextStart,Math.max(0,duration-0.05)));
    const e=Math.max(s+0.05,Math.min(nextEnd,duration));
    setStart(s);setEnd(e);
  }

  async function seek(video:HTMLVideoElement,time:number){
    const t=Math.max(0,Math.min(time,Math.max(0,duration-0.001)));
    await new Promise<void>((resolve,reject)=>{
      const done=()=>{cleanup();resolve()};
      const fail=()=>{cleanup();reject(new Error("Could not seek to a video frame."))};
      const timer=window.setTimeout(()=>{cleanup();reject(new Error("Video seeking timed out. Try a shorter clip or another video."))},5000);
      const cleanup=()=>{window.clearTimeout(timer);video.removeEventListener("seeked",done);video.removeEventListener("error",fail)};
      video.addEventListener("seeked",done,{once:true});video.addEventListener("error",fail,{once:true});
      video.currentTime=t;
    });
  }

  async function createGif(){
    if(!file||!videoRef.current)return;
    setError("");setOutput("");setOutputSize(0);setProgress(0);
    const v=videoRef.current;
    const s=Math.max(0,Math.min(start,duration));
    const e=Math.min(duration,Math.max(start+0.05,end));
    if(e<=s){setError("End time must be after start time.");return}
    if(e-s>MAX_SECONDS){setError("GIF range cannot exceed "+MAX_SECONDS+" seconds.");return}
    const wanted=Math.max(2,Math.ceil((e-s)*fps));
    if(wanted>MAX_FRAMES){setError("Selected settings create "+wanted+" frames. Reduce FPS or duration to stay under "+MAX_FRAMES+" frames.");return}

    setWorking(true);setStatus("Preparing GIF encoder…");
    try{
      const ratio=(v.videoWidth||1)/(v.videoHeight||1);
      const maxW=Math.min(width,720),maxH=720;
      const scale=Math.min(maxW/(v.videoWidth||1),maxH/(v.videoHeight||1),1);
      const outW=Math.max(64,Math.floor((v.videoWidth||1)*scale/2)*2);
      const outH=Math.max(64,Math.floor((v.videoHeight||1)*scale/2)*2);
      const canvas=document.createElement("canvas");canvas.width=outW;canvas.height=outH;
      const ctx=canvas.getContext("2d",{willReadFrequently:true});
      if(!ctx)throw new Error("Canvas processing is unavailable in this browser.");
      const gif=GIFEncoder({auto:true,initialCapacity:Math.max(4096,outW*outH*2)});
      const delay=Math.max(20,Math.round(1000/fps));
      const total=Math.ceil((e-s)*fps);
      for(let i=0;i<total;i++){
        const t=Math.min(e-0.001,s+i/fps);
        setStatus("Encoding frame "+(i+1)+" of "+total+"…");
        await seek(v,t);
        ctx.clearRect(0,0,outW,outH);
        ctx.drawImage(v,0,0,outW,outH);
        const rgba=ctx.getImageData(0,0,outW,outH).data;
        const palette=quantize(rgba,colors,{format:"rgb565"});
        const index=applyPalette(rgba,palette);
        gif.writeFrame(index,outW,outH,{palette,delay,repeat:loop?0:-1,dispose:1});
        setProgress(Math.round(((i+1)/total)*100));
        if(i%2===1)await wait(0);
      }
      setStatus("Finalizing GIF…");
      gif.finish();
      const sourceBytes=gif.bytes();
      const bytes=new Uint8Array(sourceBytes.byteLength);
      bytes.set(sourceBytes);
      const blob=new Blob([bytes.buffer],{type:"image/gif"});
      const url=URL.createObjectURL(blob);
      setOutput(url);setOutputSize(blob.size);
      setStatus("GIF ready • "+total+" frames • "+formatBytes(blob.size));
    }catch(err){
      setError(err instanceof Error?err.message:"GIF creation failed. Try a shorter clip or lower resolution.");
      setStatus("");setProgress(0);
    }finally{setWorking(false)}
  }

  function reset(){
    setFile(null);setSrc("");setDuration(0);setStart(0);setEnd(0);setProgress(0);setStatus("");setError("");
    if(objectUrlRef.current)URL.revokeObjectURL(objectUrlRef.current);objectUrlRef.current="";
    if(output)URL.revokeObjectURL(output);setOutput("");setOutputSize(0);
  }

  return <div className="toolBox videoToolBox gifToolBox">
    <label className="dropZone videoDropZone" tabIndex={0}>
      <input ref={fileInputRef} type="file" accept="video/*" onChange={e=>choose(e.target.files?.[0]||null)} />
      <strong>{file?file.name:"Choose a video for GIF creation"}</strong>
      <span>Browser-supported video • max 500 MB • processed locally</span>
    </label>

    {src&&<video ref={videoRef} className="videoToolPreview" src={src} controls playsInline preload="metadata" onLoadedMetadata={onMeta}/>}

    {file&&duration>0&&<div className="gifEditor">
      <div className="gifRangeHeader"><strong>Clip range</strong><span>{start.toFixed(1)}s → {end.toFixed(1)}s • {range.toFixed(1)}s</span></div>
      <div className="controls2 gifControls">
        <label>Start (sec)<input type="number" min="0" max={duration} step="0.1" value={start} disabled={working} onChange={e=>clampRange(Number(e.target.value),end)}/></label>
        <label>End (sec)<input type="number" min="0.1" max={duration} step="0.1" value={end} disabled={working} onChange={e=>clampRange(start,Number(e.target.value))}/></label>
        <label>FPS<select value={fps} disabled={working} onChange={e=>setFps(Number(e.target.value))}>{[5,8,10,12,15].map(x=><option key={x} value={x}>{x} FPS</option>)}</select></label>
        <label>Width<select value={width} disabled={working} onChange={e=>setWidth(Number(e.target.value))}>{[240,360,480,600,720].map(x=><option key={x} value={x}>{x}px</option>)}</select></label>
      </div>
      <div className="controls2 gifAdvanced">
        <label>Colors<select value={colors} disabled={working} onChange={e=>setColors(Number(e.target.value))}><option value="64">64 • smaller</option><option value="128">128 • balanced</option><option value="256">256 • quality</option></select></label>
        <label>Loop<select value={loop?"loop":"once"} disabled={working} onChange={e=>setLoop(e.target.value==="loop")}><option value="loop">Forever</option><option value="once">Play once</option></select></label>
        <div className="gifEstimate"><span>Frames</span><strong>{frameCount}</strong>{frameCount>MAX_FRAMES&&<small>Reduce range/FPS</small>}</div>
        <div className="gifEstimate"><span>Mode</span><strong>Local</strong><small>No upload</small></div>
      </div>
      <div className="gifLimits">Mobile-safe limit: {MAX_SECONDS}s / {MAX_FRAMES} frames / 720px. GIF is a 256-color format, so short clips work best.</div>
      <button className="toolRun" disabled={working||frameCount>MAX_FRAMES} onClick={createGif}>{working?"Creating GIF… "+progress+"%":"Create GIF"}</button>
      {working&&<div className="gifProgress"><div style={{width:progress+"%"}}/></div>}
      {status&&<div className="toolMessage">{status}</div>}
      {error&&<div className="toolMessage error">{error}</div>}
      {output&&<div className="gifResult">
        <div className="gifResultHead"><div><strong>GIF created</strong><span>{formatBytes(outputSize)} • {cappedFrames} frames</span></div><a className="toolRun gifDownload" href={output} download={file.name.replace(/\.[^.]+$/,"")+".gif"}>Download GIF</a></div>
        <img src={output} alt="Generated animated GIF preview"/>
      </div>}
      <button className="again" onClick={reset} disabled={working}>Reset</button>
    </div>}
    <div className="toolTrust"><b>✓ Browser-first</b><b>✓ No account</b><b>✓ No video upload</b></div>
    <div className="toolPageAd"><ToolsAd variant="rectangle" /></div>
  </div>
}
