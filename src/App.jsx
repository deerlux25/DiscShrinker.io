import { useRef, useState } from "react";
import "./App.css";
import FAQ from "./FAQ";
import Support from "./Support";
import CompressionStatus from "./CompressionStatus";

const configuredServerUrl = import.meta.env.VITE_COMPRESSION_SERVER_URL;
const SERVER_URL = configuredServerUrl
  ? (configuredServerUrl.startsWith("http") ? configuredServerUrl : `https://${configuredServerUrl}`)
  : "http://localhost:3001";

const TARGET_OPTIONS = [
  { value: "20480", label: "⚡ Discord Shrinker — 20 MB" },
  { value: "19765", label: "19,765 KB" },
  { value: "30000", label: "30,000 KB" },
];

const SEARCH_INDEX = [
  { page: "compressor", title: "Video Compressor", snippet: "Drag & drop or choose a video to compress.", keywords: "compress compressor upload drag drop video file discord shrink target size 20mb" },
  { page: "compressor", title: "Target Size", snippet: "Choose 20MB, 19,765 KB, or 30,000 KB output size.", keywords: "target size kb mb discord limit output bitrate" },

  { page: "faq", title: "Supported Files", snippet: "Supports MP4, MOV, MKV, AVI, WebM, and HEVC videos.", keywords: "files formats mp4 mov mkv avi webm hevc supported" },
  { page: "faq", title: "Codecs", snippet: "Works with H.264, H.265, VP9, AAC, and more.", keywords: "codecs h264 h265 vp9 aac video audio codec" },
  { page: "faq", title: "Powered By", snippet: "Built using React, Node.js, Vite, and FFmpeg.", keywords: "powered by react node vite ffmpeg tech stack built" },
  { page: "faq", title: "Compression", snippet: "Shrinks videos while keeping great quality.", keywords: "compression shrink quality size reduce faq" },
  { page: "faq", title: "Gaming Clips", snippet: "Perfect for OBS, gameplay, and clips.", keywords: "gaming clips obs gameplay stream recording" },
  { page: "faq", title: "Privacy", snippet: "Videos are processed and removed after use.", keywords: "privacy data delete removed after use safe secure" },
  { page: "faq", title: "Problems?", snippet: "Check file type, size, and connection.", keywords: "problems issues errors troubleshoot faq help" },
  { page: "faq", title: "Discord", snippet: "Made to help videos fit Discord limits.", keywords: "discord limits upload size faq" },

  { page: "support", title: "Troubleshooting", snippet: "Having issues uploading? Check your connection, video type, and file size.", keywords: "troubleshooting issues upload connection error fix" },
  { page: "support", title: "Video Help", snippet: "Supported files include MP4, MOV, MKV, AVI, and WebM.", keywords: "video help formats mp4 mov mkv avi webm support" },
  { page: "support", title: "Compression", snippet: "DiscShrink uses FFmpeg to reduce file size while keeping quality.", keywords: "compression ffmpeg quality size support" },
  { page: "support", title: "Server Status", snippet: "Website and compressor server status.", keywords: "server status online website compressor support" },
  { page: "support", title: "Bug Reports", snippet: "Found a problem? Tell us what happened and what device or browser you use.", keywords: "bug report problem device browser issue support" },
  { page: "support", title: "Feature Requests", snippet: "Have an idea? We are always improving DiscShrink.", keywords: "feature request idea suggestion improve support" },
  { page: "support", title: "Contact / Help", snippet: "Still need help? Provide the issue, what you tried, and any error details.", keywords: "contact help support reach out message" },

  { page: "status", title: "System Status", snippet: "Live status for website, compression server, and FFmpeg engine.", keywords: "status system live monitor online connected ready ffmpeg server website" },
];

function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [compressing, setCompressing] = useState(false);
  const [targetSizeKB, setTargetSizeKB] = useState("20480");
  const [page, setPage] = useState("compressor");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

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

        <div className="logo">
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


          <span
            className={
              page === "compressor"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage("compressor")
            }
          >
            Compressor
          </span>



          <span
            className={
              page === "faq"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage("faq")
            }
          >
            FAQ
          </span>



          <span
            className={
              page === "support"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage("support")
            }
          >
            Support
          </span>



          <span
            className={
              page === "status"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage("status")
            }
          >
            Status
          </span>


        </div>

      </nav>



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

        <Support />

      )}



      {page === "status" && (

        <CompressionStatus />

      )}



    </div>
  );
}


export default App;