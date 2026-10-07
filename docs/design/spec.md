# OwnBooks: Build Spec

A free, open-source mobile app (iOS and Android) that lets people import, play, and read their own DRM-free audiobooks and ebooks, with their reading and listening progress synced across devices.

## 1. Principles

- **Always free.** No purchases, no subscriptions, no ads.
- **Account required, files stay local.** Users sign in to use the app. Book files never leave the device; only progress and basic library metadata sync.
- **Offline-capable.** After the first sign-in, everything works without a connection. The local database is the source of truth; sync catches up when the network returns.
- **Never lose the user's place.** Position is saved automatically and survives app kills, crashes, and reboots.
- **What people read is private.** Analytics never contain book titles, authors, or filenames.
- **Open source.** Anyone can build it with their own backend configuration; no secrets in the repository.

## 2. Non-goals for v1

- Uploading or syncing the book files themselves
- DRM-protected files (Audible AAX/AA, Kindle AZW/KFX, Adobe DRM EPUB)
- A store, catalog, or any way to download books
- PDF, MOBI, CBZ, and other ebook formats
- Bookmarks, highlights, notes
- Linking an ebook to its audiobook
- Streaming from URLs, podcasts, OPDS, or network shares
- Social features, sharing, recommendations

## 3. Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Expo (React Native) + TypeScript, latest stable SDK | Dev builds via EAS; New Architecture enabled |
| Navigation | Expo Router | |
| Audio | `expo-audio` | Background playback and lock screen controls are built in. See 6.1 for what must be proven early |
| File import | `expo-document-picker` | Multi-select enabled |
| File storage | `expo-file-system` | Books live under the app document directory |
| Local database | `expo-sqlite` | Library, tracks, chapters, progress, sync queue |
| UI state | Zustand | |
| EPUB rendering | WebView + `foliate-js` | Vendored at a pinned commit (no npm releases). Fallback: `epub.js` if the spike fails |
| Audio metadata | To be evaluated (e.g. `music-metadata`) | Must read tags, cover art, and M4B chapters without loading whole files into memory |
| Backend | Supabase (Auth + Postgres with row-level security) | Auth and progress sync only |
| Analytics | Firebase Analytics via `@react-native-firebase/analytics` | Consent-gated; see 4.8 |
| Tests | Jest for logic; Maestro for end-to-end flows | |

**Not used:** `react-native-track-player`. Version 5 is commercially licensed (free for personal and educational use only), which does not fit an open-source app that others may fork and ship. Version 4 remains Apache-2.0 but receives no new development; treat it as a last resort only.

**Minimum OS versions**

- **Android:** 10 (API 29), released 2019.
- **iOS:** the minimum deployment target of the chosen Expo SDK. Recent SDKs require iOS 16.4, so iOS 13 (2019) is not reachable. iOS 16 still runs on iPhone 8 and later, so phones from 2019 are covered. Confirm the exact number against the Expo SDK in use.

## 4. Features (v1)

### 4.1 Accounts

- The app opens to a sign-in screen; a signed-in session is required to reach the library.
- Sign-in methods: email (one-time code or magic link), Sign in with Apple, Sign in with Google. Apple sign-in is mandatory on iOS when Google sign-in is offered.
- Session persists securely (`expo-secure-store`) and refreshes silently. An expired session while offline must not lock the user out of books already on the device.
- Sign out: keeps local files, hides the library until the same account signs back in. A different account signing in on the same device gets its own empty library; offer to remove the previous account's local data.
- **Delete account** in Settings: removes the server-side account and all synced data, then clears local data. Required by both app stores. Also publish a web page where deletion can be requested without the app (Google Play requirement).
- Privacy policy and terms linked from the sign-in screen and Settings.

### 4.2 Library

- One shelf showing audiobooks and ebooks together, with a filter (All / Audiobooks / Ebooks).
- Each item shows cover, title, author, type, and progress.
- Sort by recently opened (default), title, author, date added.
- "Continue" affordance for the most recently opened book.
- Detail screen: edit title/author, delete book (with confirmation).
- **Books known from another device** appear as placeholders marked "Not on this device". Tapping one explains that the file must be imported here to continue, and opens the import flow.
- Empty state explains what the app does, that files must be DRM-free, and has an Import button.

### 4.3 Import

- Import button opens the system file picker.
- Supported types: `.mp3`, `.m4b`, `.m4a` (audio); `.epub` (ebook).
- **Single-file audiobook:** one file becomes one book.
- **Multi-file audiobook:** the user multi-selects files; they are grouped into one book. Order by track-number tag when present, otherwise natural filename sort (`2.mp3` before `10.mp3`). The user confirms the title before saving.
- Files are **copied** into the app's document directory (`books/<bookId>/`). Never rely on the original URI.
- Show copy progress for large files; allow cancel; clean up partial copies on failure or cancel.
- Extract metadata on import: title, author, duration, cover art, chapters (M4B), table of contents (EPUB). Fall back to the filename and a generated placeholder cover.
- Compute the book **fingerprint** (see 4.7) and, if it matches a placeholder from another device, attach the file to that record and adopt its progress.
- Unsupported or DRM-protected files produce a clear, friendly error.
- Show storage used per book and in total (Settings).

### 4.4 Audiobook player

- Play / pause, seek bar with elapsed and remaining time.
- Skip back and forward (defaults 15 s / 30 s, configurable).
- Playback speed 0.5x to 3.0x, remembered per book.
- Sleep timer: fixed durations and "end of chapter".
- Chapter list for M4B; track list for multi-file books.
- Background playback with lock screen / notification controls and artwork.
- Headset and Bluetooth controls.
- Correct behaviour on interruptions (calls, unplugged headphones).
- Mini-player visible across the app while a book is loaded.

### 4.5 Ebook reader

- EPUB 2 and EPUB 3, reflowable layout.
- Paginated reading with tap and swipe page turns.
- Font size, line spacing, margins.
- Themes: light, dark, sepia; follow the system theme by default.
- Table of contents with jump-to-chapter.
- Progress indicator.
- Internal links work; external links open in the system browser after confirmation.

### 4.6 Local position persistence (critical)

- **Audio:** write position to SQLite every 5 seconds during playback, and immediately on pause, seek, track change, app background, and sleep-timer stop.
- Multi-file books store `trackIndex` + `positionInTrack`; global progress is derived from track durations.
- **Ebook:** store the EPUB CFI on every page turn (debounced). Never store page numbers.
- Reopening a book resumes at the saved position with no prompt (unless a newer remote position exists; see 4.7).

### 4.7 Cloud sync

**What syncs:** per-book progress (track index, position, CFI, fraction, speed, timestamp, device name) and minimal book metadata (fingerprint, type, title, author, duration). **What never syncs:** book files and cover images.

- **Fingerprint:** identifies the same book on two devices without uploading it. For a file: SHA-256 over file size + first 1 MB + last 1 MB. For a multi-file audiobook: SHA-256 over the ordered list of track fingerprints. Never hash whole files.
- **When:** on app foreground, on opening and closing a book, on pause, and about once a minute during playback while online.
- **Offline:** changes go into a local queue and flush when connectivity returns. Sync failures are silent and retried; they never block playback or reading.
- **Conflicts:** last write wins per book, by timestamp. When a book is opened and the server holds a newer position from another device that differs meaningfully from the local one, ask: "Continue from where you left off on <device>?" with both options.
- **Deleting a book** on a device removes its files locally. A separate "Remove from all devices" action deletes the synced record.
- The same file encoded differently on two devices will not match. Manual linking is a later feature.

### 4.8 Analytics and consent

- Analytics is **off until the user consents**. Ask once after sign-in, with equal-weight Accept and Decline, and a toggle in Settings. Use Firebase consent mode; default all consent types to denied.
- Disable advertising ID collection and ad personalisation signals. The app does not track users across apps, so no App Tracking Transparency prompt is needed.
- Suggested events: `sign_up`, `login`, `import_started`, `import_completed` (type, format, size bucket, track count), `import_failed` (reason), `playback_started`, `playback_session` (duration bucket), `reader_opened`, `book_finished` (type), `sync_conflict_shown`, `account_deleted`.
- **Never send** titles, authors, filenames, fingerprints, or any free text derived from a book.
- App store privacy labels must declare: account identifier (email), usage data, and diagnostics if crash reporting is added.

## 5. Data model

### 5.1 Local (SQLite)

```sql
CREATE TABLE books (
  id             TEXT PRIMARY KEY,     -- uuid
  user_id        TEXT NOT NULL,
  fingerprint    TEXT NOT NULL,
  type           TEXT NOT NULL,        -- 'audio' | 'ebook'
  title          TEXT NOT NULL,
  author         TEXT,
  cover_path     TEXT,                 -- relative path; null for placeholders
  duration_ms    INTEGER,
  size_bytes     INTEGER,
  on_device      INTEGER NOT NULL DEFAULT 1,  -- 0 = known from sync only
  added_at       INTEGER NOT NULL,
  last_opened_at INTEGER,
  UNIQUE (user_id, fingerprint)
);

CREATE TABLE tracks (
  id          TEXT PRIMARY KEY,
  book_id     TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  idx         INTEGER NOT NULL,
  file_path   TEXT NOT NULL,           -- relative path
  title       TEXT,
  duration_ms INTEGER NOT NULL
);

CREATE TABLE chapters (
  id        TEXT PRIMARY KEY,
  book_id   TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  track_idx INTEGER NOT NULL,
  title     TEXT,
  start_ms  INTEGER NOT NULL
);

CREATE TABLE ebook_files (
  book_id   TEXT PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL
);

CREATE TABLE progress (
  book_id     TEXT PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
  track_idx   INTEGER,
  position_ms INTEGER,
  cfi         TEXT,
  fraction    REAL NOT NULL DEFAULT 0,
  speed       REAL,
  updated_at  INTEGER NOT NULL,
  dirty       INTEGER NOT NULL DEFAULT 0   -- 1 = not yet pushed
);
```

Store **relative** file paths; the absolute document directory changes between installs on iOS. Use versioned migrations from the first release.

### 5.2 Remote (Supabase Postgres)

```sql
create table books (
  user_id     uuid not null references auth.users on delete cascade,
  fingerprint text not null,
  type        text not null,
  title       text not null,
  author      text,
  duration_ms bigint,
  created_at  timestamptz not null default now(),
  primary key (user_id, fingerprint)
);

create table progress (
  user_id     uuid not null,
  fingerprint text not null,
  track_idx   int,
  position_ms bigint,
  cfi         text,
  fraction    real not null default 0,
  speed       real,
  device_name text,
  updated_at  timestamptz not null,
  primary key (user_id, fingerprint),
  foreign key (user_id, fingerprint) references books on delete cascade
);
```

- Enable row-level security on both tables; every policy is `user_id = auth.uid()`.
- Progress upserts must reject writes older than the stored `updated_at`.
- Account deletion runs in an Edge Function using the service role to delete the auth user; cascades remove the rest.

## 6. Architecture notes

- Suggested structure: `app/` (routes), `src/features/{auth,library,import,player,reader,sync,analytics,settings}`, `src/db`, `src/lib`.
- All database access goes through a repository layer; no SQL in components.
- The UI reads only from SQLite. The sync module is the only code that talks to Supabase tables.
- Import is a pipeline: pick → validate → copy → extract metadata → fingerprint → write rows. Each step must be safe to fail, leaving no orphan files or rows.
- Metadata extraction and fingerprinting must not read whole files into JS memory. Audiobooks commonly exceed 300 MB.
- The EPUB reader talks to the WebView through a typed message bridge (`relocated`, `tocLoaded`, `setTheme`, `goTo`, ...). The WebView must not load remote content; scripts inside EPUBs are disabled or sandboxed.
- Analytics goes through one thin wrapper that enforces consent and the "no book data" rule.

### 6.1 Audio risk to retire in milestone 2

`expo-audio` is less specialised for long-form audio than a dedicated player library. Prove these on real devices before building further on it:

- Position writes and the sleep timer keep working with the screen locked for 30+ minutes on both platforms.
- Lock screen shows skip-back / skip-forward by interval, not next / previous track.
- Multi-file books play across file boundaries without an audible gap or stall.
- Playback resumes correctly after a phone call and after Bluetooth disconnect / reconnect.

If any of these cannot be met, stop and reassess the audio library before continuing.

### 6.2 Configuration and open source

- Supabase URL, anon key, and Firebase config files come from environment / EAS secrets and are **not committed**. Provide `.env.example` and setup instructions so forks can use their own projects.
- The Supabase anon key is safe in a client only because row-level security is correct; add tests that one user cannot read another's rows.
- Include `LICENSE`, `README` with build steps, and SQL migrations for the backend in the repository.

### 6.3 Platform configuration

- **iOS:** `UIBackgroundModes: ["audio"]`; document types for supported formats; Sign in with Apple capability.
- **Android:** media playback foreground service; `POST_NOTIFICATIONS` on Android 13+; no broad storage permissions.

## 7. Milestones

1. **Foundation.** Expo project, routing, SQLite with migrations, Supabase project with auth and row-level security, sign-in / sign-out, empty library, dev builds on both platforms.
2. **Single-file audio.** Import one MP3/M4B, play with background and lock screen controls, persist and restore position. Retire the risks in 6.1.
3. **Full audio.** Multi-file import and ordering, M4B chapters, metadata and covers, speed, skip, sleep timer, mini-player.
4. **Ebooks.** `foliate-js` spike, import, reader with themes and font controls, table of contents, CFI persistence.
5. **Sync.** Fingerprints, remote schema, sync queue, placeholders for books on other devices, conflict prompt, account deletion.
6. **Analytics and release.** Consent flow, events, empty and error states, storage screen, accessibility pass, Maestro flows, privacy policy, store listings and privacy labels.

Each milestone ends with a build that runs on a real iPhone and a real Android device.

## 8. Acceptance criteria

- Force-quitting during playback loses at most 5 seconds of position.
- Rebooting the phone and reopening a book resumes at the saved position.
- A 500 MB M4B imports without crashing or freezing the UI, with visible progress.
- A 40-file MP3 audiobook imports as one book in the correct order and plays through file boundaries.
- Audio continues with the screen locked and is controllable from the lock screen and a Bluetooth headset.
- Changing font size in an EPUB keeps the reader at the same passage.
- With the same file imported on two devices, pausing on one and opening on the other offers the newer position within a few seconds when both are online.
- In airplane mode, a signed-in user can import, play, and read normally; progress syncs after reconnecting.
- One user cannot read or write another user's rows (automated test against row-level security).
- Deleting the account removes all server rows and the auth user, and clears local data.
- With analytics declined, no analytics requests leave the device. With it accepted, no event contains book titles, authors, filenames, or fingerprints.
- Importing a DRM-protected or unsupported file shows a clear message and leaves nothing behind.
- Screen readers (VoiceOver, TalkBack) can operate sign-in, the library, and the player.

## 9. Later (post-v1)

- PDF support
- Bookmarks, highlights, notes (synced)
- "Open in" / share-sheet import from other apps
- Folder import on Android
- Manual linking of differently encoded copies of the same book
- Optional file backup to the user's own cloud storage
- CarPlay and Android Auto
- Ebook and audiobook linking

## 10. Decisions

| Topic | Decision |
|---|---|
| App name | OwnBooks |
| Bundle identifiers | TBD (`<reverse-domain>.ownbooks`) |
| Licence | MIT recommended; MPL-2.0 if changes to the app's files should be shared back. To be confirmed |
| Accounts | Required to use the app |
| Sync | Progress and library metadata only; files stay on device |
| Analytics | Firebase Analytics, consent-gated |
| Audio library | `expo-audio` |
| EPUB renderer | `foliate-js`, with `epub.js` as fallback |
| Minimum OS | Android 10; iOS at the Expo SDK minimum (16.4 on recent SDKs) |

**Still open**

- Bundle identifiers and the legal entity that publishes the app and acts as data controller.
- Final licence choice.
- Multi-file audiobooks in v1 or deferred.
- Whether required sign-in passes App Store review. Apple can object to mandatory login when core features (here, local playback) work without an account. The fallback is a "continue without an account" path with sync disabled, so keep the auth gate easy to relax.
