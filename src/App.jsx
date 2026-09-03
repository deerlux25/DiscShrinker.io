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

function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [compressing, setCompressing] = useState(false);
  const [targetSizeKB, setTargetSizeKB] = useState("20480");
  const [page, setPage] = useState("compressor");

  const fileInputRef = useRef(null);


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
          ⚡ DiscordShrink
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


        </div>

      </nav>



      {page === "compressor" && (

        <>

          <section className="hero">

            <img
              className="electric-title"
              src="/electric-title.png"
              alt="Free Discord Video Compressor"
            />

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


          <CompressionStatus />

        </>

      )}

{page === "faq" && (

        <FAQ />

      )}



      {page === "support" && (

        <Support />

      )}



    </div>
  );
}


export default App;