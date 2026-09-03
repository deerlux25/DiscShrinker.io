const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  dest: "uploads/"
});

// ---- In-memory stats (resets on server restart; fine for a lightweight status page) ----
const stats = {
  compressionsToday: 0,
  totalCompressions: 0,
  successCount: 0,
  failCount: 0,
  totalDurationMs: 0,
  statsDate: new Date().toDateString(),
};

function rolloverStatsIfNewDay() {
  const today = new Date().toDateString();
  if (stats.statsDate !== today) {
    stats.statsDate = today;
    stats.compressionsToday = 0;
  }
}

app.get("/", (req, res) => {
  res.send("Compression server online");
});

// Matches render.yaml's healthCheckPath. Confirms the server responds and that
// ffmpeg is actually callable, without touching any upload/compress state.
app.get("/health", (req, res) => {
  ffmpeg.getAvailableFormats((err) => {
    res.json({
      status: "ok",
      website: true,
      compressionServer: true,
      ffmpeg: !err,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: Date.now(),
    });
  });
});

app.get("/stats", (req, res) => {
  rolloverStatsIfNewDay();
  res.json({
    compressionsToday: stats.compressionsToday,
    totalCompressions: stats.totalCompressions,
    successCount: stats.successCount,
    failCount: stats.failCount,
    avgCompressionSeconds: stats.successCount
      ? Math.round(stats.totalDurationMs / stats.successCount / 1000)
      : null,
  });
});

// Support form submissions. Stored to a local log file since no email
// provider is configured yet - see server/support-tickets.log.
app.post("/contact", (req, res) => {
  const { name, email, issueType, message, diagnostics } = req.body || {};

  if (!email || !message) {
    return res.status(400).json({ error: "Email and message are required." });
  }

  const ticket = {
    name: name || "(not provided)",
    email,
    issueType: issueType || "Other",
    message,
    diagnostics: diagnostics || null,
    receivedAt: new Date().toISOString(),
  };

  try {
    fs.appendFileSync(
      path.join(__dirname, "support-tickets.log"),
      JSON.stringify(ticket) + "\n"
    );
  } catch (writeErr) {
    console.log("Could not save support ticket:", writeErr.message);
    return res.status(500).json({ error: "Could not save your message. Please try again." });
  }

  console.log("New support ticket from:", email);
  res.json({ success: true });
});

app.post("/compress", upload.single("video"), (req, res) => {

  console.log("Received upload request");

  if (!req.file) {
    return res.status(400).send("No video uploaded");
  }

  const compressionStartedAt = Date.now();
  rolloverStatsIfNewDay();
  stats.totalCompressions += 1;
  stats.compressionsToday += 1;

  const input = req.file.path;

  const originalName = req.file.originalname
    .replace(/\.[^/.]+$/, "");

  const outputName = `${originalName}-compressed.mp4`;

  const output = path.join(
  __dirname,
  "uploads",
  outputName
);

  console.log("Compressing:", req.file.originalname);

  ffmpeg.ffprobe(input, (err, metadata) => {

    if (err) {
      console.log(err);
      stats.failCount += 1;
      return res.status(500).send("Could not read video");
    }

    const duration = metadata.format.duration;

    const targetSizeMB = 20;

    const totalBitrate =
      (targetSizeMB * 8 * 1024 * 1024) / duration;

    const audioBitrate = 128000;

    const videoBitrate =
      Math.floor(totalBitrate - audioBitrate) / 1000;

    console.log(
      "Video bitrate:",
      videoBitrate,
      "kbps"
    );

    ffmpeg(input)
      .videoCodec("libx264")
      .audioCodec("aac")
      .videoBitrate(videoBitrate + "k")
      .audioBitrate("128k")
      .outputOptions([
        "-preset veryfast",
        "-threads 2",
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        "-vf scale='min(1280,iw)':-2"
      ])
      .format("mp4")
      .on("start", command => {
        console.log("FFmpeg:");
        console.log(command);
      })
      .on("progress", progress => {
        console.log(
          Math.round(progress.percent || 0) + "%"
        );
      })
     .on("end", () => {
  console.log("Compression complete");
  stats.successCount += 1;
  stats.totalDurationMs += Date.now() - compressionStartedAt;

res.sendFile(
  output,
  {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": 'inline; filename="compressed-video.mp4"'
    }
  },
  (err) => {
    if (err) {
      console.log("Send file error:");
      console.log(err.message);
    } else {
      console.log("File sent successfully");
    }

    if (fs.existsSync(input)) {
      fs.unlinkSync(input);
    }

    if (fs.existsSync(output)) {
      fs.unlinkSync(output);
               }
    }
  );
})
      .on("error", error => {
  console.log("FFmpeg error:");
  console.log(error.message);
  stats.failCount += 1;

  res.status(500).send(
    `Video Compression failed. Reason: ${error.message}`
  );
})
.save(output);
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("Compression server running on port " + PORT);
});