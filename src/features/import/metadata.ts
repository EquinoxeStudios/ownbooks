import { titleFromFilename, titleFromFilenames, trackTitleFromFilename } from './formats';
import type { AudioTags } from './tags';

export type TaggedFile = { name: string; tags: AudioTags };

export type BookDetails = {
  title: string;
  author: string | null;
  /** Indexes into the input files, in playback order. */
  order: number[];
  /** Display title of each track, in playback order. */
  trackTitles: string[];
};

/** The most frequent non-empty value; ties go to the one seen first. */
function mostCommon(values: (string | undefined)[]): string | undefined {
  const counts = new Map<string, number>();
  let best: string | undefined;
  for (const v of values) {
    if (!v) continue;
    const n = (counts.get(v) ?? 0) + 1;
    counts.set(v, n);
    if (best === undefined || n > (counts.get(best) ?? 0)) best = v;
  }
  return best;
}

/**
 * Book details from the files' tags, falling back to their names.
 * `files` arrive in natural filename order.
 *
 * - Title: the album most files share; for a single file, its title tag
 *   (an M4B's title is the book); otherwise the filename rule.
 * - Author: album artist, then artist, then composer.
 * - Order: by (disc, track) when every file is numbered without repeats,
 *   otherwise filename order.
 */
export function bookDetails(files: readonly TaggedFile[]): BookDetails {
  const tags = files.map((f) => f.tags);
  const title =
    mostCommon(tags.map((t) => t.album)) ??
    (files.length === 1 ? tags[0]?.title : undefined) ??
    titleFromFilenames(files.map((f) => f.name));
  const author =
    mostCommon(tags.map((t) => t.albumArtist)) ??
    mostCommon(tags.map((t) => t.artist)) ??
    mostCommon(tags.map((t) => t.composer)) ??
    null;

  const order = files.map((_, i) => i);
  const numbered = tags.every((t) => t.track !== undefined);
  const keys = new Set(tags.map((t) => `${t.disc ?? 1}:${t.track}`));
  if (files.length > 1 && numbered && keys.size === files.length) {
    order.sort((a, b) => (tags[a].disc ?? 1) - (tags[b].disc ?? 1) || tags[a].track! - tags[b].track! || a - b);
  }

  return {
    title,
    author,
    order,
    trackTitles: order.map((i) => tags[i].title ?? trackTitleFromFilename(files[i].name)),
  };
}

/**
 * True if a saved book still has the title the filename rules gave it (the
 * current rule, or the earlier one that used the first file's name) and no
 * author, i.e. the user hasn't edited its details.
 */
export function hasFilenameDetails(title: string, author: string | null, names: readonly string[]): boolean {
  if (author || names.length === 0) return false;
  return title === titleFromFilenames(names) || title === titleFromFilename(names[0]);
}
