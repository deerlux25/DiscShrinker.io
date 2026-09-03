import "./CompressionStatus.css";

function CompressionStatus() {
  return (
    <section className="status-page">

      <div className="status-title">
        <span className="status-eyebrow-page">LIVE MONITOR</span>
        <h1><span className="status-bolt">⚡</span> DiscShrink Status</h1>
        <p>Real-time status of the compressor and its services.</p>
      </div>

      <div className="status-card" aria-labelledby="system-status-title">
      <div className="status-card-header">
        <div>
          <span className="status-eyebrow">LIVE MONITOR</span>
          <h2 id="system-status-title">⚡ System Status</h2>
        </div>

        <span className="status-live">
          <span className="status-live-dot" aria-hidden="true" />
          All systems operational
        </span>
      </div>

      <div className="status-list">
        <div className="status-item">
          <div className="status-label">
            <span className="status-icon" aria-hidden="true">🌐</span>
            <span>Website</span>
          </div>
          <div className="status-value">
            <span className="status-dot" aria-hidden="true" />
            <strong>Online</strong>
          </div>
        </div>

        <div className="status-item">
          <div className="status-label">
            <span className="status-icon" aria-hidden="true">☁️</span>
            <span>Compression Server</span>
          </div>
          <div className="status-value">
            <span className="status-dot" aria-hidden="true" />
            <strong>Connected</strong>
          </div>
        </div>

        <div className="status-item">
          <div className="status-label">
            <span className="status-icon" aria-hidden="true">⚙️</span>
            <span>FFmpeg Engine</span>
          </div>
          <div className="status-value">
            <span className="status-dot" aria-hidden="true" />
            <strong>Ready</strong>
          </div>
        </div>
      </div>
      </div>

    </section>
  );
}

export default CompressionStatus;
