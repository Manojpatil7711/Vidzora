import type {Metadata} from "next";
import Link from "next/link";
import{notFound}from"next/navigation";
import ToolClient from "./ToolClient";
import VideoToolClient from "./VideoToolClient";
import SubtitleToolClient from "./SubtitleToolClient";
import GifCreator from "./GifCreator";

const data={
  "video-frame-extractor":["Video Frame Extractor","Extract a frame from a video online.","Capture an exact video frame locally in your browser without uploading the source.","Choose a video, enter the timestamp, then create the JPG or PNG frame.","video-thumbnail-extractor","Create a thumbnail quickly from the video."],
  "video-thumbnail-extractor":["Video Thumbnail Extractor","Create a video thumbnail online.","Generate a clean thumbnail locally from your video without uploading it.","Choose a video and create a thumbnail from about one-third into the video.","video-frame-extractor","Use Frame Extractor for an exact timestamp."],
  "video-metadata":["Video Metadata Viewer","View video metadata online.","Inspect local video file size, duration, dimensions and MIME type without uploading the video.","Choose a video and review the metadata shown on the page.","video-frame-extractor","Extract a frame when you need a visual output."],
  "video-audio-extractor":["Video Audio Extractor","Extract audio from a video online.","Capture playable WebM/Opus audio locally in your browser without uploading the video.","Choose a video and create the audio file. The video plays once during extraction.","video-metadata","Check the source video details first."],
  "video-converter-compressor":["Video Converter & Compressor","Convert and compress compatible videos to WebM online.","Convert compatible video formats to WebM and reduce output bitrate locally in your browser.","Choose a video, select quality, then let the browser create the WebM file.","video-frame-extractor","Extract a frame from the converted video when needed."],
  "subtitle-converter":["Subtitle Converter","Convert SRT and WebVTT subtitle files online.","Convert common subtitle formats locally in your browser without uploading the subtitle file.","Choose an SRT or VTT file, select the output format, then download it.","video-metadata","Inspect the related video file when needed."],
  "video-gif-creator":["Video to GIF Creator","Create GIFs from videos online.","Trim a short video clip and encode an animated GIF locally in your browser with FPS, size, palette and loop controls.","Choose a video, set the clip range and output controls, then create and download the GIF.","video-frame-extractor","Extract a precise frame when you need a still image."],
  "image-compressor":["Image Compressor","Compress JPG, PNG and WebP images online for free.","Reduce image file size in your browser without uploading the file to a server.","Choose an image, adjust quality, then generate the compressed file.","image-resizer","Resize the image to exact width and height directly in your browser."],
  "image-size-reducer":["Image Size Reducer","Reduce an image to a target KB, MB or GB size online.","Set a target file size and Vidzora will optimize the image locally in your browser without uploading it.","Choose an image, enter the target size and unit, then generate the optimized file.","image-compressor","Use the general image compressor when you want a simple smaller-file workflow."],
  "image-resizer":["Image Resizer","Resize images online to exact dimensions.","Set an exact width and height for a JPG, PNG or WebP image before downloading it.","Choose an image, enter the dimensions, then generate the resized file.","image-compressor","Compress the resized image if you need a smaller file."],
  "jpg-to-pdf":["JPG to PDF","Convert images to PDF online.","Turn one or more JPG, PNG or WebP images into a single PDF directly in your browser.","Select one or more images, then generate one PDF file.","merge-pdf","Merge the generated PDF with another PDF when needed."],
  "pdf-to-jpg":["PDF to JPG","Convert PDF pages to JPG images online.","Render each page of a PDF as a JPG image in your browser and download the results.","Choose a PDF and generate JPG files for its pages.","compress-pdf","Compress an image-based PDF when you need a smaller document."],
  "compress-pdf":["Compress PDF","Reduce PDF file size with a browser-based tool.","Rebuild an image-based PDF at a smaller size while keeping the original if the rebuilt file is not smaller.","Choose a PDF and generate the compressed version. If compression would make it larger, Vidzora keeps the original.","pdf-to-jpg","Convert PDF pages to JPG when you need individual images."],
  "merge-pdf":["Merge PDF","Combine multiple PDF files into one.","Combine selected PDF files into a single PDF directly in your browser.","Select multiple PDFs in the order you want, then generate the merged file.","jpg-to-pdf","Create a PDF from images before combining documents."],
  "image-converter":["JPG PNG WebP Converter","Convert JPG, PNG and WebP images online.","Convert an image between JPG, PNG and WebP formats in your browser.","Choose an image, select the output format, then generate the converted file.","image-compressor","Compress the converted image when you need a smaller file."],
  "image-cropper":["Image Cropper","Crop images online and download the result.","Crop an image by entering the X, Y, width and height values, then download the cropped file.","Choose an image, set the crop values, then generate the cropped image.","image-resizer","Resize the cropped image to exact dimensions."]
} as const;

type P={params:Promise<{tool:string}>};

export function generateStaticParams(){return Object.keys(data).map(tool=>({tool}))}

export async function generateMetadata({params}:P):Promise<Metadata>{
  const{tool}=await params,d=data[tool as keyof typeof data];
  return d?{title:d[0],description:d[1],alternates:{canonical:"/tools/"+tool},robots:{index:true,follow:true},openGraph:{title:d[0]+" | Vidzora",description:d[1],url:"/tools/"+tool,type:"website"},twitter:{card:"summary",title:d[0]+" | Vidzora",description:d[1]}}:{}
}

export default async function Page({params}:P){
  const{tool}=await params;
  if(!(tool in data))notFound();
  const d=data[tool as keyof typeof data];
  const isVideoTool = tool.startsWith("video-");
  const isSubtitleTool = tool === "subtitle-converter";
  const isGifTool = tool === "video-gif-creator";
  return <>
    {isGifTool ? <GifCreator /> : isSubtitleTool ? <SubtitleToolClient /> : isVideoTool ? <VideoToolClient tool={tool as "video-frame-extractor" | "video-thumbnail-extractor" | "video-metadata" | "video-audio-extractor" | "video-converter-compressor"} /> : <ToolClient tool={tool as any}/>}
    <section className="section" aria-labelledby="tool-info-title">
      <div>
        <div className="eyebrow">Vidzora TOOL GUIDE</div>
        <h2 id="tool-info-title">{d[0]}</h2>
      </div>
      <div>
        <p>{d[2]}</p>
        <h3>How to use</h3>
        <p>{d[3]}</p>
        <p><strong>Browser-first:</strong> the file processing for these tools happens on your device, so no account is required.</p>
        <p><Link className="freeToolsCta" href={"/tools/"+d[4]}>{d[5]} →</Link></p>
      </div>
    </section>
  </>
}