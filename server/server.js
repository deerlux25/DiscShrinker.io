const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const UPLOAD_DIR = path.join(__dirname, "uploads");
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
const SIZE_HEADROOM = 0.96;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors());

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: MAX_UPLOAD_BYTES }
});

function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.error("Cleanup error:", error.message);
  }
}

function safeBaseName(filename) {
  return path.basename(filename || "video")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "video";
}

function getTargetSizeKB(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 256 || parsed > 500000) return null;
  return parsed;
}

function findFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  try {
    const staticPath = require("ffmpeg-static");
    if (staticPath && fs.existsSync(staticPath)) return staticPath;
  } catch (error) {
    console.warn("ffmpeg-static unavailable; using system FFmpeg.");
  }

  return null;
}

const ffmpegPath = findFfmpeg();
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log("Using FFmpeg:", ffmpegPath);
} else {
  console.log("Using FFmpeg from PATH");
}

app.get("/", (req, res) => {
  res.type("text").send("DiscordShrink compression server is online");
});

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "discordshrink-compression-server" });
});

app.post("/compress", upload.single("video"), (req, res) => {
  console.log("Received upload request");

  if (!req.file) {
    return res.status(400).json({ error: "No video uploaded" });
  }

  const input = req.file.path;
  const targetSizeKB = getTargetSizeKB(req.body.targetSizeKB) || 19765;
  const targetBytes = Math.floor(targetSizeKB * 1024);
  const encodingBudgetBytes = Math.floor(targetBytes * SIZE_HEADROOM);
  const baseName = safeBaseName(req.file.originalname);
  const outputName = `${baseName}-${Date.now()}-compressed.mp4`;
  const output = path.join(UPLOAD_DIR, outputName);

  console.log("Compressing:", req.file.originalname);
  console.log("Target:", targetSizeKB, "KB");

  ffmpeg.ffprobe(input, (probeError, metadata) => {
    if (probeError) {
      console.error("FFprobe error:", probeError.message);
      safeUnlink(input);
      return res.status(500).json({ error: "Could not read video" });
    }

    const duration = Number(metadata?.format?.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      safeUnlink(input);
      return res.status(400).json({ error: "Could not determine video duration" });
    }

    const audioBitrate = 128000;
    const totalBitrate = (encodingBudgetBytes * 8) / duration;
    const videoBitrateKbps = Math.floor((totalBitrate - audioBitrate) / 1000);

    if (videoBitrateKbps < 32) {
      safeUnlink(input);
      return res.status(400).json({
        error: "This video is too long for the selected target size."
      });
    }

    console.log("Video bitrate:", videoBitrateKbps, "kbps");

    ffmpeg(input)
      .videoCodec("libx264")
      .audioCodec("aac")
      .videoBitrate(`${videoBitrateKbps}k`)
      .audioBitrate("128k")
      .outputOptions([
        "-preset medium",
        "-pix_fmt yuv420p",
        "-movflags +faststart"
      ])
      .format("mp4")
      .on("start", command => console.log("FFmpeg:", command))
      .on("progress", progress => {
        console.log(`${Math.round(progress.percent || 0)}%`);
      })
      .on("end", () => {
        console.log("Compression complete");

        let outputSize;
        try {
          outputSize = fs.statSync(output).size;
        } catch (error) {
          safeUnlink(input);
          return res.status(500).json({ error: "Compressed file was not created" });
        }

        console.log("Output size:", Math.round(outputSize / 1024), "KB");

        if (outputSize > targetBytes) {
          safeUnlink(input);
          safeUnlink(output);
          return res.status(422).json({
            error: "The compressed video was larger than the selected target size. Please choose a larger target."
          });
        }

        res.sendFile(output, {
          headers: {
            "Content-Type": "video/mp4",
            "Content-Disposition": 'attachment; filename="compressed-video.mp4"',
            "Content-Length": outputSize,
            "Cache-Control": "no-store"
          }
        }, sendError => {
          if (sendError) console.error("Send file error:", sendError.message);
          else console.log("File sent successfully");
          safeUnlink(input);
          safeUnlink(output);
        });
      })
      .on("error", error => {
        console.error("FFmpeg error:", error.message);
        safeUnlink(input);
        safeUnlink(output);
        if (!res.headersSent) {
          res.status(500).json({ error: `Video compression failed: ${error.message}` });
        }
      })
      .save(output);
  });
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Video is too large. Maximum upload size is 500 MB." });
  }
  console.error("Server error:", error);
  if (!res.headersSent) res.status(500).json({ error: "Server error" });
});

app.listen(PORT, () => {
  console.log(`Compression server running on port ${PORT}`);
});
