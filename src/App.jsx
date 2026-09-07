import { useEffect, useRef, useState } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import "./App.css";
import FAQ from "./FAQ";
import Support from "./Support";
import CompressionStatus from "./CompressionStatus";
import Legal from "./Legal";
import ComingSoon from "./ComingSoon";
import Home from "./Home";
import Tools from "./Tools";
import UpdatesArchive from "./UpdatesArchive";
import UpdateDetail from "./UpdateDetail";
import History from "./History";
import { useTheme } from "./useTheme";
import { useAuth } from "./useAuth";
import { supabase } from "./supabaseClient";
import { saveActiveJob, getActiveJob, clearActiveJob } from "./jobRecovery";
import { pollJobUntilDone, downloadJobResult } from "./jobPolling";
import {
  getDefaultTargetSizeKB,
  setDefaultTargetSizeKB,
  fetchRemotePreferences,
  upsertRemotePreferences,
} from "./preferencesSync";
import { SERVER_URL } from "./config";
import { SEARCH_INDEX } from "./searchIndex";

const TARGET_OPTIONS = [
  { value: "20480", label: "⚡ Discord Shrinker — 20 MB" },
  { value: "19765", label: "19,765 KB" },
  { value: "30000", label: "30,000 KB" },
];

function Compressor() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [compressing, setCompressing] = useState(false);
  const [queueInfo, setQueueInfo] = useState(null);
  const [targetSizeKB, setTargetSizeKB] = useState(getDefaultTargetSizeKB);
  const { user } = useAuth();

  const fileInputRef = useRef(null);

  function handleTargetSizeChange(value) {
    setTargetSizeKB(value);
    setDefaultTargetSizeKB(value);
    if (user) {
      upsertRemotePreferences(user, { default_target_size_kb: parseInt(value, 10) });
    }
  }

  // If a job was still queued/processing when this page got refreshed, the
  // job itself kept running server-side the whole time - only the browser
  // forgot about it. Pick it back up automatically instead of losing it.
  useEffect(() => {
    const savedJobId = getActiveJob("compress");
    if (!savedJobId) return;

    setCompressing(true);
    setStatus("Resuming your compression from before the refresh...");

    finishJob(savedJobId).catch((error) => {
      console.log(error);
      setStatus(`Failed: ${error.message}`);
      clearActiveJob("compress");
      setCompressing(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finishJob(jobId) {
    await pollJobUntilDone(jobId, (current) => {
      setQueueInfo({
        position: current.queuePosition,
        total: current.queueTotal,
        status: current.status,
      });

      setStatus(
        current.status === "processing"
          ? "Compressing your video..."
          : "Waiting in the compression queue..."
      );
    });

    await downloadJobResult(jobId, "compressed-video.mp4");

    clearActiveJob("compress");
    setStatus("Compression complete!");
    setQueueInfo(null);
    setCompressing(false);
  }

  async function compressVideo() {
    if (!file) {
      setStatus("Please select a video first.");
      return;
    }

    // Generated and saved BEFORE the upload starts, on purpose - this way
    // the ID survives a refresh no matter when it happens: mid-upload,
    // or even in the split second after the upload finished but before
    // the server's response made it back to this page.
    const clientJobId = crypto.randomUUID();
    saveActiveJob("compress", clientJobId);

    setCompressing(true);
    setQueueInfo(null);
    setStatus("Uploading video to the compression queue...");

    try {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("targetSizeKB", targetSizeKB);
      formData.append("clientJobId", clientJobId);

      const sessionResult = user ? await supabase.auth.getSession() : null;
      const accessToken = sessionResult?.data?.session?.access_token;

      const response = await fetch(`${SERVER_URL}/compress`, {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage);
      }

      const job = await response.json();
      setQueueInfo({ position: job.queuePosition, total: job.queueTotal, status: job.status });

      await finishJob(clientJobId);
    } catch (error) {
      console.log(error);
      setStatus(`Failed: ${error.message}`);
      clearActiveJob("compress");
      setCompressing(false);

      try {
        window.localStorage.setItem(
          "discshrink_last_error",
          JSON.stringify({
            message: error.message,
            fileName: file?.name || null,
            fileType: file?.type || null,
            fileSizeMB: file ? (file.size / (1024 * 1024)).toFixed(1) : null,
            targetSizeKB,
            time: new Date().toISOString(),
          })
        );
      } catch (storageError) {
        console.log("Could not save diagnostics:", storageError);
      }
    }
  }

  function chooseFile() {
    fileInputRef.current.click();
  }

  function handleDrop(e) {
    e.preventDefault();

    const droppedFile = e.dataTransfer.files[0];

    if (droppedFile) {
      setFile(droppedFile);
      setStatus(`Selected: ${droppedFile.name}`);
    }
  }

  return (
    <>
      <section className="hero">
        <h1>
          Free Discord
          <br />
          Video Compressor
        </h1>
      </section>

      <section className="compress-card">
        <div
          className="drop-zone"
          onClick={chooseFile}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <h2>Drag & drop your video here</h2>
          <p>or click to browse</p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              chooseFile();
            }}
          >
            Choose Video
          </button>

          <input
            ref={fileInputRef}
            hidden
            type="file"
            accept="video/*,.mov,.mp4"
            onChange={(e) => {
              const selected = e.target.files[0];

              if (selected) {
                setFile(selected);
                setStatus(`Selected: ${selected.name}`);
              }
            }}
          />

          {file && <p>{file.name}</p>}
        </div>

        <p className="upload-tip">
          💡 Don't refresh or close this tab while uploading — the upload will be lost and
          you'll need to select your file and start again. Once uploading finishes, it's safe to refresh.
        </p>

        <div className="target-size-wrap">
          <label htmlFor="target-size">Target file size</label>
          <select
            id="target-size"
            value={targetSizeKB}
            onChange={(e) => handleTargetSizeChange(e.target.value)}
            disabled={compressing}
          >
            {TARGET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {queueInfo && (
          <div className={`queue-display ${queueInfo.status === "processing" ? "queue-processing" : ""}`}>
            <div className="queue-display-icon">⚡</div>
            <div className="queue-display-content">
              <strong>
                {queueInfo.status === "processing"
                  ? "Now Compressing"
                  : `Queue ${queueInfo.position} of ${queueInfo.total}`}
              </strong>
              <span>
                {queueInfo.status === "processing"
                  ? "Your video is being compressed right now."
                  : "Your video is waiting its turn."}
              </span>
            </div>
          </div>
        )}

        <button className="compress-button" onClick={compressVideo} disabled={compressing}>
          {compressing ? "Compressing..." : "Compress Video"}
        </button>

        <p>{status}</p>
      </section>
    </>
  );
}

const QUALITY_OPTIONS = [
  { value: "high", label: "🎯 High Quality — closest to original" },
  { value: "balanced", label: "⚖️ Balanced — good quality, smaller file" },
  { value: "small", label: "📦 Smaller File — most compression" },
];

const QUALITY_DESCRIPTIONS = {
  high: "Keeps quality as close to your original as possible. Expect the largest file of the three options — best when quality matters more than size.",
  balanced: "A solid middle ground: noticeably smaller than the original with quality loss most people won't notice.",
  small: "The smallest output file. Some quality loss is visible, especially in fast motion or fine detail — good when file size matters most.",
};

function Converter() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [converting, setConverting] = useState(false);
  const [queueInfo, setQueueInfo] = useState(null);
  const [quality, setQuality] = useState("balanced");
  const { user } = useAuth();

  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedJobId = getActiveJob("convert");
    if (!savedJobId) return;

    setConverting(true);
    setStatus("Resuming your conversion from before the refresh...");

    finishJob(savedJobId).catch((error) => {
      console.log(error);
      setStatus(`Failed: ${error.message}`);
      clearActiveJob("convert");
      setConverting(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finishJob(jobId) {
    await pollJobUntilDone(jobId, (current) => {
      setQueueInfo({
        position: current.queuePosition,
        total: current.queueTotal,
        status: current.status,
      });

      setStatus(
        current.status === "processing"
          ? "Converting your video..."
          : "Waiting in the conversion queue..."
      );
    });

    await downloadJobResult(jobId, "converted-video.mp4");

    clearActiveJob("convert");
    setStatus("Conversion complete!");
    setQueueInfo(null);
    setConverting(false);
  }

  async function convertVideo() {
    if (!file) {
      setStatus("Please select a video first.");
      return;
    }

    const clientJobId = crypto.randomUUID();
    saveActiveJob("convert", clientJobId);

    setConverting(true);
    setQueueInfo(null);
    setStatus("Uploading video to the conversion queue...");

    try {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("quality", quality);
      formData.append("clientJobId", clientJobId);

      const sessionResult = user ? await supabase.auth.getSession() : null;
      const accessToken = sessionResult?.data?.session?.access_token;

      const response = await fetch(`${SERVER_URL}/convert`, {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage);
      }

      const job = await response.json();
      setQueueInfo({ position: job.queuePosition, total: job.queueTotal, status: job.status });

      await finishJob(clientJobId);
    } catch (error) {
      console.log(error);
      setStatus(`Failed: ${error.message}`);
      clearActiveJob("convert");
      setConverting(false);
    }
  }

  function chooseFile() {
    fileInputRef.current.click();
  }

  function handleDrop(e) {
    e.preventDefault();

    const droppedFile = e.dataTransfer.files[0];

    if (droppedFile) {
      setFile(droppedFile);
      setStatus(`Selected: ${droppedFile.name}`);
    }
  }

  return (
    <>
      <section className="hero">
        <h1>
          Video Format
          <br />
          Converter
        </h1>
      </section>

      <section className="compress-card">
        <div
          className="drop-zone"
          onClick={chooseFile}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <h2>Drag & drop your video here</h2>
          <p>or click to browse</p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              chooseFile();
            }}
          >
            Choose Video
          </button>

          <input
            ref={fileInputRef}
            hidden
            type="file"
            accept="video/*,.mov,.mp4,.mkv,.webm,.avi"
            onChange={(e) => {
              const selected = e.target.files[0];

              if (selected) {
                setFile(selected);
                setStatus(`Selected: ${selected.name}`);
              }
            }}
          />

          {file && <p>{file.name}</p>}
        </div>

        <p className="upload-tip">
          💡 Don't refresh or close this tab while uploading — the upload will be lost and
          you'll need to select your file and start again. Once uploading finishes, it's safe to refresh.
        </p>

        <div className="target-size-wrap">
          <label htmlFor="quality">Output quality</label>
          <select
            id="quality"
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            disabled={converting}
          >
            {QUALITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="quality-hint">{QUALITY_DESCRIPTIONS[quality]}</p>
        </div>

        {queueInfo && (
          <div className={`queue-display ${queueInfo.status === "processing" ? "queue-processing" : ""}`}>
            <div className="queue-display-icon">⚡</div>
            <div className="queue-display-content">
              <strong>
                {queueInfo.status === "processing"
                  ? "Now Converting"
                  : `Queue ${queueInfo.position} of ${queueInfo.total}`}
              </strong>
              <span>
                {queueInfo.status === "processing"
                  ? "Your video is being converted right now."
                  : "Your video is waiting its turn."}
              </span>
            </div>
          </div>
        )}

        <button className="compress-button" onClick={convertVideo} disabled={converting}>
          {converting ? "Converting..." : "Convert Video"}
        </button>

        <p>{status}</p>
      </section>
    </>
  );
}

const AUDIO_FORMAT_OPTIONS = [
  { value: "mp3", label: "🎵 MP3 — smaller, universally compatible" },
  { value: "wav", label: "🎼 WAV — uncompressed, highest quality" },
];

const AUDIO_FORMAT_DESCRIPTIONS = {
  mp3: "Compressed audio that plays everywhere and keeps file sizes small — the right choice for almost everyone.",
  wav: "Uncompressed, exact audio quality with no loss from compression. Files are much larger — best for further editing or archiving.",
};

function AudioExtractor() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [queueInfo, setQueueInfo] = useState(null);
  const [audioFormat, setAudioFormat] = useState("mp3");
  const { user } = useAuth();

  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedJobId = getActiveJob("extract");
    if (!savedJobId) return;

    setExtracting(true);
    setStatus("Resuming your extraction from before the refresh...");

    finishJob(savedJobId).catch((error) => {
      console.log(error);
      setStatus(`Failed: ${error.message}`);
      clearActiveJob("extract");
      setExtracting(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finishJob(jobId) {
    await pollJobUntilDone(jobId, (current) => {
      setQueueInfo({
        position: current.queuePosition,
        total: current.queueTotal,
        status: current.status,
      });

      setStatus(
        current.status === "processing"
          ? "Extracting audio..."
          : "Waiting in the extraction queue..."
      );
    });

    // Fallback name only - the actual downloaded filename/extension comes
    // from the server via Content-Disposition, so this stays correct even
    // if the format choice below was reset by a page refresh.
    await downloadJobResult(jobId, `extracted-audio.${audioFormat}`);

    clearActiveJob("extract");
    setStatus("Extraction complete!");
    setQueueInfo(null);
    setExtracting(false);
  }

  async function extractAudio() {
    if (!file) {
      setStatus("Please select a video first.");
      return;
    }

    const clientJobId = crypto.randomUUID();
    saveActiveJob("extract", clientJobId);

    setExtracting(true);
    setQueueInfo(null);
    setStatus("Uploading video to the extraction queue...");

    try {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("audioFormat", audioFormat);
      formData.append("clientJobId", clientJobId);

      const sessionResult = user ? await supabase.auth.getSession() : null;
      const accessToken = sessionResult?.data?.session?.access_token;

      const response = await fetch(`${SERVER_URL}/extract-audio`, {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage);
      }

      const job = await response.json();
      setQueueInfo({ position: job.queuePosition, total: job.queueTotal, status: job.status });

      await finishJob(clientJobId);
    } catch (error) {
      console.log(error);
      setStatus(`Failed: ${error.message}`);
      clearActiveJob("extract");
      setExtracting(false);
    }
  }

  function chooseFile() {
    fileInputRef.current.click();
  }

  function handleDrop(e) {
    e.preventDefault();

    const droppedFile = e.dataTransfer.files[0];

    if (droppedFile) {
      setFile(droppedFile);
      setStatus(`Selected: ${droppedFile.name}`);
    }
  }

  return (
    <>
      <section className="hero">
        <h1>
          Audio
          <br />
          Extractor
        </h1>
      </section>

      <section className="compress-card">
        <div
          className="drop-zone"
          onClick={chooseFile}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <h2>Drag & drop your video here</h2>
          <p>or click to browse</p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              chooseFile();
            }}
          >
            Choose Video
          </button>

          <input
            ref={fileInputRef}
            hidden
            type="file"
            accept="video/*,.mov,.mp4,.mkv,.webm,.avi"
            onChange={(e) => {
              const selected = e.target.files[0];

              if (selected) {
                setFile(selected);
                setStatus(`Selected: ${selected.name}`);
              }
            }}
          />

          {file && <p>{file.name}</p>}
        </div>

        <p className="upload-tip">
          💡 Don't refresh or close this tab while uploading — the upload will be lost and
          you'll need to select your file and start again. Once uploading finishes, it's safe to refresh.
        </p>

        <div className="target-size-wrap">
          <label htmlFor="audio-format">Output format</label>
          <select
            id="audio-format"
            value={audioFormat}
            onChange={(e) => setAudioFormat(e.target.value)}
            disabled={extracting}
          >
            {AUDIO_FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="quality-hint">{AUDIO_FORMAT_DESCRIPTIONS[audioFormat]}</p>
        </div>

        {queueInfo && (
          <div className={`queue-display ${queueInfo.status === "processing" ? "queue-processing" : ""}`}>
            <div className="queue-display-icon">⚡</div>
            <div className="queue-display-content">
              <strong>
                {queueInfo.status === "processing"
                  ? "Now Extracting"
                  : `Queue ${queueInfo.position} of ${queueInfo.total}`}
              </strong>
              <span>
                {queueInfo.status === "processing"
                  ? "Your audio is being extracted right now."
                  : "Your video is waiting its turn."}
              </span>
            </div>
          </div>
        )}

        <button className="compress-button" onClick={extractAudio} disabled={extracting}>
          {extracting ? "Extracting..." : "Extract Audio"}
        </button>

        <p>{status}</p>
      </section>
    </>
  );
}

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, signInWithDiscord, signOut, isSupabaseConfigured } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  function handleSetTheme(next) {
    setTheme(next);
    if (user) upsertRemotePreferences(user, { theme: next });
  }

  // On sign-in, pull this account's saved preferences (if any) so the
  // theme and default target size follow them to this device too.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    fetchRemotePreferences(user).then((prefs) => {
      if (cancelled || !prefs) return;
      if (prefs.theme) setTheme(prefs.theme);
      if (prefs.default_target_size_kb) {
        setDefaultTargetSizeKB(prefs.default_target_size_kb);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const searchResults =
    searchQuery.trim().length === 0
      ? []
      : SEARCH_INDEX.filter((item) => {
          const haystack = (item.title + " " + item.snippet + " " + item.keywords).toLowerCase();
          return haystack.includes(searchQuery.trim().toLowerCase());
        }).slice(0, 6);

  function goToResult(result) {
    navigate(result.path);
    setSearchQuery("");
    setSearchOpen(false);
  }

  const toolsActive = ["/tools", "/compressor", "/converter", "/gif", "/audio"].includes(location.pathname);
  const helpActive = ["/faq", "/support", "/status"].includes(location.pathname);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-top">
          <Link className="logo" to="/">
            <span className="logo-bolt">⚡</span><span className="logo-text">DiscShrink</span>
          </Link>

          <div className="nav-links">
            <div className="nav-dropdown">
              <button
                className={toolsActive ? "nav-dropdown-btn active" : "nav-dropdown-btn"}
                onClick={() => setToolsOpen((open) => !open)}
                onBlur={() => setTimeout(() => setToolsOpen(false), 150)}
              >
                Tools <span className="nav-caret">▾</span>
              </button>

              {toolsOpen && (
                <div className="nav-dropdown-menu">
                  <span
                    className={location.pathname === "/tools" ? "active" : ""}
                    onMouseDown={() => {
                      navigate("/tools");
                      setToolsOpen(false);
                    }}
                  >
                    All Tools
                  </span>

                  <div className="nav-dropdown-divider" />

                  <span
                    className={location.pathname === "/compressor" ? "active" : ""}
                    onMouseDown={() => {
                      navigate("/compressor");
                      setToolsOpen(false);
                    }}
                  >
                    Video Compressor
                  </span>

                  <span
                    className={location.pathname === "/converter" ? "active" : ""}
                    onMouseDown={() => {
                      navigate("/converter");
                      setToolsOpen(false);
                    }}
                  >
                    Video Converter
                  </span>

                  <span
                    className={location.pathname === "/gif" ? "active" : ""}
                    onMouseDown={() => {
                      navigate("/gif");
                      setToolsOpen(false);
                    }}
                  >
                    Video to GIF <span className="nav-soon-tag">Soon</span>
                  </span>

                  <span
                    className={location.pathname === "/audio" ? "active" : ""}
                    onMouseDown={() => {
                      navigate("/audio");
                      setToolsOpen(false);
                    }}
                  >
                    Audio Extractor
                  </span>
                </div>
              )}
            </div>

            <div className="nav-dropdown">
              <button
                className={helpActive ? "nav-dropdown-btn active" : "nav-dropdown-btn"}
                onClick={() => setHelpOpen((open) => !open)}
                onBlur={() => setTimeout(() => setHelpOpen(false), 150)}
              >
                Help <span className="nav-caret">▾</span>
              </button>

              {helpOpen && (
                <div className="nav-dropdown-menu">
                  <span
                    className={location.pathname === "/faq" ? "active" : ""}
                    onMouseDown={() => {
                      navigate("/faq");
                      setHelpOpen(false);
                    }}
                  >
                    FAQ
                  </span>

                  <span
                    className={location.pathname === "/support" ? "active" : ""}
                    onMouseDown={() => {
                      navigate("/support");
                      setHelpOpen(false);
                    }}
                  >
                    Support
                  </span>

                  <span
                    className={location.pathname === "/status" ? "active" : ""}
                    onMouseDown={() => {
                      navigate("/status");
                      setHelpOpen(false);
                    }}
                  >
                    Status
                  </span>
                </div>
              )}
            </div>

            <Link
              className={location.pathname.startsWith("/updates") ? "nav-dropdown-btn active" : "nav-dropdown-btn"}
              to="/updates"
            >
              DiscShrink Updates
            </Link>

            <div className="theme-toggle" role="group" aria-label="Theme">
              <button
                type="button"
                className={theme === "original" ? "theme-toggle-btn active" : "theme-toggle-btn"}
                onClick={() => handleSetTheme("original")}
                title="Original theme"
                aria-pressed={theme === "original"}
              >
                ⚡
              </button>
              <button
                type="button"
                className={theme === "light" ? "theme-toggle-btn active" : "theme-toggle-btn"}
                onClick={() => handleSetTheme("light")}
                title="Light theme"
                aria-pressed={theme === "light"}
              >
                ☀️
              </button>
              <button
                type="button"
                className={theme === "dark" ? "theme-toggle-btn active" : "theme-toggle-btn"}
                onClick={() => handleSetTheme("dark")}
                title="Dark theme"
                aria-pressed={theme === "dark"}
              >
                🌙
              </button>
            </div>

            {isSupabaseConfigured && (
              user ? (
                <div className="nav-dropdown">
                  <button
                    className={location.pathname === "/history" ? "nav-dropdown-btn active" : "nav-dropdown-btn"}
                    onClick={() => setAccountOpen((open) => !open)}
                    onBlur={() => setTimeout(() => setAccountOpen(false), 150)}
                  >
                    {user.user_metadata?.avatar_url && (
                      <img
                        className="nav-account-avatar"
                        src={user.user_metadata.avatar_url}
                        alt=""
                      />
                    )}
                    {user.user_metadata?.full_name || user.user_metadata?.user_name || "Account"}{" "}
                    <span className="nav-caret">▾</span>
                  </button>

                  {accountOpen && (
                    <div className="nav-dropdown-menu">
                      <span
                        className={location.pathname === "/history" ? "active" : ""}
                        onMouseDown={() => {
                          navigate("/history");
                          setAccountOpen(false);
                        }}
                      >
                        Compression History
                      </span>
                      <span
                        onMouseDown={() => {
                          signOut();
                          setAccountOpen(false);
                        }}
                      >
                        Sign Out
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <button className="nav-dropdown-btn nav-signin-btn" onClick={signInWithDiscord}>
                  Sign in with Discord
                </button>
              )
            )}
          </div>
        </div>

        <div className="nav-search">
          <input
            type="text"
            placeholder="Search the site..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          />

          {searchOpen && searchQuery.trim().length > 0 && (
            <div className="nav-search-results">
              {searchResults.length === 0 ? (
                <div className="nav-search-empty">No results found.</div>
              ) : (
                searchResults.map((result, i) => (
                  <div
                    key={i}
                    className="nav-search-item"
                    onMouseDown={() => goToResult(result)}
                  >
                    <div className="nav-search-item-title">{result.title}</div>
                    <div className="nav-search-item-snippet">{result.snippet}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home goToPage={(path) => navigate(`/${path === "home" ? "" : path}`)} />} />
        <Route path="/compressor" element={<Compressor />} />
        <Route path="/converter" element={<Converter />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/faq" element={<FAQ />} />
        <Route
          path="/support"
          element={<Support goToPage={(path) => navigate(path.startsWith("/") ? path : `/${path}`)} />}
        />
        <Route path="/status" element={<CompressionStatus />} />
        <Route
          path="/gif"
          element={
            <ComingSoon
              icon="🎞️"
              title="Video to GIF"
              subtitle="Turn any clip into a shareable, looping GIF."
              description="This tool will let you upload a video and convert it straight into a GIF — perfect for reactions, memes, and quick shares. It's currently in development and will use the same fast, reliable engine that powers the video compressor."
            />
          }
        />
        <Route path="/audio" element={<AudioExtractor />} />
        <Route path="/privacy" element={<Legal section="privacy" />} />
        <Route path="/terms" element={<Legal section="terms" />} />
        <Route path="/updates" element={<UpdatesArchive />} />
        <Route path="/updates/:slug" element={<UpdateDetail />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<Home goToPage={(path) => navigate(`/${path === "home" ? "" : path}`)} />} />
      </Routes>

      <footer className="site-footer">
        <div className="site-footer-links">
          <Link to="/updates">DiscShrink Updates</Link>
          <span className="site-footer-dot">•</span>
          <Link to="/privacy">Privacy Policy</Link>
          <span className="site-footer-dot">•</span>
          <Link to="/terms">Terms of Service</Link>
        </div>
        © {new Date().getFullYear()} DiscShrink. All rights reserved.
      </footer>
    </div>
  );
}

export default App;
