import { stripTrackNumber, titleFromFilenames, trackTitleFromFilename } from '../formats';
import { bookDetails, hasFilenameDetails } from '../metadata';

const pad = (n: number) => String(n).padStart(2, '0');

describe('bookDetails', () => {
  it('names a 40-file book after its album, not the first file', () => {
    const files = Array.from({ length: 40 }, (_, i) => ({
      name: `${pad(i + 1)}-${['y', 'z', 'w'][i % 3]}.mp3`,
      tags: { album: 'The Real Title', artist: 'An Author', title: `Part ${i + 1}`, track: i + 1 },
    }));
    const d = bookDetails(files);
    expect(d.title).toBe('The Real Title');
    expect(d.author).toBe('An Author');
    expect(d.order).toEqual(files.map((_, i) => i));
    expect(d.trackTitles[0]).toBe('Part 1');
  });

  it('uses the most common album and prefers the album artist', () => {
    const d = bookDetails([
      { name: 'a.mp3', tags: { album: 'Book', artist: 'Narrator', albumArtist: 'Writer' } },
      { name: 'b.mp3', tags: { album: 'Book (bonus)', artist: 'Narrator' } },
      { name: 'c.mp3', tags: { album: 'Book', artist: 'Narrator' } },
    ]);
    expect(d.title).toBe('Book');
    expect(d.author).toBe('Writer');
  });

  it('uses a single file’s title tag, then its filename', () => {
    expect(bookDetails([{ name: 'x.m4b', tags: { title: 'Moby-Dick', composer: 'Melville' } }])).toMatchObject({
      title: 'Moby-Dick',
      author: 'Melville',
    });
    expect(bookDetails([{ name: 'moby_dick.m4b', tags: {} }])).toMatchObject({ title: 'moby dick', author: null });
  });

  it('orders by disc and track number when every file is numbered uniquely', () => {
    const d = bookDetails([
      { name: '1.mp3', tags: { disc: 2, track: 1 } },
      { name: '2.mp3', tags: { disc: 1, track: 2 } },
      { name: '3.mp3', tags: { disc: 1, track: 1 } },
    ]);
    expect(d.order).toEqual([2, 1, 0]);
    expect(d.trackTitles).toEqual(['3', '2', '1']);
  });

  it('keeps filename order when numbers are missing or repeated', () => {
    expect(bookDetails([{ name: 'a.mp3', tags: { track: 2 } }, { name: 'b.mp3', tags: {} }]).order).toEqual([0, 1]);
    expect(
      bookDetails([
        { name: 'a.mp3', tags: { track: 1 } },
        { name: 'b.mp3', tags: { track: 1 } },
      ]).order,
    ).toEqual([0, 1]);
  });

  it('falls back to filename track titles without their numbering', () => {
    const d = bookDetails([
      { name: '01-y.mp3', tags: {} },
      { name: '02-z.mp3', tags: {} },
    ]);
    expect(d.trackTitles).toEqual(['y', 'z']);
    expect(d.title).toBe('y');
  });
});

describe('track numbering', () => {
  it.each([
    ['01-y', 'y'],
    ['03. Foo', 'Foo'],
    ['Track 2 - Bar', 'Bar'],
    ['01 Baz', 'Baz'],
    ['1984', '1984'],
    ['101 Dalmatians', '101 Dalmatians'],
    ['Chapter 1', 'Chapter 1'],
    ['07', '07'],
  ])('%s → %s', (input, expected) => {
    expect(stripTrackNumber(input)).toBe(expected);
  });

  it('cleans filenames for display', () => {
    expect(trackTitleFromFilename('05_-_The_Storm.mp3')).toBe('The Storm');
    expect(titleFromFilenames(['01-y.mp3', '02-z.mp3'])).toBe('y');
  });
});

describe('hasFilenameDetails', () => {
  const names = ['01-y.mp3', '02-z.mp3'];

  it('recognises titles from the current and the earlier filename rule', () => {
    expect(hasFilenameDetails('y', null, names)).toBe(true);
    expect(hasFilenameDetails('01-y', null, names)).toBe(true);
    expect(hasFilenameDetails('moby dick', null, ['moby_dick.m4b'])).toBe(true);
  });

  it('treats a changed title or any author as edited', () => {
    expect(hasFilenameDetails('My Title', null, names)).toBe(false);
    expect(hasFilenameDetails('y', 'Someone', names)).toBe(false);
    expect(hasFilenameDetails('y', null, [])).toBe(false);
  });
});
