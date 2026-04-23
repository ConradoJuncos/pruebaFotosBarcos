const DB_NAME = "offline-form-db";
const DB_VERSION = 1;
const SUBMISSIONS_STORE = "submissions";
const PENDING_STORE = "pending";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(SUBMISSIONS_STORE)) {
        db.createObjectStore(SUBMISSIONS_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx, db) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    };
  });
}

export async function saveSubmission(submission) {
  const db = await openDb();
  const tx = db.transaction([SUBMISSIONS_STORE, PENDING_STORE], "readwrite");
  tx.objectStore(SUBMISSIONS_STORE).put(submission);
  tx.objectStore(PENDING_STORE).put({ id: submission.id, createdAt: submission.createdAt });
  await txDone(tx, db);
}

export async function markAsSynced(id) {
  const db = await openDb();
  const tx = db.transaction([SUBMISSIONS_STORE, PENDING_STORE], "readwrite");
  const submissions = tx.objectStore(SUBMISSIONS_STORE);
  const pending = tx.objectStore(PENDING_STORE);
  const current = await requestToPromise(submissions.get(id));

  if (current) {
    current.syncedAt = new Date().toISOString();
    submissions.put(current);
  }

  pending.delete(id);
  await txDone(tx, db);
}

export async function getSubmission(id) {
  const db = await openDb();
  const tx = db.transaction(SUBMISSIONS_STORE, "readonly");
  const result = await requestToPromise(tx.objectStore(SUBMISSIONS_STORE).get(id));
  await txDone(tx, db);
  return result;
}

export async function getPendingIds() {
  const db = await openDb();
  const tx = db.transaction(PENDING_STORE, "readonly");
  const ids = await requestToPromise(tx.objectStore(PENDING_STORE).getAllKeys());
  await txDone(tx, db);
  return ids;
}

export async function getPendingCount() {
  const ids = await getPendingIds();
  return ids.length;
}


