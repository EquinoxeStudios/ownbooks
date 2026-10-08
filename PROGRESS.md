# OwnBooks: Progress

Last updated: 2026-10-08

Source of truth for scope: [`docs/design/spec.md`](docs/design/spec.md), plus the
interview decisions in the build plan (summarised in "Decisions" below).
Each milestone ends with a build running on a real device and a review before the
next one starts.

## Status at a glance

| # | Milestone | Status |
|---|---|---|
| 0 | Prerequisites (accounts, MCP servers, backend projects) | ✅ Done (Apple / Play Console pending) |
| 1 | Foundation | ✅ Code complete, running on Android; review in progress |
| 2 | Single-file audio + audio risk spike | 🔨 Built, awaiting device checks |
| 3 | Full audio | ⬜ Not started |
| 4 | Ebooks | ⬜ Not started |
| 5 | Sync | ⬜ Not started |
| 6 | Analytics, polish, release prep | ⬜ Not started |

## Infrastructure

| What | Where |
|---|---|
| Repo | https://github.com/EquinoxeStudios/ownbooks (public, MIT) |
| CI | GitHub Actions: lint, typecheck, Jest, RLS tests against local Supabase (all green) |
| Supabase | Project `ownbooks` (`ukqhhjlrthzlulxniqqu`), Equinoxe Studios org (Pro), eu-central-1 |
| Supabase auth | Email 6-digit OTP (custom templates), Google (web + iOS client IDs, skip nonce on) |
| Firebase | Project `ownbooksapp`; Android + iOS apps registered for `dev.ownbooks.app`; Android SHA-1 added |
| Google OAuth | Project `ownbooksapp`: consent screen in Testing mode, web, iOS and Android clients |
| EAS | `@agencyequinox/ownbooks`; env vars set for development / preview / production |
| Android signing | EAS-managed keystore (SHA-1 `6B:AD:D3:3D:0D:84:4F:24:DE:58:51:0D:89:B5:0D:D5:B7:91:5C:E8`) |
| Latest Android preview build | https://expo.dev/accounts/agencyequinox/projects/ownbooks/builds/239dee60-4660-4bd2-bc34-8eab20f3725d |
| MCP servers (local) | supabase, firebase, expo (the github MCP token is broken; use the `gh` CLI) |

## Milestone 1: Foundation ✅

Done:
- Expo SDK 57 project (TypeScript strict, Expo Router, React Compiler), portrait only,
  placeholder bundle ID `dev.ownbooks.app`, Android minSdk 29.
- Design system from `docs/design/design.html`: tokens, Rubik + Literata fonts, Button,
  Card, Chip/Tag, Icon (design SVGs), IconButton, ProgressBar, TextField, BackHeader,
  TabBar, GeneratedCover.
- Onboarding: Welcome → Nothing gets uploaded → Never lose your place → What will you
  bring first? (stored; sets the default library filter and the empty-state copy).
- Sign-in: Apple (iOS only), Google, email 6-digit code with resend cooldown, Terms/Privacy links.
- Local-first auth state: the account is remembered in SQLite, so the app works offline
  with an expired session. Sign-out keeps files and hides the library. A different
  account signing in gets a prompt to remove the other account's local data.
- SQLite schema v1 with versioned migrations, repositories (kv, books, accounts),
  live queries via change listeners, exclusive transactions.
- Supabase schema: devices, books (with tombstone), progress, activity_days; RLS on
  every table; stale-write rejection; server-side pull cursors; indexed FKs.
- Tabs: Library (empty state + basic list), Activity (placeholder), Profile (account,
  Privacy/Terms, sign out, version).
- i18n: every string in `src/locales/en.json`.
- Startup diagnostics: an error boundary and a stall screen with boot breadcrumbs.
- Tests: 28 unit tests (node:sqlite), 17 RLS tests in CI.
- Fixed: launch hang caused by unstable `SQLiteProvider` props in suspense mode.

Verified on device (Android): onboarding, Google sign-in.

Still to verify in the Milestone 1 review:
- [ ] Email code sign-in (code arrives as 6 digits, not a link)
- [ ] Profile → sign out → sign back in
- [ ] Offline relaunch (airplane mode) stays signed in
- [ ] Account switch prompt (sign in with a second account)
- [ ] iPhone build: blocked on the Apple Developer account

## Milestone 2: Single-file audio + risk spike 🔨

Done (code, tests green):
- [x] Import via `expo-document-picker` (multi-select). Files are copied with the native
      async copy (progress by polling the destination size; a cancel cleans up when the copy
      returns) into `books/.import-<id>/`, then renamed to `books/<bookId>/` together with the
      DB insert. Failure or cancel leaves nothing behind; stale temp folders are cleaned on launch.
- [x] Grouping: several MP3/M4A → one book (natural sort); each M4B its own book; DRM/unsupported rejected
- [x] Duration probe (also proves the file plays), fingerprint (size + first/last 1 MiB, SHA-256),
      duplicate detection, free-space check
- [x] Import screen ("We found your audiobook", edit title/author, copy progress) + success screen
- [x] Player controller: one `AudioPlayer` for every book, multi-file track switching,
      position saved every 5 s and on pause/seek/track change/background/unload,
      restored on reopen, speed remembered per book
- [x] Player screen as designed (cover, seek bar with screen-reader support, −15/+30, prev/next track)
- [x] Mini-player above the tab bar; library rows open the player
- [x] Lock screen / notification controls (title, author, track)
- [x] Playback stops and lock-screen controls clear on sign-out / account switch

Audio findings (expo-audio 57):
- `AudioPlaylist` has no lock-screen support, and Android stops background audio after ~3 min
  without it, so books use a single `AudioPlayer` and switch files on track end.
- Lock-screen skip was hardcoded to 10 s and Android didn't pause on unplugged headphones.
  Fixed with `patches/expo-audio+57.0.5.patch` (patch-package): lock screen −15 s / +30 s
  on both platforms, `setHandleAudioBecomingNoisy(true)` on Android. **Re-check this patch
  on every Expo SDK upgrade.** Lock-screen intervals stay fixed even when in-app skip
  intervals become configurable (milestone 3).
- expo-file-system 57: reading a picked `content://` file through `FileHandle` fails on Android
  with "Bad file descriptor" (the ParcelFileDescriptor is garbage-collected), so imports use the
  native copy instead of chunked JS reads. Worth reporting upstream.
- No lock-screen artwork yet: generated covers aren't images. Real cover art arrives in milestone 3.

Device checks (spec §6.1). Stop and reassess the audio library if any fail:
- [ ] Position writes keep working with the screen locked for 30+ min
- [ ] Lock screen shows −15 / +30 (not previous/next track)
- [ ] Multi-file book plays across file boundaries without an audible gap or stall
- [ ] Resumes correctly after a phone call
- [ ] Pauses on Bluetooth disconnect / unplugged headphones; controllable from a Bluetooth headset
- [ ] Force-quit during playback loses ≤ 5 s; reboot resumes at the saved position
- [ ] Large file (500 MB M4B) imports with visible progress and without freezing
- [ ] Sleep timer under lock: moved to milestone 3 together with the sleep timer itself

## Milestone 3: Full audio ⬜

- [ ] Multi-file import: track-number tag order, review step (reorder / split / merge); basic multi-file import exists from M2
- [ ] Grouping rule: several MP3/M4A files → one book; each M4B / EPUB → its own book; mixed → review
- [ ] Import success screen
- [ ] M4B chapters, tags and cover art (evaluate `music-metadata` with chunked reads)
- [ ] Chapter / track list, previous/next chapter
- [ ] Speed sheet 0.5–3.0× (stored per book already), sleep timer (durations + end of chapter), configurable skip intervals
- [ ] Library: Continue card, sort sheet, filters, book detail (edit / delete / mark as finished)
- [ ] Local listening activity (daily seconds)

## Milestone 4: Ebooks ⬜

- [ ] foliate-js spike in a WebView (fallback: epub.js); vendored at a pinned commit
- [ ] EPUB import + DRM detection (`META-INF/encryption.xml`)
- [ ] Reader: paginated, tap/swipe, themes light/sepia/dark (follow system), text size,
      line spacing, margins, Literata + publisher-font toggle
- [ ] TOC, CFI persistence, font-size change keeps the passage, link handling (confirm external)
- [ ] Local reading activity (2-minute idle cut-off)

## Milestone 5: Sync ⬜

- [ ] Fingerprints (SHA-256 of size + first 1 MB + last 1 MB; multi-file = hash of track hashes)
- [ ] Sync engine: device upsert, push dirty rows / pending ops, pull since cursor, last write wins
- [ ] Triggers: foreground, book open/close, pause, ~60 s during playback, reconnect
- [ ] "Not on this device" placeholders + adoption on import
- [ ] Conflict sheet ("You're further ahead on your iPad")
- [ ] Remove from all devices (tombstone)
- [ ] Activity tab (this week, listening vs reading, books finished, days with books) + History
- [ ] Profile: Your devices + "In sync"
- [ ] Delete account: Edge Function + in-app confirmation + web deletion page

## Milestone 6: Analytics, polish, release prep ⬜

- [ ] Consent screen (equal-weight Accept/Decline) + Settings toggle
- [ ] Firebase Analytics (consent mode defaults to denied, ad ID off) + Crashlytics, both consent-gated
- [ ] Event wrapper that rejects any book data; events from the spec + onboarding property
- [ ] Storage screen (per book + total)
- [ ] Empty and error states, accessibility pass (VoiceOver / TalkBack)
- [ ] Maestro flows
- [ ] GitHub Pages `/site`: privacy policy, terms, account deletion page
- [ ] Store listings, privacy labels (email, usage data, diagnostics)
- [ ] Final bundle ID and legal entity; Google OAuth consent screen → In production

## Open items / waiting on

- **Apple Developer account** ($99/yr): needed for any iPhone build and Sign in with Apple.
- **Google Play Console** ($25): needed for release (Milestone 6).
- **Production email sender** (e.g. Resend or Postmark): Supabase's built-in sender is for testing only.
- **Final bundle ID + publishing entity**: placeholder is `dev.ownbooks.app`.

## Decisions (from the planning interview)

Synced daily Activity totals (no link to any book) · devices table · light-only app
chrome (dark player, themed reader) · email OTP (no magic links) · phones, portrait only ·
English, i18n-ready · multi-file audiobooks in v1 · Literata + publisher-font toggle ·
MIT · GitHub Pages for the legal and deletion pages · Crashlytics behind consent ·
stop for review after each milestone · Expo SDK 57 (the plan said 56; 57 is current).
