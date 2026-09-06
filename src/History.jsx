import { useEffect, useState } from "react";
import "./History.css";
import { useAuth } from "./useAuth";
import { supabase } from "./supabaseClient";

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function HistoryRow({ row }) {
  return (
    <div className="history-row">
      <div className="history-row-top">
        <strong className="history-row-title">{row.original_filename || "Untitled video"}</strong>
        <span className={`history-status history-status-${row.status}`}>
          {row.status === "complete" ? "Complete" : "Failed"}
        </span>
      </div>

      <div className="history-row-meta">
        <span>{formatDate(row.created_at)}</span>
        <span>
          {formatBytes(row.original_size_bytes)} → {formatBytes(row.compressed_size_bytes)}
        </span>
        {row.target_size_kb && <span>Target: {(row.target_size_kb / 1024).toFixed(1)} MB</span>}
      </div>
    </div>
  );
}

function History() {
  const { user, loading, signInWithDiscord, isSupabaseConfigured } = useAuth();
  const [rows, setRows] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("compression_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setLoadError(true);
      } else {
        setRows(data);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!isSupabaseConfigured) {
    return (
      <section className="history-page">
        <div className="history-title">
          <span className="history-eyebrow">COMPRESSION HISTORY</span>
          <h1>📼 Compression History</h1>
          <p>Accounts aren't set up on this deployment yet.</p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="history-page">
        <p className="history-empty">Loading…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="history-page">
        <div className="history-title">
          <span className="history-eyebrow">COMPRESSION HISTORY</span>
          <h1>📼 Compression History</h1>
          <p>Sign in to keep a record of your past compressions.</p>
        </div>
        <button className="history-signin-btn" onClick={signInWithDiscord}>
          Sign in with Discord
        </button>
      </section>
    );
  }

  return (
    <section className="history-page">
      <div className="history-title">
        <span className="history-eyebrow">COMPRESSION HISTORY</span>
        <h1>📼 Compression History</h1>
        <p>
          A record of your past compressions — filenames and sizes only.
          Video files are always deleted right after compressing, whether
          you're signed in or not.
        </p>
      </div>

      {loadError && <p className="history-empty">Couldn't load your history right now.</p>}

      {rows !== null && rows.length === 0 && !loadError && (
        <p className="history-empty">No compressions yet — try the Video Compressor.</p>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="history-list">
          {rows.map((row) => (
            <HistoryRow key={row.id} row={row} />
          ))}
        </div>
      )}
    </section>
  );
}

export default History;
