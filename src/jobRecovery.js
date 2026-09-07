// Remembers an in-progress job's ID across page refreshes, per tool, so a
// reload doesn't strand a job that's still running (or already finished)
// on the server with no way for the browser to find it again.
const STORAGE_PREFIX = "discshrink_active_job_";

export function saveActiveJob(toolKey, jobId) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + toolKey, jobId);
  } catch {
    // Non-fatal - refresh-recovery just won't work this session.
  }
}

export function getActiveJob(toolKey) {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + toolKey);
  } catch {
    return null;
  }
}

export function clearActiveJob(toolKey) {
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + toolKey);
  } catch {
    // Non-fatal.
  }
}
