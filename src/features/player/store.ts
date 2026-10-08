import { create } from 'zustand';

export type PlayerTrack = { title: string | null; durationMs: number; uri: string };

export type PlayerState = {
  bookId: string | null;
  title: string;
  author: string | null;
  tracks: PlayerTrack[];
  trackIdx: number;
  /** Position within the current track. */
  positionMs: number;
  playing: boolean;
  buffering: boolean;
  loaded: boolean;
  speed: number;
  error: 'missingFile' | 'unplayable' | null;
};

export const emptyPlayerState: PlayerState = {
  bookId: null,
  title: '',
  author: null,
  tracks: [],
  trackIdx: 0,
  positionMs: 0,
  playing: false,
  buffering: false,
  loaded: false,
  speed: 1,
  error: null,
};

/** UI mirror of the player. Written only by src/features/player/controller.ts. */
export const usePlayerStore = create<PlayerState>(() => emptyPlayerState);
