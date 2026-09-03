const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());

const upload = multer({
  dest: "uploads/"
});

app.get("/", (req, res) => {
  res.send("Compression server online");
});

app.post("/compress", upload.single("video"), (req, res) => {

  console.log("Received upload request");

  if (!req.file) {
    return res.status(400).send("No video uploaded");
  }

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
        "-preset medium",
        "-pix_fmt yuv420p",
        "-movflags +faststart"
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

  res.status(500).send(
    `Video Compression failed. Reason: ${error.message}`
  );
})
.save(output);
  });
});

app.listen(3001, () => {
  console.log("Compression server running on port 3001");
});