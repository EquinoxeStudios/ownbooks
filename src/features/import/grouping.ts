import { naturalSortBy } from '@/lib/naturalSort';

import { classify, extensionOf, titleFromFilenames, type RejectReason } from './formats';

export type PickedFile = { uri: string; name: string; size: number };

export type ImportGroup = {
  kind: 'audio' | 'ebook';
  /** Files in playback order. */
  files: PickedFile[];
  suggestedTitle: string;
};

export type Rejected = { name: string; reason: RejectReason };

/**
 * Spec rule: several MP3/M4A files become one audiobook (natural filename
 * order; track-number tags refine this in milestone 3); every M4B and every
 * EPUB is its own book.
 */
export function groupPickedFiles(files: readonly PickedFile[]): {
  groups: ImportGroup[];
  rejected: Rejected[];
} {
  const rejected: Rejected[] = [];
  const looseAudio: PickedFile[] = [];
  const groups: ImportGroup[] = [];

  for (const file of files) {
    const c = classify(file.name);
    if ('reject' in c) {
      rejected.push({ name: file.name, reason: c.reject });
    } else if (c.kind === 'ebook') {
      groups.push({ kind: 'ebook', files: [file], suggestedTitle: titleFromFilenames([file.name]) });
    } else if (extensionOf(file.name) === 'm4b') {
      groups.push({ kind: 'audio', files: [file], suggestedTitle: titleFromFilenames([file.name]) });
    } else {
      looseAudio.push(file);
    }
  }

  if (looseAudio.length > 0) {
    const ordered = naturalSortBy(looseAudio, (f) => f.name);
    groups.unshift({
      kind: 'audio',
      files: ordered,
      suggestedTitle: titleFromFilenames(ordered.map((f) => f.name)),
    });
  }

  return { groups, rejected };
}
