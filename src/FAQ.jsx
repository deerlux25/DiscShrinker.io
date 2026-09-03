import "./FAQ.css";

function FAQ() {
  return (
    <section className="faq-page">
      <div className="faq-title">
        <span className="faq-eyebrow">QUICK ANSWERS</span>
        <h1>⚡ DiscordShrink FAQ</h1>
        <p>Quick answers about videos, files, and compression.</p>
      </div>

      <div className="faq-bubbles">
        <div className="faq-bubble">
          <div className="faq-icon" aria-hidden="true">🎬</div>
          <h2>Files</h2>
          <p>Supports MP4, MOV, MKV, AVI, WebM, and HEVC videos.</p>
        </div>

        <div className="faq-bubble">
          <div className="faq-icon" aria-hidden="true">🧩</div>
          <h2>Codecs</h2>
          <p>Works with H.264, H.265, VP9, AAC, and more.</p>
        </div>

        <div className="faq-bubble">
          <div className="faq-icon" aria-hidden="true">⚙️</div>
          <h2>Powered By</h2>
          <p>Built using React, Node.js, Vite, and FFmpeg.</p>
        </div>

        <div className="faq-bubble">
          <div className="faq-icon" aria-hidden="true">💾</div>
          <h2>Compression</h2>
          <p>Shrinks videos while keeping great quality.</p>
        </div>

        <div className="faq-bubble">
          <div className="faq-icon" aria-hidden="true">🎮</div>
          <h2>Gaming Clips</h2>
          <p>Perfect for OBS, gameplay, and clips.</p>
        </div>

        <div className="faq-bubble">
          <div className="faq-icon" aria-hidden="true">🔒</div>
          <h2>Privacy</h2>
          <p>Videos are processed and removed after use.</p>
        </div>

        <div className="faq-bubble">
          <div className="faq-icon" aria-hidden="true">❌</div>
          <h2>Problems?</h2>
          <p>Check file type, size, and connection.</p>
        </div>

        <div className="faq-bubble">
          <div className="faq-icon" aria-hidden="true">💬</div>
          <h2>Discord</h2>
          <p>Made to help videos fit Discord limits.</p>
        </div>
      </div>
    </section>
  );
}

export default FAQ;
