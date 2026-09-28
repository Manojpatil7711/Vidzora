import Link from "next/link"

export default function NotFound() {
  return (
    <main className="errorPage">
      <div className="errorCard">
        <span className="eyebrow">VIDZORA • 404</span>
        <h1>Page not found.</h1>
        <p>The page you’re looking for doesn’t exist.</p>
        <Link className="downloadBtn" href="/">Back to Vidzora</Link>
      </div>
    </main>
  )
}
