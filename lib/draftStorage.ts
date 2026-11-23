import type { ImageElement, Photo, ThemeId } from "@/types/collage";
import type { StudioSnapshot } from "@/types/studio";
import { decodePhoto, disposePhoto } from "@/lib/imageLoader";
import { MAX_FILE_BYTES, MAX_TOTAL_PIXELS } from "@/lib/settings";
import { THEMES } from "@/lib/themeLayouts";
import { TRAVEL_COLLECTIONS } from "@/lib/travelTemplates";

const DATABASE = "frameforge-drafts";
const CURRENT = "current";
interface PhotoReference {
  id: string;
  name: string;
  sample?: boolean;
}
interface SavedImage extends Omit<ImageElement, "photo"> {
  photo: PhotoReference;
}
interface Asset {
  id: string;
  source: string;
  blob: Blob;
}
export interface DraftRecord extends Omit<
  StudioSnapshot,
  "photos" | "themeImages"
> {
  version: 1;
  revision: string;
  updatedAt: number;
  thumbnail: string | null;
  photos: PhotoReference[];
  themeImages: Partial<Record<ThemeId, SavedImage[]>>;
  sources: Record<string, string>;
}

let connection: Promise<IDBDatabase> | null = null;
let queue: Promise<unknown> = Promise.resolve();
function queued<T>(operation: () => Promise<T>): Promise<T> {
  const next = queue.then(operation);
  queue = next.catch(() => {});
  return next;
}
function database(): Promise<IDBDatabase> {
  if (!connection)
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(
          new Error(
            "This browser does not support saving drafts. You can still download your collage.",
          ),
        );
        return;
      }
      const request = indexedDB.open(DATABASE, 1);
      let rejected = false;
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("drafts"))
          db.createObjectStore("drafts");
        if (!db.objectStoreNames.contains("assets"))
          db.createObjectStore("assets", { keyPath: "id" });
      };
      request.onerror = () =>
        reject(
          request.error ?? new Error("Draft storage could not be opened."),
        );
      request.onblocked = () => {
        rejected = true;
        reject(
          new Error("Close other studio tabs and retry saving your draft."),
        );
      };
      request.onsuccess = () => {
        const db = request.result;
        if (rejected) {
          db.close();
          return;
        }
        db.onversionchange = () => {
          db.close();
          connection = null;
        };
        resolve(db);
      };
    }).catch((error) => {
      connection = null;
      throw error;
    });
  return connection;
}
function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function complete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () =>
      reject(transaction.error ?? new Error("The draft could not be saved."));
  });
}
function photoReference(photo: Photo): PhotoReference {
  return { id: photo.id, name: photo.name, sample: photo.sample };
}
function allReferences(
  draft: Pick<DraftRecord, "photos" | "themeImages">,
): PhotoReference[] {
  return [
    ...draft.photos,
    ...Object.values(draft.themeImages).flatMap((images) =>
      (images ?? []).map((image) => image.photo),
    ),
  ];
}
function validate(value: DraftRecord): DraftRecord {
  if (
    value.version !== 1 ||
    !value.revision ||
    !THEMES.some((theme) => theme.id === value.theme) ||
    !Array.isArray(value.photos) ||
    value.photos.length > 10 ||
    !value.themeImages ||
    !value.themeTextLayers ||
    !value.themeCustomizations ||
    !value.tripDetails ||
    !value.sources ||
    !Number.isFinite(value.updatedAt) ||
    !value.custom ||
    typeof value.custom.width !== "string" ||
    typeof value.custom.height !== "string" ||
    !TRAVEL_COLLECTIONS.includes(value.travelCollection) ||
    !["destination", "origin", "date", "caption"].every(
      (key) =>
        typeof value.tripDetails[key as keyof typeof value.tripDetails] ===
        "string",
    )
  )
    throw new Error(
      "This saved draft cannot be opened by this version of the studio. Start a new collage to replace it.",
    );
  const references = allReferences(value);
  if (
    references.length > 220 ||
    references.some(
      (photo) =>
        !photo ||
        typeof photo.id !== "string" ||
        typeof photo.name !== "string",
    ) ||
    Object.values(value.themeImages).some(
      (images) => !Array.isArray(images) || images.length > 10,
    )
  )
    throw new Error(
      "This saved draft is damaged. You can start a new collage without uploading anything.",
    );
  return value;
}
export async function readDraft(): Promise<DraftRecord | null> {
  const db = await database();
  const value = (await result(
    db.transaction("drafts").objectStore("drafts").get(CURRENT),
  )) as DraftRecord | undefined;
  return value ? validate(value) : null;
}
export function draftError(error: unknown): string {
  if (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "UnknownError")
  )
    return "There isn’t enough browser storage for this draft. Free some space or download your collage before leaving.";
  return error instanceof Error
    ? error.message
    : "The draft could not be saved on this device. Download your collage before leaving.";
}
function thumbnail(): string | null {
  try {
    const preview = document.querySelector<HTMLCanvasElement>(
      '[data-testid="collage-preview"]',
    );
    if (!preview?.width) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = Math.max(
      1,
      Math.round((200 * preview.height) / preview.width),
    );
    canvas
      .getContext("2d")!
      .drawImage(preview, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.65);
  } catch {
    return null;
  }
}

/** Originals and all edit metadata commit together; a failed save leaves the previous draft intact. */
export function saveDraft(
  snapshot: StudioSnapshot,
  expected: () => string | null,
): Promise<DraftRecord> {
  return queued(async () => {
    const db = await database();
    const previous = await readDraft();
    const photos = [
      ...snapshot.photos,
      ...Object.values(snapshot.themeImages).flatMap((images) =>
        (images ?? []).map((image) => image.photo),
      ),
    ];
    const unique = [
      ...new Map(photos.map((photo) => [photo.id, photo])).values(),
    ];
    const assets: Asset[] = [];
    for (const photo of unique) {
      if (previous?.sources[photo.id] === photo.url) continue;
      let blob = photo.originalBlob;
      if (!blob) {
        const response = await fetch(photo.url);
        if (!response.ok)
          throw new Error(
            `${photo.name} could not be saved. Keep this tab open and retry.`,
          );
        blob = await response.blob();
      }
      if (!blob.size || blob.size > MAX_FILE_BYTES)
        throw new Error(`${photo.name} is too large to save as a draft.`);
      assets.push({ id: photo.id, source: photo.url, blob });
    }
    const { photos: _, themeImages, ...metadata } = snapshot;
    const record: DraftRecord = {
      ...metadata,
      version: 1,
      revision: crypto.randomUUID(),
      updatedAt: Date.now(),
      thumbnail: thumbnail(),
      photos: snapshot.photos.map(photoReference),
      sources: Object.fromEntries(unique.map((photo) => [photo.id, photo.url])),
      themeImages: Object.fromEntries(
        Object.entries(themeImages).map(([id, images]) => [
          id,
          images.map((image) => ({
            ...image,
            photo: photoReference(image.photo),
          })),
        ]),
      ),
    };
    const tx = db.transaction(["drafts", "assets"], "readwrite");
    const finished = complete(tx);
    let conflict = false;
    const check = tx.objectStore("drafts").get(CURRENT);
    check.onsuccess = () => {
      if ((check.result?.revision ?? null) !== expected()) {
        conflict = true;
        tx.abort();
        return;
      }
      tx.objectStore("drafts").put(record, CURRENT);
      const store = tx.objectStore("assets");
      assets.forEach((asset) => store.put(asset));
      const keys = store.getAllKeys();
      keys.onsuccess = () =>
        keys.result.forEach((id) => {
          if (!(String(id) in record.sources)) store.delete(id);
        });
    };
    try {
      await finished;
    } catch (error) {
      if (conflict)
        throw new Error(
          "Another studio tab has a newer draft. Your current edits are still here; download them or reload to continue the saved draft.",
        );
      throw error;
    }
    return record;
  });
}

export function clearDraft(expected?: () => string | null): Promise<void> {
  return queued(async () => {
    const db = await database();
    const tx = db.transaction(["drafts", "assets"], "readwrite");
    const finished = complete(tx);
    let conflict = false;
    const check = tx.objectStore("drafts").get(CURRENT);
    check.onsuccess = () => {
      if (expected && (check.result?.revision ?? null) !== expected()) {
        conflict = true;
        tx.abort();
        return;
      }
      tx.objectStore("drafts").clear();
      tx.objectStore("assets").clear();
    };
    try {
      await finished;
    } catch (error) {
      if (conflict)
        throw new Error(
          "Another tab updated the draft. Reload to see it before starting over.",
        );
      throw error;
    }
  });
}

export async function restoreDraft(
  record: DraftRecord,
  progress: (current: number, total: number) => void,
): Promise<StudioSnapshot> {
  validate(record);
  const db = await database();
  const references = [
    ...new Map(
      allReferences(record).map((photo) => [photo.id, photo]),
    ).values(),
  ];
  const loaded = new Map<string, Photo>();
  let pixels = 0;
  try {
    for (const reference of references) {
      const asset = (await result(
        db.transaction("assets").objectStore("assets").get(reference.id),
      )) as Asset | undefined;
      if (!asset?.blob || asset.blob.size > MAX_FILE_BYTES)
        throw new Error(
          "A photo is missing from this draft. You can retry or start a new collage.",
        );
      const url = URL.createObjectURL(asset.blob);
      let photo: Photo;
      try {
        photo = await decodePhoto(url, reference.name, reference.sample);
      } catch (error) {
        URL.revokeObjectURL(url);
        throw error;
      }
      photo.id = reference.id;
      photo.originalBlob = asset.blob;
      loaded.set(reference.id, photo);
      pixels += photo.width * photo.height;
      if (pixels > MAX_TOTAL_PIXELS)
        throw new Error(
          "This draft is too large for the studio’s browser memory limit.",
        );
      progress(loaded.size, references.length);
    }
    const {
      version: _,
      revision: __,
      updatedAt: ___,
      thumbnail: ____,
      sources: _____,
      photos,
      themeImages,
      ...settings
    } = record;
    return {
      ...settings,
      photos: photos.map((photo) => loaded.get(photo.id)!),
      themeImages: Object.fromEntries(
        Object.entries(themeImages).map(([theme, images]) => [
          theme,
          images.map((image) => ({
            ...image,
            photo: loaded.get(image.photo.id)!,
          })),
        ]),
      ),
    };
  } catch (error) {
    loaded.forEach(disposePhoto);
    throw error;
  }
}
