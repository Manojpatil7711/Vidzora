import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Vidzora",
  description: "Contact Vidzora for website feedback, privacy questions, accessibility issues or reports about content and functionality.",
  alternates: { canonical: "/contact" },
  robots: { index: true, follow: true }
};

export default function Contact() {
  return <main className="legal">
    <Link href="/">← Vidzora home</Link>
    <h1>Contact Vidzora</h1>
    <p>Use the email below to report a broken tool, ask a privacy question, suggest an accessibility improvement, or raise a concern about material processed through Vidzora.</p>
    <h2>Email</h2>
    <p><a href="mailto:Manojpatil7711@gmail.com">Manojpatil7711@gmail.com</a></p>
    <p>When reporting a technical problem, include the tool page URL, your browser/device type, and the error message if one appears. Do not email passwords, private download links or other sensitive information.</p>
    <h2>Content and copyright concerns</h2>
    <p>If your message concerns content hosted by another service, include the relevant public page URL and explain the concern. Do not send copyrighted files unless you have the right to share them.</p>
    <p>Read our <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Use</Link> for more information.</p>
  </main>;
}
