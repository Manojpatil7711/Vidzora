import type {Metadata} from "next";
import Link from "next/link";
import{notFound}from"next/navigation";
import ToolClient from "./ToolClient";

const data={
  "image-compressor":["Image Compressor","Compress JPG, PNG and WebP images online for free.","Reduce image file size in your browser without uploading the file to a server.","Choose an image, adjust quality, then generate the compressed file.","image-resizer","Resize the image to exact width and height directly in your browser."],
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
  return d?{title:d[0],description:d[1],alternates:{canonical:"/tools/"+tool}}:{}
}

export default async function Page({params}:P){
  const{tool}=await params;
  if(!(tool in data))notFound();
  const d=data[tool as keyof typeof data];
  return <>
    <ToolClient tool={tool as keyof typeof data}/>
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