import { useEffect, useRef, useState } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import "./App.css";
import FAQ from "./FAQ";
import Support from "./Support";
import CompressionStatus from "./CompressionStatus";
import Legal from "./Legal";
import ComingSoon from "./ComingSoon";
import Home from "./Home";
import UpdatesArchive from "./UpdatesArchive";
import UpdateDetail from "./UpdateDetail";
import History from "./History";
import { useTheme } from "./useTheme";
import { useAuth } from "./useAuth";
import { supabase } from "./supabaseClient";
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

  async function compressVideo() {
    if (!file) {
      setStatus("Please select a video first.");
      return;
    }

    setCompressing(true);
    setQueueInfo(null);
    setStatus("Uploading video to the compression queue...");

    try {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("targetSizeKB", targetSizeKB);

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

      let completed = false;
      while (!completed) {
        const statusResponse = await fetch(`${SERVER_URL}/compress/status/${job.jobId}`);
        if (!statusResponse.ok) throw new Error("Could not check compression queue status.");

        const current = await statusResponse.json();
        setQueueInfo({
          position: current.queuePosition,
          total: current.queueTotal,
          status: current.status,
        });

        if (current.status === "failed") {
          throw new Error(current.error || "Video compression failed.");
        }

        if (current.status === "complete") {
          completed = true;
          break;
        }

        if (current.status === "processing") {
          setStatus("Compressing your video...");
        } else {
          setStatus("Waiting in the compression queue...");
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const downloadResponse = await fetch(`${SERVER_URL}/compress/download/${job.jobId}`);
      if (!downloadResponse.ok) throw new Error("Compression finished, but the video could not be downloaded.");

      const blob = await downloadResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "compressed-video.mp4";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setStatus("Compression complete!");
      setQueueInfo(null);
    } catch (error) {
      console.log(error);
      setStatus(`Failed: ${error.message}`);

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

    setCompressing(false);
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

  const toolsActive = ["/compressor", "/gif", "/audio"].includes(location.pathname);
  const helpActive = ["/faq", "/support", "/status"].includes(location.pathname);

  return (
    <div className="app">
      <nav className="navbar">
        <Link className="logo" to="/">
          <span className="logo-bolt">⚡</span><span className="logo-text">DiscShrink</span>
        </Link>

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
                  className={location.pathname === "/compressor" ? "active" : ""}
                  onMouseDown={() => {
                    navigate("/compressor");
                    setToolsOpen(false);
                  }}
                >
                  Video Compressor
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
                  Audio Extractor <span className="nav-soon-tag">Soon</span>
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
      </nav>

      <Routes>
        <Route path="/" element={<Home goToPage={(path) => navigate(`/${path === "home" ? "" : path}`)} />} />
        <Route path="/compressor" element={<Compressor />} />
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
        <Route
          path="/audio"
          element={
            <ComingSoon
              icon="🎧"
              title="Audio Extractor"
              subtitle="Pull the audio track out of any video file."
              description="Upload a video and get back just the audio — as MP3 or WAV — without the video. Great for saving a song, a voiceover, or a soundbite from a clip. Coming soon."
            />
          }
        />
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
