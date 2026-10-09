// Generates the tiny tagged audio files used by the tag-reader tests.
// Requires ffmpeg on PATH. Run: node scripts/make-tag-fixtures.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(import.meta.dirname, '..', 'src', 'features', 'import', 'tags', '__tests__', 'fixtures');
mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'ownbooks-fixtures-'));

const ffmpeg = (...args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
const silence = (seconds) => ['-f', 'lavfi', '-t', String(seconds), '-i', 'anullsrc=r=8000:cl=mono'];
const bitexact = ['-fflags', '+bitexact', '-flags:a', '+bitexact'];

const jpg = join(work, 'cover.jpg');
const png = join(work, 'cover.png');
ffmpeg('-f', 'lavfi', '-i', 'color=c=0x147B5B:s=8x8', '-frames:v', '1', jpg);
ffmpeg('-f', 'lavfi', '-i', 'color=c=0xF2B33D:s=8x8', '-frames:v', '1', png);

// Chapters at 0, 1 and 2 seconds of a 3-second file.
const chapters = join(work, 'chapters.txt');
writeFileSync(
  chapters,
  [
    ';FFMETADATA1',
    'title=Chaptered Book',
    'artist=Ann Author',
    'album=Chaptered Book',
    ...[
      ['0', '1000', 'Opening'],
      ['1000', '2000', 'Middle – part two'],
      ['2000', '3000', 'The End'],
    ].flatMap(([start, end, title]) => ['[CHAPTER]', 'TIMEBASE=1/1000', `START=${start}`, `END=${end}`, `title=${title}`]),
    '',
  ].join('\n'),
);

// MP3, ID3v2.3, non-Latin-1 text (forces UTF-16), track/disc numbers, front cover.
ffmpeg(
  ...silence(1), '-i', jpg,
  '-map', '0:a', '-map', '1:v', '-c:a', 'libmp3lame', '-b:a', '8k', '-c:v', 'copy',
  '-id3v2_version', '3',
  '-metadata', 'title=Chapter Three',
  '-metadata', 'album=Wuthering Heights',
  '-metadata', 'artist=Emily Brontë',
  '-metadata', 'album_artist=Emily Brontë',
  '-metadata', 'composer=Narrator Name',
  '-metadata', 'track=3/40',
  '-metadata', 'disc=1/2',
  '-metadata:s:v', 'title=Album cover', '-metadata:s:v', 'comment=Cover (front)',
  ...bitexact,
  join(out, 'id3v23-cover.mp3'),
);

// MP3, ID3v2.4 (UTF-8) with CHAP/CTOC chapters.
ffmpeg(
  ...silence(3), '-i', chapters, '-map_metadata', '1', '-map_chapters', '1',
  '-c:a', 'libmp3lame', '-b:a', '8k',
  ...bitexact,
  join(out, 'id3v24-chapters.mp3'),
);

// M4B (moov after mdat, ffmpeg's default) with ilst tags, cover and chapters.
ffmpeg(
  ...silence(3), '-i', chapters, '-i', png,
  '-map', '0:a', '-map', '2:v', '-map_metadata', '1', '-map_chapters', '1',
  '-c:a', 'aac', '-b:a', '8k', '-c:v', 'copy', '-disposition:v', 'attached_pic',
  '-metadata', 'album_artist=Ann Author',
  '-metadata', 'track=1/1',
  '-f', 'ipod',
  ...bitexact,
  join(out, 'chapters.m4b'),
);

// M4A with moov before mdat and no chapters.
ffmpeg(
  ...silence(1),
  '-c:a', 'aac', '-b:a', '8k',
  '-metadata', 'title=Track Seven', '-metadata', 'album=Faststart Album', '-metadata', 'artist=Some Artist',
  '-metadata', 'track=7/12', '-metadata', 'disc=2/3',
  '-movflags', '+faststart',
  ...bitexact,
  join(out, 'faststart.m4a'),
);

rmSync(work, { recursive: true, force: true });
console.log(`Fixtures written to ${out}`);
