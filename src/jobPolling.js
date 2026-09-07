import { SERVER_URL } from "./config";

// Polls a job's status until it finishes (or fails). Works the same
// whether the job was just created or is being resumed after a page
// refresh - all it needs is the jobId.
export async function pollJobUntilDone(jobId, onQueueUpdate) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const statusResponse = await fetch(`${SERVER_URL}/compress/status/${jobId}`);

    if (statusResponse.status === 404) {
      throw new Error(
        "This job could no longer be found - it may have expired after a server restart. Please try again."
      );
    }

    if (!statusResponse.ok) {
      throw new Error("Could not check job status.");
    }

    const current = await statusResponse.json();
    onQueueUpdate(current);

    if (current.status === "failed") {
      throw new Error(current.error || "The job failed.");
    }

    if (current.status === "complete") {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

export async function downloadJobResult(jobId, fallbackFilename) {
  const downloadResponse = await fetch(`${SERVER_URL}/compress/download/${jobId}`);
  if (!downloadResponse.ok) {
    throw new Error("The finished file could not be downloaded.");
  }

  // Trust whatever the server says this file actually is (it always knows
  // for sure) rather than what the browser remembers requesting - this
  // matters after a refresh, where the browser's own memory of settings
  // like audio format may no longer match what was actually produced.
  const disposition = downloadResponse.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : fallbackFilename;

  const blob = await downloadResponse.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
