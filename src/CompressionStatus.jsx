import { useEffect, useRef, useState } from "react";
import "./CompressionStatus.css";
import { SERVER_URL } from "./config";

const POLL_INTERVAL_MS = 15000;
const UPTIME_HISTORY_LENGTH = 30;

// Manually curated - update this list when something notable happens.
// Newest first.
const INCIDENT_LOG = [
  {
    date: "No incidents reported",
    detail: "Everything's running smoothly. Check back here if something ever breaks.",
    resolved: true,
  },
];

function useHealthPolling() {
  const [health, setHealth] = useState(null); // null = not loaded yet
  const [stats, setStats] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [checking, setChecking] = useState(true);
  const [history, setHistory] = useState(
    Array.from({ length: UPTIME_HISTORY_LENGTH }, () => null)
  );
  const intervalRef = useRef(null);

  async function runCheck() {
    setChecking(true);
    const startedAt = performance.now();

    try {
      const res = await fetch(`${SERVER_URL}/health`);
      const elapsed = Math.round(performance.now() - startedAt);
      setLatencyMs(elapsed);

      if (!res.ok) throw new Error("Bad response");

      const data = await res.json();
      setHealth({ ok: true, ...data });
      setHistory((prev) => [...prev.slice(1), true]);
    } catch {
      setLatencyMs(null);
      setHealth({ ok: false, ffmpeg: false, compressionServer: false });
      setHistory((prev) => [...prev.slice(1), false]);
    } finally {
      setChecking(false);
    }

    try {
      const res = await fetch(`${SERVER_URL}/stats`);
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
      // Stats are a nice-to-have; leave last known value on failure.
    }
  }

  useEffect(() => {
    runCheck();
    intervalRef.current = setInterval(runCheck, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { health, stats, latencyMs, checking, history };
}

function StatusDot({ state }) {
  // state: "up" | "down" | "pending"
  return <span className={`status-dot status-dot-${state}`} aria-hidden="true" />;
}

function CompressionStatus() {
  const { health, stats, latencyMs, checking, history } = useHealthPolling();

  const serverState = health === null ? "pending" : health.ok ? "up" : "down";
  const ffmpegState = health === null ? "pending" : health.ffmpeg ? "up" : "down";
  // The page rendered, so the website itself is obviously reachable.
  const websiteState = "up";

  const allUp = serverState === "up" && ffmpegState === "up";
  const overallLabel =
    health === null
      ? "Checking systems…"
      : allUp
      ? "All systems operational"
      : "Some systems are having issues";

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

          <span className={`status-live ${allUp ? "" : "status-live-degraded"}`}>
            <span
              className={`status-live-dot ${allUp ? "" : "status-live-dot-degraded"}`}
              aria-hidden="true"
            />
            {overallLabel}
          </span>
        </div>

        <div className="status-list">
          <div className="status-item">
            <div className="status-label">
              <span className="status-icon" aria-hidden="true">🌐</span>
              <span>Website</span>
            </div>
            <div className="status-value">
              <StatusDot state={websiteState} />
              <strong>Online</strong>
            </div>
          </div>

          <div className="status-item">
            <div className="status-label">
              <span className="status-icon" aria-hidden="true">☁️</span>
              <span>Compression Server</span>
            </div>
            <div className="status-value">
              <StatusDot state={serverState} />
              <strong>
                {serverState === "pending" ? "Checking…" : serverState === "up" ? "Connected" : "Unreachable"}
              </strong>
              {latencyMs !== null && serverState === "up" && (
                <span className="status-latency">{latencyMs}ms</span>
              )}
            </div>
          </div>

          <div className="status-item">
            <div className="status-label">
              <span className="status-icon" aria-hidden="true">⚙️</span>
              <span>FFmpeg Engine</span>
            </div>
            <div className="status-value">
              <StatusDot state={ffmpegState} />
              <strong>
                {ffmpegState === "pending" ? "Checking…" : ffmpegState === "up" ? "Ready" : "Not Responding"}
              </strong>
            </div>
          </div>
        </div>

        <div className="status-uptime">
          <div className="status-uptime-header">
            <span>Last {UPTIME_HISTORY_LENGTH} checks</span>
            <span className="status-uptime-caption">
              {checking ? "checking now…" : `updates every ${POLL_INTERVAL_MS / 1000}s`}
            </span>
          </div>
          <div className="status-uptime-bar">
            {history.map((ok, i) => (
              <span
                key={i}
                className={
                  ok === null
                    ? "status-uptime-block status-uptime-unknown"
                    : ok
                    ? "status-uptime-block status-uptime-up"
                    : "status-uptime-block status-uptime-down"
                }
                title={ok === null ? "No data yet" : ok ? "Operational" : "Down"}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="status-stats-grid">
        <div className="status-stat-card">
          <span className="status-stat-value">
            {stats ? stats.compressionsToday : "—"}
          </span>
          <span className="status-stat-label">Compressed today</span>
        </div>
        <div className="status-stat-card">
          <span className="status-stat-value">
            {stats && stats.avgCompressionSeconds !== null ? `${stats.avgCompressionSeconds}s` : "—"}
          </span>
          <span className="status-stat-label">Avg. compression time</span>
        </div>
        <div className="status-stat-card">
          <span className="status-stat-value">
            {stats && stats.totalCompressions
              ? `${Math.round((stats.successCount / stats.totalCompressions) * 100)}%`
              : "—"}
          </span>
          <span className="status-stat-label">Success rate</span>
        </div>
      </div>

      <div className="status-incidents">
        <h3>Incident History</h3>
        <div className="status-incidents-list">
          {INCIDENT_LOG.map((incident, i) => (
            <div key={i} className="status-incident-item">
              <span className={`status-incident-dot ${incident.resolved ? "" : "status-incident-active"}`} />
              <div>
                <div className="status-incident-date">{incident.date}</div>
                <div className="status-incident-detail">{incident.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CompressionStatus;
