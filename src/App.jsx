import './index.css';

function App() {
  return (
    <div className="app-layout">
      {/* ── Navigation ── */}
      <header className="app-nav">
        <div className="app-nav-inner">
          <div className="app-nav-brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="currentColor"
                opacity="0.9"
              />
            </svg>
            <span>Keynote</span>
          </div>
          <span className="app-nav-tagline">Session Word Cloud</span>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="app-main">
        <div className="app-container">
          {/* Hero */}
          <section className="hero animate-fade-in">
            <div className="hero-badge badge badge-primary">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
                <circle cx="4" cy="4" r="4" />
              </svg>
              AI-Powered Analysis
            </div>
            <h1 className="hero-title">
              Turn mentoring sessions<br />
              into <span className="hero-highlight">key insights</span>
            </h1>
            <p className="hero-subtitle">
              Record or upload a session audio file. Keynote uses Gemini AI to extract
              the most meaningful topics and render them as a beautiful word cloud.
            </p>
          </section>

          {/* Placeholder — will be replaced in Phase 1+ */}
          <div className="placeholder-panel card animate-slide-up">
            <div className="placeholder-inner">
              <div className="placeholder-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 4a7 7 0 017 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="placeholder-label">Ready to build</p>
              <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                Features will appear here as each phase is completed.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <span className="text-subtle" style={{ fontSize: 'var(--text-xs)' }}>
          Keynote · Powered by Gemini AI
        </span>
      </footer>
    </div>
  );
}

export default App;
