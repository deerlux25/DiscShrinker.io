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

// ---- Ticket numbering (persisted to disk so numbers survive restarts/redeploys) ----
const TICKET_COUNTER_FILE = path.join(__dirname, "ticket-counter.json");

function getNextTicketNumber() {
  let count = 0;
  try {
    const raw = fs.readFileSync(TICKET_COUNTER_FILE, "utf8");
    count = JSON.parse(raw).count || 0;
  } catch {
    count = 0; // file doesn't exist yet - start fresh
  }

  count += 1;

  try {
    fs.writeFileSync(TICKET_COUNTER_FILE, JSON.stringify({ count }));
  } catch (err) {
    console.log("Could not persist ticket counter:", err.message);
  }

  return count;
}

function makeTicketId() {
  const number = getNextTicketNumber();
  const padded = String(number).padStart(5, "0");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DS-${padded}-${suffix}`;
}

// ---- Discord webhook notifications (optional - only fires if DISCORD_WEBHOOK_URL is set) ----
async function notifyDiscord(ticket) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return; // not configured - silently skip

  const lastError = ticket.diagnostics?.lastError;

  const embed = {
    title: `New Support Ticket — ${ticket.ticketId}`,
    color: 0x9b5aff,
    fields: [
      { name: "From", value: `${ticket.name} (${ticket.email})`, inline: true },
      { name: "Issue Type", value: ticket.issueType, inline: true },
      { name: "Message", value: ticket.message.slice(0, 1000) },
    ],
    timestamp: ticket.receivedAt,
  };

  if (lastError) {
    embed.fields.push({
      name: "Last Error",
      value: `${lastError.message || "unknown"} (${lastError.fileName || "no file"})`.slice(0, 1000),
    });
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (err) {
    // Never let a Discord hiccup fail the ticket submission.
    console.log("Discord webhook failed:", err.message);
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
// provider is configured yet - see server/support-tickets.log. Also posts
// to Discord if DISCORD_WEBHOOK_URL is set.
app.post("/contact", async (req, res) => {
  const { name, email, issueType, message, diagnostics } = req.body || {};

  if (!email || !message) {
    return res.status(400).json({ error: "Email and message are required." });
  }

  const ticket = {
    ticketId: makeTicketId(),
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

  console.log("New support ticket", ticket.ticketId, "from:", email);

  // Fire-and-forget-ish: we await so logs are ordered, but a webhook failure
  // never blocks or fails the response - the ticket is already saved above.
  await notifyDiscord(ticket);

  res.json({ success: true, ticketId: ticket.ticketId });
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
      if (fs.existsSync(input)) {
        fs.unlinkSync(input);
      }
      return res.status(500).send("Could not read video");
    }

    const duration = metadata.format.duration;

    const requestedTargetKB = parseInt(req.body.targetSizeKB, 10);

    const targetSizeKB =
      Number.isFinite(requestedTargetKB) && requestedTargetKB > 0
        ? Math.min(Math.max(requestedTargetKB, 1024), 512000) // clamp 1MB–500MB
        : 20480; // fallback: 20 MB

    console.log("Requested target size (KB):", targetSizeKB);

    const totalBitrate =
      (targetSizeKB * 1024 * 8) / duration;

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

  if (fs.existsSync(input)) {
    fs.unlinkSync(input);
  }
  if (fs.existsSync(output)) {
    fs.unlinkSync(output);
  }

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
