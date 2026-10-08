/**
 * Position maths for books made of one or more tracks. A position is stored as
 * (trackIdx, positionInTrack); the book-wide position is derived from track
 * durations so progress bars and sync see one number.
 */
export type TrackSpan = { durationMs: number };

export function totalDuration(tracks: readonly TrackSpan[]): number {
  return tracks.reduce((sum, t) => sum + Math.max(0, t.durationMs), 0);
}

export function toGlobal(tracks: readonly TrackSpan[], trackIdx: number, positionMs: number): number {
  let offset = 0;
  const idx = clampIndex(tracks, trackIdx);
  for (let i = 0; i < idx; i++) offset += Math.max(0, tracks[i].durationMs);
  const within = Math.min(Math.max(0, positionMs), Math.max(0, tracks[idx]?.durationMs ?? 0));
  return offset + within;
}

export function fromGlobal(
  tracks: readonly TrackSpan[],
  globalMs: number,
): { trackIdx: number; positionMs: number } {
  if (tracks.length === 0) return { trackIdx: 0, positionMs: 0 };
  let remaining = Math.max(0, globalMs);
  for (let i = 0; i < tracks.length; i++) {
    const d = Math.max(0, tracks[i].durationMs);
    // A position exactly at a boundary belongs to the start of the next track.
    if (remaining < d || i === tracks.length - 1) {
      return { trackIdx: i, positionMs: Math.min(remaining, d) };
    }
    remaining -= d;
  }
  return { trackIdx: tracks.length - 1, positionMs: 0 };
}

export function fractionOf(tracks: readonly TrackSpan[], trackIdx: number, positionMs: number): number {
  const total = totalDuration(tracks);
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, toGlobal(tracks, trackIdx, positionMs) / total));
}

function clampIndex(tracks: readonly TrackSpan[], idx: number): number {
  if (tracks.length === 0) return 0;
  return Math.min(Math.max(0, Math.floor(idx)), tracks.length - 1);
}
