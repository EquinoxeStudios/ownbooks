import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { AppState } from 'react-native';

import { getBook, markOpened } from '@/db/repositories/books';
import { getProgress, saveAudioPosition } from '@/db/repositories/progress';
import { listTracks } from '@/db/repositories/tracks';
import type { Db } from '@/db/types';

import { fractionOf, fromGlobal, toGlobal } from './position';
import { emptyPlayerState, usePlayerStore, type PlayerTrack } from './store';

/**
 * The single audio player for the app. One AudioPlayer is reused for every
 * track of a book (expo-audio's playlist API has no lock-screen controls, and
 * Android stops background audio after ~3 minutes without them).
 *
 * Position persistence (spec §4.6): written every 5 s while playing, and
 * immediately on pause (including OS pauses such as calls or unplugged
 * headphones), seek, track change, app backgrounding and unload.
 */

const SAVE_EVERY_MS = 5_000;
const UPDATE_INTERVAL_MS = 500;
const LOAD_TIMEOUT_MS = 15_000;

let player: AudioPlayer | null = null;
let statusSub: { remove(): void } | null = null;
let db: Db | null = null;
let lastSavedAt = 0;
let wasPlaying = false;
let switchingTrack = false;
/** False until the saved position is restored, so early status updates can't overwrite it. */
let restored = false;
let audioModeReady: Promise<void> | null = null;

const get = usePlayerStore.getState;
const set = usePlayerStore.setState;

function ensureAudioMode(): Promise<void> {
  audioModeReady ??= setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    // Required for lock-screen controls; also pauses other apps' audio.
    interruptionMode: 'doNotMix',
  });
  return audioModeReady;
}

AppState.addEventListener('change', (state) => {
  if (state !== 'active') void savePosition();
});

/** Absolute URI for a stored relative path (the documents dir moves between iOS installs). */
function uriFor(relativePath: string): File {
  return new File(Paths.document, relativePath);
}

/** Loads a book (no-op if it's already loaded) and optionally starts playing. */
export async function loadBook(database: Db, bookId: string, opts: { autoplay?: boolean } = {}) {
  db = database;
  if (get().bookId === bookId && player) {
    if (opts.autoplay) play();
    return;
  }
  await unload();

  const [book, trackRows, progress] = await Promise.all([
    getBook(database, bookId),
    listTracks(database, bookId),
    getProgress(database, bookId),
  ]);
  if (!book || trackRows.length === 0) return;

  const tracks: PlayerTrack[] = trackRows.map((t) => {
    const file = uriFor(t.file_path);
    return { title: t.title, durationMs: t.duration_ms, uri: file.exists ? file.uri : '' };
  });
  const speed = progress?.speed ?? 1;
  let trackIdx = Math.min(progress?.track_idx ?? 0, tracks.length - 1);
  let positionMs = progress?.position_ms ?? 0;
  // A finished book reopens at the start rather than at the very end.
  if (fractionOf(tracks, trackIdx, positionMs) >= 0.999) {
    trackIdx = 0;
    positionMs = 0;
  }

  set({
    ...emptyPlayerState,
    bookId,
    title: book.title,
    author: book.author,
    tracks,
    trackIdx,
    positionMs,
    speed,
  });

  if (tracks.some((t) => !t.uri)) {
    set({ error: 'missingFile' });
    return;
  }

  await ensureAudioMode();
  player = createAudioPlayer({ uri: tracks[trackIdx].uri }, { updateInterval: UPDATE_INTERVAL_MS });
  statusSub = player.addListener('playbackStatusUpdate', onStatus);
  player.setPlaybackRate(speed);
  player.setActiveForLockScreen(
    true,
    { title: book.title, artist: book.author ?? undefined, albumTitle: tracks[trackIdx].title ?? undefined },
    { showSeekForward: true, showSeekBackward: true },
  );
  await markOpened(database, bookId, Date.now());

  if (!(await waitUntilLoaded(player))) {
    set({ error: 'unplayable' });
    return;
  }
  if (positionMs > 0) await player.seekTo(positionMs / 1000);
  restored = true;
  set({ loaded: true });
  if (opts.autoplay) play();
}

function waitUntilLoaded(p: AudioPlayer): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (p !== player) return resolve(false);
      if (p.isLoaded) return resolve(true);
      if (Date.now() - started > LOAD_TIMEOUT_MS) return resolve(false);
      setTimeout(tick, 50);
    };
    tick();
  });
}

function onStatus(status: AudioStatus) {
  if (switchingTrack || !restored) return;
  const positionMs = Math.round(status.currentTime * 1000);
  set({ positionMs, playing: status.playing, buffering: status.isBuffering, loaded: status.isLoaded });

  if (status.didJustFinish) {
    void advanceTrack();
    return;
  }

  const now = Date.now();
  const paused = wasPlaying && !status.playing;
  wasPlaying = status.playing;
  if (paused || (status.playing && now - lastSavedAt >= SAVE_EVERY_MS)) void savePosition();
}

/** Moves to the next file of a multi-file book; at the end of the book, stops there. */
async function advanceTrack() {
  const { tracks, trackIdx } = get();
  if (trackIdx + 1 >= tracks.length) {
    const last = tracks[tracks.length - 1];
    set({ playing: false, positionMs: last?.durationMs ?? 0 });
    wasPlaying = false;
    await savePosition();
    return;
  }
  await switchTrack(trackIdx + 1, 0, true);
}

async function switchTrack(index: number, positionMs: number, autoplay: boolean) {
  const p = player;
  const { tracks, title, author } = get();
  const track = tracks[index];
  if (!p || !track) return;
  switchingTrack = true;
  try {
    p.replace({ uri: track.uri });
    set({ trackIdx: index, positionMs });
    p.updateLockScreenMetadata({ title, artist: author ?? undefined, albumTitle: track.title ?? undefined });
    if (autoplay) p.play();
    if (positionMs > 0) {
      await waitUntilLoaded(p);
      await p.seekTo(positionMs / 1000);
    }
  } finally {
    switchingTrack = false;
  }
  await savePosition();
}

export function play() {
  if (!player) return;
  player.play();
  set({ playing: true });
}

export function pause() {
  if (!player) return;
  player.pause();
  set({ playing: false });
  wasPlaying = false;
  void savePosition();
}

export function togglePlay() {
  if (get().playing) pause();
  else play();
}

/** Seeks to a position across the whole book, switching files if needed. */
export async function seekToGlobal(globalMs: number) {
  const { tracks, trackIdx, playing } = get();
  if (!player || tracks.length === 0) return;
  const target = fromGlobal(tracks, globalMs);
  if (target.trackIdx !== trackIdx) {
    await switchTrack(target.trackIdx, target.positionMs, playing);
    return;
  }
  set({ positionMs: target.positionMs });
  await player.seekTo(target.positionMs / 1000);
  await savePosition();
}

export async function skipBy(deltaMs: number) {
  const { tracks, trackIdx, positionMs } = get();
  await seekToGlobal(toGlobal(tracks, trackIdx, positionMs) + deltaMs);
}

/** Previous/next file for multi-file books (chapters arrive in milestone 3). */
export async function previousTrack() {
  const { trackIdx, positionMs, playing } = get();
  // Like most players: go to the start of this track unless we're near it.
  if (positionMs > 3_000 || trackIdx === 0) await seekToGlobal(globalPosition() - positionMs);
  else await switchTrack(trackIdx - 1, 0, playing);
}

export async function nextTrack() {
  const { trackIdx, tracks, playing } = get();
  if (trackIdx + 1 < tracks.length) await switchTrack(trackIdx + 1, 0, playing);
}

export function setSpeed(rate: number) {
  player?.setPlaybackRate(rate);
  set({ speed: rate });
  void savePosition();
}

export function globalPosition(): number {
  const { tracks, trackIdx, positionMs } = get();
  return toGlobal(tracks, trackIdx, positionMs);
}

export async function savePosition(): Promise<void> {
  const { bookId, tracks, trackIdx, positionMs, speed, loaded } = get();
  if (!db || !bookId || !loaded) return;
  lastSavedAt = Date.now();
  try {
    await saveAudioPosition(db, {
      bookId,
      trackIdx,
      positionMs,
      fraction: fractionOf(tracks, trackIdx, positionMs),
      speed,
      at: lastSavedAt,
    });
  } catch (error) {
    console.warn('Saving position failed', error);
  }
}

/** Saves the position and releases the player (e.g. on sign-out or switching books). */
export async function unload(): Promise<void> {
  await savePosition();
  statusSub?.remove();
  statusSub = null;
  if (player) {
    player.clearLockScreenControls();
    player.remove();
  }
  player = null;
  wasPlaying = false;
  restored = false;
  set(emptyPlayerState);
}
