import { FileMode, type File } from 'expo-file-system';

import type { ByteSource } from './source';

/**
 * Runs `fn` with random-access reads over a local file:// file. Only for files
 * already copied into the app: FileHandle reads of picked content:// files
 * fail on Android ("Bad file descriptor").
 */
export function withFileSource<T>(file: File, fn: (source: ByteSource) => T): T {
  const size = file.size;
  const handle = file.open(FileMode.ReadOnly);
  try {
    return fn({
      size,
      read(offset, length) {
        const n = Math.max(0, Math.min(length, size - offset));
        if (n === 0) return new Uint8Array(0);
        handle.offset = offset;
        return handle.readBytes(n);
      },
    });
  } finally {
    handle.close();
  }
}
