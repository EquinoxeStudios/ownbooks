import { readId3 } from './id3';
import { readMp4 } from './mp4';
import type { ByteSource } from './source';
import type { AudioTags, ReadOptions } from './types';

export type { ByteSource } from './source';
export type { AudioTags, CoverImage, TagChapter } from './types';

/**
 * Reads tags from an audio file. Never throws: unreadable or corrupt tags
 * yield empty tags, because bad metadata must never fail an import.
 */
export function readTags(source: ByteSource, extension: string, opts: ReadOptions = {}): AudioTags {
  try {
    if (extension === 'mp3') return readId3(source, opts);
    if (extension === 'm4b' || extension === 'm4a') return readMp4(source, opts);
  } catch (error) {
    console.warn('Could not read tags', error);
  }
  return {};
}
