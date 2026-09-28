'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="errorPage">
      <div className="errorCard">
        <span className="eyebrow">VIDZORA</span>
        <h1>Something went wrong.</h1>
        <p>We couldn’t complete that request. Please try again.</p>
        <button className="downloadBtn" onClick={() => reset()}>Try again</button>
      </div>
    </main>
  )
}
