import { useEffect, useMemo, useState } from "react";
import "./Support.css";
import { SERVER_URL } from "./config";
import { SEARCH_INDEX } from "./searchIndex";

const ISSUE_TYPES = ["Bug Report", "Compression Failed", "Feature Request", "Other"];

const BUBBLES = [
  {
    icon: "🛠",
    title: "Troubleshooting",
    detail: "Having issues uploading? Check your connection, video type, and file size before trying again.",
    more: "Most upload failures come from an unsupported codec or a flaky connection mid-upload. Try a wired connection and re-export the clip as standard MP4/H.264 if the problem persists.",
  },
  {
    icon: "🎬",
    title: "Video Help",
    detail: "Supported files include MP4, MOV, MKV, AVI, and WebM.",
    more: "Codecs: H.264, H.265, VP9, and AAC audio all work. If your file plays fine locally but fails here, it may use an unusual/rare codec — try re-encoding it once with any video app first.",
  },
  {
    icon: "⚡",
    title: "Compression",
    detail: "DiscordShrink uses FFmpeg to reduce file size while keeping quality.",
    more: "We target your chosen size (20MB, 19,765KB, or 30,000KB) by calculating bitrate from your video's length, so longer videos get compressed harder to hit the same size.",
  },
  {
    icon: "🐛",
    title: "Bug Reports",
    detail: "Found a problem? Tell us what happened and what device or browser you use.",
    more: "Use the Contact Support button below — it automatically attaches your browser info and the last error message, so you don't have to type it all out.",
  },
  {
    icon: "💡",
    title: "Feature Requests",
    detail: "Have an idea? We are always improving DiscordShrink. Let us know what would help you most.",
    more: "Pick \"Feature Request\" as the issue type in the contact form and describe what you're trying to do — real use cases help us prioritize.",
  },
  {
    icon: "💬",
    title: "Contact / Help",
    detail: "Still need help? Provide the issue, what you tried, and any useful error details.",
    more: "Click the Contact Support button below to open the form — we'll get back to you at the email you provide.",
  },
];

function useLiveStatus() {
  const [state, setState] = useState("pending"); // pending | up | down

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`${SERVER_URL}/health`);
        if (!cancelled) setState(res.ok ? "up" : "down");
      } catch {
        if (!cancelled) setState("down");
      }
    }

    check();
    const id = setInterval(check, 20000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return state;
}

function getDiagnostics() {
  let lastError = null;
  try {
    const raw = window.localStorage.getItem("discshrink_last_error");
    if (raw) lastError = JSON.parse(raw);
  } catch {
    lastError = null;
  }

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform || "unknown",
    language: navigator.language,
    screen: `${window.screen.width}x${window.screen.height}`,
    lastError,
  };
}

function ContactModal({ open, onClose, goToPage }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [message, setMessage] = useState("");
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [diagnostics] = useState(getDiagnostics);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [submitState, setSubmitState] = useState("idle"); // idle | sending | sent | error
  const [errorMessage, setErrorMessage] = useState("");

  const relatedArticles = useMemo(() => {
    const q = message.trim().toLowerCase();
    if (q.length < 3) return [];
    return SEARCH_INDEX.filter((item) => {
      const haystack = (item.title + " " + item.snippet + " " + item.keywords).toLowerCase();
      return haystack.includes(q);
    }).slice(0, 3);
  }, [message]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitState("sending");
    setErrorMessage("");

    try {
      const res = await fetch(`${SERVER_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          issueType,
          message,
          diagnostics: includeDiagnostics ? diagnostics : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong sending your message.");
      }

      setSubmitState("sent");
    } catch (err) {
      setSubmitState("error");
      setErrorMessage(
        err.message === "Failed to fetch"
          ? "Couldn't reach the server. Check your connection and try again."
          : err.message
      );
    }
  }

  function handleClose() {
    onClose();
    // Reset for next time, but only after a successful send.
    if (submitState === "sent") {
      setName("");
      setEmail("");
      setMessage("");
      setIssueType(ISSUE_TYPES[0]);
      setSubmitState("idle");
    }
  }

  return (
    <div className="support-modal-overlay" onMouseDown={handleClose}>
      <div
        className="support-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="support-modal-close" onClick={handleClose} aria-label="Close">
          ✕
        </button>

        {submitState === "sent" ? (
          <div className="support-modal-success">
            <div className="support-modal-success-icon">✅</div>
            <h2 id="contact-modal-title">Message sent!</h2>
            <p>Thanks — we'll get back to you at {email || "the email you provided"} as soon as we can.</p>
            <button className="support-submit-btn" onClick={handleClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 id="contact-modal-title">Contact Support</h2>
            <p className="support-modal-subtitle">
              Tell us what's going on — the more detail, the faster we can help.
            </p>

            <form onSubmit={handleSubmit} className="support-form">
              <div className="support-form-row">
                <label htmlFor="contact-name">Name</label>
                <input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="support-form-row">
                <label htmlFor="contact-email">Email *</label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="support-form-row">
                <label htmlFor="contact-issue-type">Issue Type</label>
                <select
                  id="contact-issue-type"
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                >
                  {ISSUE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="support-form-row">
                <label htmlFor="contact-message">Message *</label>
                <textarea
                  id="contact-message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What happened? What did you try?"
                />
              </div>

              {relatedArticles.length > 0 && (
                <div className="support-related">
                  <span className="support-related-label">This might help:</span>
                  {relatedArticles.map((a, i) => (
                    <button
                      type="button"
                      key={i}
                      className="support-related-item"
                      onClick={() => {
                        goToPage(a.page);
                        onClose();
                      }}
                    >
                      {a.title} <span>→</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="support-diagnostics">
                <label className="support-diagnostics-toggle">
                  <input
                    type="checkbox"
                    checked={includeDiagnostics}
                    onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                  />
                  Include diagnostics (browser info{diagnostics.lastError ? " + last error" : ""})
                </label>
                <button
                  type="button"
                  className="support-diagnostics-view"
                  onClick={() => setShowDiagnostics((v) => !v)}
                >
                  {showDiagnostics ? "Hide details" : "View details"}
                </button>

                {showDiagnostics && (
                  <pre className="support-diagnostics-preview">
{JSON.stringify(diagnostics, null, 2)}
                  </pre>
                )}
              </div>

              {submitState === "error" && (
                <div className="support-form-error">{errorMessage}</div>
              )}

              <button
                type="submit"
                className="support-submit-btn"
                disabled={submitState === "sending"}
              >
                {submitState === "sending" ? "Sending…" : "Send Message"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Support({ goToPage }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const liveStatus = useLiveStatus();

  return (
    <section className="support-page">
      <div className="support-title">
        <span className="support-eyebrow">HELP CENTER</span>
        <h1>⚡ DiscordShrink Support</h1>
        <p>Need help? Find answers and solutions below.</p>
      </div>

      <div className="support-bubbles">
        {BUBBLES.map((bubble, i) => (
          <button
            type="button"
            key={bubble.title}
            className={`support-bubble ${expanded === i ? "support-bubble-expanded" : ""}`}
            onClick={() => setExpanded(expanded === i ? null : i)}
            aria-expanded={expanded === i}
          >
            <div className="support-icon" aria-hidden="true">{bubble.icon}</div>
            <h2>{bubble.title}</h2>
            <p>{bubble.detail}</p>
            {expanded === i && <p className="support-bubble-more">{bubble.more}</p>}
            <span className="support-bubble-hint">{expanded === i ? "Show less" : "Learn more"}</span>
          </button>
        ))}

        <div className="support-bubble support-bubble-status">
          <div className="support-icon" aria-hidden="true">🌐</div>
          <h2>Server Status</h2>
          <div className="support-status-rows">
            <span className="support-status-row">
              <span className={`support-status-dot support-status-${liveStatus}`} />
              Website: Online
            </span>
            <span className="support-status-row">
              <span className={`support-status-dot support-status-${liveStatus}`} />
              Compressor: {liveStatus === "pending" ? "Checking…" : liveStatus === "up" ? "Online" : "Unreachable"}
            </span>
          </div>
          <button type="button" className="support-status-link" onClick={() => goToPage("status")}>
            Full status page →
          </button>
        </div>
      </div>

      <div className="support-cta">
        <button type="button" className="support-cta-btn" onClick={() => setModalOpen(true)}>
          💬 Contact Support
        </button>
        <p className="support-cta-hint">Typically responds within a day or two.</p>
      </div>

      <ContactModal open={modalOpen} onClose={() => setModalOpen(false)} goToPage={goToPage} />
    </section>
  );
}

export default Support;
