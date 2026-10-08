const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Compares strings so that "2.mp3" sorts before "10.mp3". */
export function naturalCompare(a: string, b: string): number {
  return collator.compare(a, b);
}

/** Returns a new array sorted naturally by `key`. Stable for equal keys. */
export function naturalSortBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((x, y) => naturalCompare(key(x.item), key(y.item)) || x.index - y.index)
    .map((x) => x.item);
}
