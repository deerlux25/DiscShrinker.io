import { useRef, useState } from "react";
import "./App.css";
import FAQ from "./FAQ";
import Support from "./Support";
import CompressionStatus from "./CompressionStatus";
import Legal from "./Legal";
import ComingSoon from "./ComingSoon";
import Home from "./Home";
import { SERVER_URL } from "./config";
import { SEARCH_INDEX } from "./searchIndex";

const TARGET_OPTIONS = [
  { value: "20480", label: "⚡ Discord Shrinker — 20 MB" },
  { value: "19765", label: "19,765 KB" },
  { value: "30000", label: "30,000 KB" },
];

function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [compressing, setCompressing] = useState(false);
  const [targetSizeKB, setTargetSizeKB] = useState("20480");
  const [page, setPage] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const fileInputRef = useRef(null);

  const searchResults =
    searchQuery.trim().length === 0
      ? []
      : SEARCH_INDEX.filter((item) => {
          const haystack = (item.title + " " + item.snippet + " " + item.keywords).toLowerCase();
          return haystack.includes(searchQuery.trim().toLowerCase());
        }).slice(0, 6);

  function goToResult(result) {
    setPage(result.page);
    setSearchQuery("");
    setSearchOpen(false);
  }


  async function compressVideo() {
    if (!file) {
      setStatus("Please select a video first.");
      return;
    }

    setCompressing(true);
    setStatus("Uploading and compressing...");

    try {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("targetSizeKB", targetSizeKB);

      const response = await fetch(
        `${SERVER_URL}/compress`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage);
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "compressed-video.mp4";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      setStatus("Compression complete!");
    }

    catch (error) {
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
    <div className="app">


      <nav className="navbar">

        <div className="logo" onClick={() => setPage("home")}>
          <span className="logo-bolt">⚡</span><span className="logo-text">DiscShrink</span>
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


        <div className="nav-links">


          <div className="nav-dropdown">
            <button
              className={
                ["compressor", "gif", "audio"].includes(page)
                  ? "nav-dropdown-btn active"
                  : "nav-dropdown-btn"
              }
              onClick={() => setToolsOpen((open) => !open)}
              onBlur={() => setTimeout(() => setToolsOpen(false), 150)}
            >
              Tools <span className="nav-caret">▾</span>
            </button>

            {toolsOpen && (
              <div className="nav-dropdown-menu">
                <span
                  className={page === "compressor" ? "active" : ""}
                  onMouseDown={() => {
                    setPage("compressor");
                    setToolsOpen(false);
                  }}
                >
                  Video Compressor
                </span>

                <span
                  className={page === "gif" ? "active" : ""}
                  onMouseDown={() => {
                    setPage("gif");
                    setToolsOpen(false);
                  }}
                >
                  Video to GIF <span className="nav-soon-tag">Soon</span>
                </span>

                <span
                  className={page === "audio" ? "active" : ""}
                  onMouseDown={() => {
                    setPage("audio");
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
              className={
                ["faq", "support", "status"].includes(page)
                  ? "nav-dropdown-btn active"
                  : "nav-dropdown-btn"
              }
              onClick={() => setHelpOpen((open) => !open)}
              onBlur={() => setTimeout(() => setHelpOpen(false), 150)}
            >
              Help <span className="nav-caret">▾</span>
            </button>

            {helpOpen && (
              <div className="nav-dropdown-menu">
                <span
                  className={page === "faq" ? "active" : ""}
                  onMouseDown={() => {
                    setPage("faq");
                    setHelpOpen(false);
                  }}
                >
                  FAQ
                </span>

                <span
                  className={page === "support" ? "active" : ""}
                  onMouseDown={() => {
                    setPage("support");
                    setHelpOpen(false);
                  }}
                >
                  Support
                </span>

                <span
                  className={page === "status" ? "active" : ""}
                  onMouseDown={() => {
                    setPage("status");
                    setHelpOpen(false);
                  }}
                >
                  Status
                </span>
              </div>
            )}
          </div>


        </div>

      </nav>



      {page === "home" && (

        <Home goToPage={setPage} />

      )}


      {page === "compressor" && (

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

              onDragOver={(e) =>
                e.preventDefault()
              }

              onDrop={handleDrop}

            >

              <h2>
                Drag & drop your video here
              </h2>

              <p>
                or click to browse
              </p>


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

                  const selected =
                    e.target.files[0];

                  if (selected) {

                    setFile(selected);

                    setStatus(
                      `Selected: ${selected.name}`
                    );

                  }

                }}
              />


              {file && (

                <p>
                  {file.name}
                </p>

              )}

            </div>


            <div className="target-size-wrap">
              <label htmlFor="target-size">Target file size</label>
              <select
                id="target-size"
                value={targetSizeKB}
                onChange={(e) => setTargetSizeKB(e.target.value)}
                disabled={compressing}
              >
                {TARGET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="compress-button"
              onClick={compressVideo}
              disabled={compressing}
            >

              {
                compressing
                  ? "Compressing..."
                  : "Compress Video"
              }

            </button>


            <p>
              {status}
            </p>


          </section>

        </>

      )}

{page === "faq" && (

        <FAQ />

      )}



      {page === "support" && (

        <Support goToPage={setPage} />

      )}



      {page === "status" && (

        <CompressionStatus />

      )}


      {page === "gif" && (

        <ComingSoon
          icon="🎞️"
          title="Video to GIF"
          subtitle="Turn any clip into a shareable, looping GIF."
          description="This tool will let you upload a video and convert it straight into a GIF — perfect for reactions, memes, and quick shares. It's currently in development and will use the same fast, reliable engine that powers the video compressor."
        />

      )}


      {page === "audio" && (

        <ComingSoon
          icon="🎧"
          title="Audio Extractor"
          subtitle="Pull the audio track out of any video file."
          description="Upload a video and get back just the audio — as MP3 or WAV — without the video. Great for saving a song, a voiceover, or a soundbite from a clip. Coming soon."
        />

      )}


      {page === "privacy" && (

        <Legal section="privacy" />

      )}


      {page === "terms" && (

        <Legal section="terms" />

      )}


      <footer className="site-footer">
        <div className="site-footer-links">
          <span onClick={() => setPage("privacy")}>Privacy Policy</span>
          <span className="site-footer-dot">•</span>
          <span onClick={() => setPage("terms")}>Terms of Service</span>
        </div>
        © {new Date().getFullYear()} DiscShrink. All rights reserved.
      </footer>

    </div>
  );
}


export default App;
