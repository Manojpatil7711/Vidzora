import type {Metadata} from "next";
import{notFound}from"next/navigation";
import ToolClient from "./ToolClient";
const data={"image-compressor":["Image Compressor","Compress JPG, PNG and WebP images online for free."],"image-resizer":["Image Resizer","Resize images online to exact dimensions."],"jpg-to-pdf":["JPG to PDF","Convert images to PDF online."],"pdf-to-jpg":["PDF to JPG","Convert PDF pages to JPG images online."],"compress-pdf":["Compress PDF","Reduce PDF file size with a browser-based tool."],"merge-pdf":["Merge PDF","Combine multiple PDF files into one."],"image-converter":["JPG PNG WebP Converter","Convert JPG, PNG and WebP images online."],"image-cropper":["Image Cropper","Crop images online and download the result."]} as const;
type P={params:Promise<{tool:string}>};
export function generateStaticParams(){return Object.keys(data).map(tool=>({tool}))}
export async function generateMetadata({params}:P):Promise<Metadata>{const{tool}=await params,d=data[tool as keyof typeof data];return d?{title:d[0],description:d[1],alternates:{canonical:"/tools/"+tool}}:{}}
export default async function Page({params}:P){const{tool}=await params;if(!(tool in data))notFound();return <ToolClient tool={tool as keyof typeof data}/>}