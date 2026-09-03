import "./Support.css";

function Support() {
  return (
    <section className="support-page">
      <div className="support-title">
        <span className="support-eyebrow">HELP CENTER</span>
        <h1>⚡ DiscordShrink Support</h1>
        <p>Need help? Find answers and solutions below.</p>
      </div>

      <div className="support-bubbles">
        <div className="support-bubble">
          <div className="support-icon" aria-hidden="true">🛠</div>
          <h2>Troubleshooting</h2>
          <p>
            Having issues uploading? Check your connection, video type,
            and file size before trying again.
          </p>
        </div>

        <div className="support-bubble">
          <div className="support-icon" aria-hidden="true">🎬</div>
          <h2>Video Help</h2>
          <p>
            Supported files include MP4, MOV, MKV, AVI, and WebM.
          </p>
        </div>

        <div className="support-bubble">
          <div className="support-icon" aria-hidden="true">⚡</div>
          <h2>Compression</h2>
          <p>
            DiscordShrink uses FFmpeg to reduce file size while
            keeping quality.
          </p>
        </div>

        <div className="support-bubble">
          <div className="support-icon" aria-hidden="true">🌐</div>
          <h2>Server Status</h2>
          <p>
            Website: Online ✅
            <br />
            Compressor: Online ✅
          </p>
        </div>

        <div className="support-bubble">
          <div className="support-icon" aria-hidden="true">🐛</div>
          <h2>Bug Reports</h2>
          <p>
            Found a problem? Tell us what happened and what device
            or browser you use.
          </p>
        </div>

        <div className="support-bubble">
          <div className="support-icon" aria-hidden="true">💡</div>
          <h2>Feature Requests</h2>
          <p>
            Have an idea? We are always improving DiscordShrink.
            Let us know what would help you most.
          </p>
        </div>

        <div className="support-bubble">
          <div className="support-icon" aria-hidden="true">💬</div>
          <h2>Contact / Help</h2>
          <p>
            Still need help? Provide the issue, what you tried,
            and any useful error details.
          </p>
        </div>
      </div>
    </section>
  );
}

export default Support;
