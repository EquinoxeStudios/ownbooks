export type CoverImage = { mime: 'image/jpeg' | 'image/png'; bytes: Uint8Array };

export type TagChapter = { title: string | null; startMs: number };

/** The subset of a file's tags OwnBooks uses. Every field is optional. */
export type AudioTags = {
  title?: string;
  album?: string;
  artist?: string;
  albumArtist?: string;
  composer?: string;
  track?: number;
  disc?: number;
  cover?: CoverImage;
  chapters?: TagChapter[];
};

export type ReadOptions = {
  /** Skip reading cover bytes (e.g. one was already found in an earlier file). */
  cover?: boolean;
};

/** Covers bigger than this are ignored rather than loaded into memory. */
export const MAX_COVER_BYTES = 10 * 1024 * 1024;
/** Larger tag blocks (or chapter lists) than this are treated as corrupt. */
export const MAX_TAG_BYTES = 16 * 1024 * 1024;
export const MAX_CHAPTERS = 5000;

/** Identifies JPEG/PNG data by its magic number; anything else is rejected. */
export function imageMime(bytes: Uint8Array): CoverImage['mime'] | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  return null;
}
