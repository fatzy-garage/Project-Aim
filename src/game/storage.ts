import type { SessionResult } from "./types";

const DB_NAME = "mobile-aim-lab";
const STORE = "sessions";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveSession(result: SessionResult) {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(result);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (error) { console.warn("Could not persist session", error); }
}
export async function getSessions(): Promise<SessionResult[]> {
  try {
    const db = await openDB();
    const values = await new Promise<SessionResult[]>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result.filter(x =>
        x && typeof x.id === "string" && typeof x.score === "number" && typeof x.date === "number") : []);
      req.onerror = () => reject(req.error);
    });
    db.close(); return values.sort((a,b) => b.date-a.date);
  } catch { return []; }
}
export async function clearSessions() {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); db.close();
  } catch (error) { console.warn(error); }
}