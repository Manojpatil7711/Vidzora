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



const seoGuides: Record<string, { intro: string; steps: string[]; tips: string[]; faqs: [string,string][] }> = {
  "image-compressor": {
    intro: "Vidzora Image Compressor is a free browser-based image compression tool for JPG, PNG and WebP files. It is useful when an image is too large for a website upload, email attachment, online form or social post. The file is processed in your browser, so you can reduce the size without creating an account or sending the source image to a remote upload service.",
    steps: ["Choose a JPG, PNG or WebP image from your phone or computer.", "Adjust the quality setting until the preview and expected file size are suitable.", "Generate the compressed image and download the result. Keep the original if you need the highest-quality copy."],
    tips: ["For photographs, JPG normally gives a useful balance between size and visual quality.", "For screenshots, logos and graphics with transparency, PNG or WebP may be more appropriate.", "If an upload has a strict KB limit, compress first and then check the final file size before submitting it."],
    faqs: [["Does Image Compressor upload my photo?", "The tool is designed for browser-first processing, so the image is handled on your device."], ["Which formats are supported?", "JPG, PNG and WebP are supported by the tool."], ["Will compression reduce quality?", "Compression can reduce visual quality depending on the selected setting. Check the result before replacing your original file."]]
  },
  "image-resizer": {
    intro: "Vidzora Image Resizer lets you change the exact width and height of an image directly in your browser. It is useful for profile pictures, website images, banners, forms and social-media graphics that require specific pixel dimensions. No account is required, and the workflow is designed to keep the source file on your device.",
    steps: ["Select the image you want to resize.", "Enter the required width and height in pixels and review the settings.", "Generate the resized image and download it when the dimensions are correct."],
    tips: ["Keep the aspect ratio when possible to avoid stretched faces and distorted graphics.", "Use exact pixel dimensions when a website or form specifies a required size.", "Resize before compression when you need both precise dimensions and a smaller final file."],
    faqs: [["Can I resize JPG, PNG and WebP?", "The image tool supports common browser image formats including JPG, PNG and WebP."], ["Can I set exact dimensions?", "Yes. Enter the width and height you need before generating the output."], ["Is an account required?", "No account is required for the browser-based tool."]]
  },
  "image-cropper": {
    intro: "Vidzora Image Cropper provides a simple way to remove unwanted areas from an image and create a smaller composition. It is useful for profile photos, document images, thumbnails, product pictures and social graphics. The crop is performed in the browser and the resulting image can be downloaded without a separate editing application.",
    steps: ["Choose the source image from your device.", "Set the crop position and dimensions so only the required area remains.", "Generate and download the cropped image, then resize or compress it if required."],
    tips: ["Crop first when the unwanted area is large, then resize the remaining image.", "For profile pictures, leave enough space around the subject before applying a square crop.", "Keep a copy of the original image because cropping permanently changes the composition of the exported file."],
    faqs: [["What is image cropping?", "Cropping removes parts of an image outside the selected rectangle."], ["Can I use the cropper on phone?", "Yes. The page is designed for a mobile-friendly browser workflow."], ["Can I resize after cropping?", "Yes. The related Image Resizer tool can be used after cropping."]]
  },
  "jpg-to-pdf": {
    intro: "Vidzora JPG to PDF converts one or more JPG, PNG or WebP images into a PDF directly in the browser. This is useful for forms, scanned pages, receipts, assignments, applications and image collections that need to be submitted as a single document. The browser-first workflow avoids the need for an account and keeps the process simple on both mobile and desktop.",
    steps: ["Select one or more images in the order you want them to appear.", "Check the selected files and generate the PDF.", "Download the resulting PDF and open it once to verify that every page is present and readable."],
    tips: ["Select pages in the correct order when preparing a multi-page document.", "Use clear scans and photographs with enough resolution for readable text.", "If the resulting PDF is too large, use Vidzora Compress PDF afterward."],
    faqs: [["Can I convert multiple images?", "Yes. The tool is designed to combine selected images into one PDF."], ["Does it require an account?", "No account is required."], ["Can I compress the generated PDF?", "Yes. Use the Compress PDF tool after creating the document."]]
  },
  "pdf-to-jpg": {
    intro: "Vidzora PDF to JPG converts PDF pages into JPG images in your browser. It can be useful when a website accepts images instead of PDF documents, when you need a preview of individual pages, or when you want to share a specific document page as an image. The output is generated from the PDF pages without requiring an account.",
    steps: ["Choose the PDF file you want to process.", "Let the browser render the document pages and generate JPG outputs.", "Download the generated page images and check their readability before using them elsewhere."],
    tips: ["Large PDFs can take longer to render because every page becomes an image.", "For text-heavy documents, keep the output resolution high enough to read small text.", "If you need one combined document afterward, JPG to PDF can turn the selected images back into a PDF."],
    faqs: [["Does every PDF convert the same way?", "PDFs with unusual features, encryption or unsupported content may not render identically."], ["Can I convert individual pages?", "The tool renders PDF pages as individual JPG outputs."], ["Is the source uploaded?", "The tool is designed around browser-side processing."]]
  },
  "compress-pdf": {
    intro: "Vidzora Compress PDF is designed to reduce the size of supported PDF files directly in the browser. Smaller PDFs are easier to attach to email, upload to application forms and share through messaging services. The tool rebuilds supported image-based PDFs and keeps the original when the generated version would not actually be smaller.",
    steps: ["Choose the PDF you want to reduce.", "Allow the browser to process and rebuild the supported pages.", "Download the smaller result and compare its size with the original before submitting it."],
    tips: ["Keep the original PDF as a backup before compression.", "Scanned and image-heavy PDFs generally have more opportunity for size reduction.", "If the output is not smaller, keeping the original preserves quality and avoids unnecessary conversion."],
    faqs: [["Will every PDF become smaller?", "No. Some PDFs are already optimized or contain content that cannot be reduced effectively."], ["Will the original be deleted?", "No. Keep your original file on your device; the tool generates a separate result."], ["Can I convert the pages to JPG instead?", "Yes. Use PDF to JPG when individual page images are more useful."]]
  },
  "merge-pdf": {
    intro: "Vidzora Merge PDF combines multiple PDF files into a single document in your browser. It is useful for applications, invoices, scanned documents, project paperwork and any workflow where several PDFs need to become one ordered file. You can select the documents in the sequence you want and create one downloadable PDF without an account.",
    steps: ["Select the PDF files you want to combine.", "Arrange or select them in the required document order.", "Generate the merged PDF and open it to confirm that the pages and order are correct."],
    tips: ["Name files clearly before selecting them so you can identify the correct order.", "Keep a copy of the individual PDFs until the merged document has been checked.", "If some pages are images, convert them to PDF first with JPG to PDF and then merge the documents."],
    faqs: [["Can I merge more than two PDFs?", "The tool is designed for combining multiple selected PDF files."], ["Does merging require an account?", "No account is required."], ["Can I create a PDF from images first?", "Yes. JPG to PDF can create a PDF from images before you merge it."]]
  }
};

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
        <div className="eyebrow">VIDZORA TOOL GUIDE</div>
        <h2 id="tool-info-title">{d[0]}</h2>
      </div>
      <div>
        <p>{d[2]}</p>
        <p>{seoGuides[tool]?.intro}</p>
        <h3>How to use {d[0]}</h3>
        <ol>{(seoGuides[tool]?.steps ?? [d[3]]).map((step)=><li key={step}>{step}</li>)}</ol>
        <h3>Tips for better results</h3>
        <ul>{(seoGuides[tool]?.tips ?? []).map((tip)=><li key={tip}>{tip}</li>)}</ul>
        <p><strong>Privacy:</strong> this is a browser-first workflow and no account is required.</p>
        <p><Link className="freeToolsCta" href={"/tools/"+d[4]}>{d[5]} →</Link> · <Link className="freeToolsCta" href="/tools">View all free tools →</Link></p>
      </div>
    </section>
    {seoGuides[tool] && <section className="section faq" aria-labelledby="tool-faq-title">
      <div><div className="eyebrow">FAQ</div><h2 id="tool-faq-title">Common questions</h2></div>
      <div>{seoGuides[tool].faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
    </section>}
  </>
}