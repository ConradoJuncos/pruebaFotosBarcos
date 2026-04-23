import { getPendingIds, getSubmission, markAsSynced } from "./db.js";

export async function uploadSubmission(item) {
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item)
  });

  if (!response.ok) {
    throw new Error(`Upload failed (${response.status})`);
  }

  return response.json();
}

export async function syncPendingSubmissions(onProgress) {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const ids = await getPendingIds();
  let synced = 0;
  let failed = 0;

  for (const id of ids) {
    try {
      const item = await getSubmission(id);
      if (!item) {
        continue;
      }

      await uploadSubmission(item);
      await markAsSynced(id);
      synced += 1;
    } catch (_error) {
      failed += 1;
    }

    if (typeof onProgress === "function") {
      onProgress({ synced, failed, total: ids.length });
    }
  }

  return { synced, failed };
}

