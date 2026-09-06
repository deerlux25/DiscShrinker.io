import { useNavigate } from "react-router-dom";
import "./Home.css";
import "./Tools.css";

const TOOLS = [
  {
    icon: "🎬",
    title: "Video Compressor",
    description: "Shrink videos to fit Discord's upload limit without losing quality.",
    path: "/compressor",
    soon: false,
  },
  {
    icon: "🔄",
    title: "Video Converter",
    description: "Convert HEVC, VP9, AV1, and other formats to widely-compatible MP4.",
    path: "/converter",
    soon: false,
  },
  {
    icon: "🎞️",
    title: "Video to GIF",
    description: "Turn any clip into a shareable, looping GIF in seconds.",
    path: "/gif",
    soon: true,
  },
  {
    icon: "🎧",
    title: "Audio Extractor",
    description: "Pull just the audio track out of any video file.",
    path: "/audio",
    soon: true,
  },
];

function Tools() {
  const navigate = useNavigate();

  return (
    <section className="home-page tools-page">
      <div className="tools-title">
        <span className="home-eyebrow">ALL TOOLS</span>
        <h1>🛠️ DiscShrink Tools</h1>
        <p>Every free tool DiscShrink offers, in one place.</p>
      </div>

      <div className="home-tools-grid">
        {TOOLS.map((tool) => (
          <div className="home-tool-card" key={tool.path}>
            {tool.soon && <span className="home-soon-tag">Coming Soon</span>}
            <div className="home-tool-icon">{tool.icon}</div>
            <h2>{tool.title}</h2>
            <p>{tool.description}</p>
            <button
              className={tool.soon ? "home-tool-btn home-tool-btn-soon" : "home-tool-btn"}
              onClick={() => navigate(tool.path)}
            >
              {tool.soon ? "Preview" : "Open Tool"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Tools;
