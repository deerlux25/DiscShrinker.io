import { Link } from "react-router-dom";
import "./Home.css";
import { getLatestUpdate, CATEGORIES, formatUpdateDate } from "./updatesData";

function Home({ goToPage }) {
  const latestUpdate = getLatestUpdate();

  return (
    <section className="home-page">

      <div className="home-top">

        <div className="home-hero">
          <span className="home-eyebrow">FREE ONLINE TOOLS</span>
          <h1>
            <span className="home-bolt">⚡</span> DiscShrink
          </h1>
          <p>
            Fast, free, no-signup tools for your videos —
            compress, convert, and more, right in your browser.
          </p>
        </div>

        {latestUpdate && (
          <Link to={`/updates/${latestUpdate.slug}`} className="home-announcement">
            <span className="home-announcement-label">📢 DiscShrink Update</span>
            <h3>{latestUpdate.title}</h3>
            <p>{latestUpdate.summary}</p>
            <div className="home-announcement-footer">
              <span className="home-announcement-date">
                {CATEGORIES[latestUpdate.category]?.icon} {formatUpdateDate(latestUpdate.date)}
              </span>
              <span className="home-announcement-cta">Read Update →</span>
            </div>
          </Link>
        )}

      </div>

      <div className="home-tools-grid">

        <div className="home-tool-card">
          <div className="home-tool-icon">🎬</div>
          <h2>Video Compressor</h2>
          <p>Shrink videos to fit Discord's upload limit without losing quality.</p>
          <button
            className="home-tool-btn"
            onClick={() => goToPage("compressor")}
          >
            Open Tool
          </button>
        </div>

        <div className="home-tool-card">
          <span className="home-soon-tag">Coming Soon</span>
          <div className="home-tool-icon">🎞️</div>
          <h2>Video to GIF</h2>
          <p>Turn any clip into a shareable, looping GIF in seconds.</p>
          <button
            className="home-tool-btn home-tool-btn-soon"
            onClick={() => goToPage("gif")}
          >
            Preview
          </button>
        </div>

        <div className="home-tool-card">
          <span className="home-soon-tag">Coming Soon</span>
          <div className="home-tool-icon">🎧</div>
          <h2>Audio Extractor</h2>
          <p>Pull just the audio track out of any video file.</p>
          <button
            className="home-tool-btn home-tool-btn-soon"
            onClick={() => goToPage("audio")}
          >
            Preview
          </button>
        </div>

      </div>

      <div className="home-features">
        <span>⚡ 100% Free</span>
        <span>🔒 No Sign-up</span>
        <span>🚀 Powered by FFmpeg</span>
      </div>

    </section>
  );
}

export default Home;
