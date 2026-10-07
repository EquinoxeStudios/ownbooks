import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLiveQuery } from '@/db/provider';
import { listLibrary, type LibraryFilter, type LibraryItem } from '@/db/repositories/books';
import { useAuthStore } from '@/features/auth/store';
import {
  Button,
  Chip,
  colors,
  fonts,
  GeneratedCover,
  IconButton,
  ProgressBar,
  Text,
} from '@/ui';

const FILTERS: LibraryFilter[] = ['all', 'audio', 'ebook'];

export default function Library() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.account?.id ?? '');
  const choice = useAuthStore((s) => s.onboardingChoice);
  // The onboarding answer picks the starting filter.
  const [filter, setFilter] = useState<LibraryFilter>(
    choice === 'audio' ? 'audio' : choice === 'ebook' ? 'ebook' : 'all',
  );
  const [showComingSoon, setShowComingSoon] = useState(false);

  const { data: all } = useLiveQuery((db) => listLibrary(db, userId, 'all'), ['books', 'progress'], userId);
  const books = (all ?? []).filter((b) => filter === 'all' || b.type === filter);

  // Placeholder until the import flow lands in milestone 2.
  const startImport = () => setShowComingSoon(true);

  // Avoid flashing the list header before we know whether the shelf is empty.
  if (!all) return <SafeAreaView edges={['top']} style={styles.root} />;

  if (all.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.root}>
        <View style={styles.emptyPage}>
          <Text variant="h1" accessibilityRole="header">
            {t('library.title')}
          </Text>
          <View style={styles.emptyBody}>
            <View style={styles.emptyArt} accessible={false} importantForAccessibility="no-hide-descendants">
              <View style={styles.emptyBooks}>
                <View style={[styles.dashedSpine, { width: 24, height: 76 }]} />
                <View style={[styles.dashedSpine, { width: 30, height: 92 }]} />
                <View style={[styles.dashedSpine, { width: 22, height: 64 }]} />
              </View>
              <View style={styles.emptyShelf} />
            </View>
            <View style={styles.emptyCopy}>
              <Text variant="sheetTitle" style={styles.center}>
                {t('library.empty.title')}
              </Text>
              <Text variant="lead" style={styles.center}>
                {t(
                  choice === 'audio'
                    ? 'library.empty.bodyAudio'
                    : choice === 'ebook'
                      ? 'library.empty.bodyEbook'
                      : 'library.empty.body',
                )}
              </Text>
            </View>
          </View>
          <View style={styles.emptyFooter}>
            <Button label={t('library.empty.cta')} onPress={startImport} />
            <Text variant="meta" style={styles.center}>
              {showComingSoon ? t('library.empty.comingSoon') : t('library.empty.formats')}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <FlatList
        data={books}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text variant="h1" accessibilityRole="header">
                {t('library.title')}
              </Text>
              <IconButton
                icon="plus"
                variant="ink"
                size={48}
                iconSize={22}
                strokeWidth={2.8}
                accessibilityLabel={t('library.import')}
                onPress={startImport}
              />
            </View>
            <View style={styles.sectionRow}>
              <Text variant="h2" accessibilityRole="header">
                {t('library.yourBooks')}
              </Text>
            </View>
            <View style={styles.filters}>
              {FILTERS.map((f) => (
                <Chip
                  key={f}
                  label={t(`library.filter.${f}`)}
                  selected={filter === f}
                  onPress={() => setFilter(f)}
                />
              ))}
            </View>
            {showComingSoon ? <Text variant="meta">{t('library.empty.comingSoon')}</Text> : null}
          </View>
        }
        renderItem={({ item }) => <BookRow book={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 24 }} />}
      />
    </SafeAreaView>
  );
}

function BookRow({ book }: { book: LibraryItem }) {
  const { t } = useTranslation();
  const pct = Math.round((book.fraction ?? 0) * 100);
  const meta = [book.author, t(`library.type.${book.type}`)].filter(Boolean).join(' · ');
  return (
    <View style={styles.row} accessible accessibilityLabel={`${book.title}, ${meta}, ${pct}%`}>
      <GeneratedCover title={book.title} width={60} height={84} />
      <View style={styles.rowText}>
        <Text variant="title" numberOfLines={2}>
          {book.title}
        </Text>
        <Text variant="meta">{book.on_device ? meta : t('library.notOnDevice')}</Text>
        <View style={styles.progressRow}>
          <ProgressBar value={book.fraction ?? 0} />
          <Text variant="caption" color={colors.primaryDark} style={styles.pct}>
            {pct}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { textAlign: 'center' },
  emptyPage: { flex: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, justifyContent: 'space-between' },
  emptyBody: { alignItems: 'center', gap: 28 },
  emptyArt: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBooks: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 92 },
  dashedSpine: { borderRadius: 6, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary },
  emptyShelf: { width: 124, height: 8, borderRadius: 4, backgroundColor: colors.primaryDark, marginTop: 4 },
  emptyCopy: { gap: 12 },
  emptyFooter: { gap: 10 },
  list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  header: { gap: 12, marginBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  filters: { flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  rowText: { flex: 1, gap: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  pct: { fontFamily: fonts.bold },
});
