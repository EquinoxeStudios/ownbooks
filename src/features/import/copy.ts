/** Minimal file-handle shape (matches expo-file-system's FileHandle). */
export type ReadHandle = { readBytes(length: number): Uint8Array; close(): void };
export type WriteHandle = { writeBytes(bytes: Uint8Array): void; close(): void };

export class CopyCancelled extends Error {
  constructor() {
    super('Copy cancelled');
  }
}

export const COPY_CHUNK = 1024 * 1024;

/**
 * Copies `total` bytes in 1 MiB chunks, yielding to the event loop between
 * chunks so the UI keeps rendering, reporting progress, and stopping promptly
 * when `isCancelled` turns true. The caller deletes the partial destination.
 */
export async function chunkedCopy(
  source: ReadHandle,
  dest: WriteHandle,
  total: number,
  onProgress: (copied: number) => void,
  isCancelled: () => boolean,
  yieldToUi: () => Promise<void> = () => new Promise((r) => setTimeout(r, 0)),
): Promise<number> {
  let copied = 0;
  try {
    while (copied < total) {
      if (isCancelled()) throw new CopyCancelled();
      const chunk = source.readBytes(Math.min(COPY_CHUNK, total - copied));
      if (chunk.length === 0) break; // Source shorter than reported; stop rather than loop.
      dest.writeBytes(chunk);
      copied += chunk.length;
      onProgress(copied);
      await yieldToUi();
    }
    return copied;
  } finally {
    source.close();
    dest.close();
  }
}
