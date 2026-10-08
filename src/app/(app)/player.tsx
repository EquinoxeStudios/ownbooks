import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  nextTrack,
  previousTrack,
  seekToGlobal,
  skipBy,
  togglePlay,
} from '@/features/player/controller';
import { PlayerCover } from '@/features/player/PlayerCover';
import { toGlobal } from '@/features/player/position';
import { SeekBar } from '@/features/player/SeekBar';
import { usePlayerStore } from '@/features/player/store';
import { formatClock, formatRemaining } from '@/lib/time';
import { Icon, IconButton, Text } from '@/ui';
import { fonts, playerColors } from '@/ui/tokens';

const SKIP_BACK_MS = 15_000;
const SKIP_FORWARD_MS = 30_000;

export default function Player() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const s = usePlayerStore();

  const close = () => (router.canGoBack() ? router.back() : router.replace('/library'));

  if (!s.bookId) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.topRow}>
          <IconButton icon="chevronDown" accessibilityLabel={t('player.close')} color={playerColors.text} onPress={close} />
        </View>
      </SafeAreaView>
    );
  }

  const track = s.tracks[s.trackIdx];
  const trackDuration = track?.durationMs ?? 0;
  const multi = s.tracks.length > 1;
  const heading = multi && track?.title ? track.title : s.title;
  const coverSize = Math.min(292, width - 96);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topRow}>
        <View style={styles.closeButton}>
          <IconButton
            icon="chevronDown"
            accessibilityLabel={t('player.close')}
            color={playerColors.text}
            strokeWidth={2.6}
            onPress={close}
          />
        </View>
        <Text variant="meta" color={playerColors.muted} style={styles.topLabel}>
          {multi ? t('player.trackOf', { current: s.trackIdx + 1, total: s.tracks.length }) : ''}
        </Text>
        <View style={styles.topSpacer} />
      </View>

      <PlayerCover title={s.title} author={s.author} size={coverSize} />

      <View style={styles.titles}>
        <Text style={styles.heading} color={playerColors.text} numberOfLines={2} accessibilityRole="header">
          {heading}
        </Text>
        <Text style={styles.sub} color={playerColors.muted} numberOfLines={1}>
          {[multi ? s.title : null, s.author].filter(Boolean).join(' · ')}
        </Text>
      </View>

      {s.error ? (
        <Text style={styles.error} color={playerColors.accent} accessibilityRole="alert">
          {t(`player.errors.${s.error}`)}
        </Text>
      ) : (
        <View style={styles.seek}>
          <SeekBar
            positionMs={s.positionMs}
            durationMs={trackDuration}
            onSeek={(ms) => seekToGlobal(toGlobal(s.tracks, s.trackIdx, ms))}
            accessibilityLabel={t('player.seek')}
            accessibilityValueText={`${t('player.elapsed', { time: formatClock(s.positionMs) })}, ${t(
              'player.remaining',
              { time: formatClock(trackDuration - s.positionMs) },
            )}`}
          />
          <View style={styles.times}>
            <Text style={styles.time} color={playerColors.muted}>
              {formatClock(s.positionMs)}
            </Text>
            <Text style={styles.time} color={playerColors.muted}>
              {formatRemaining(trackDuration - s.positionMs)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.controls}>
        {multi ? (
          <IconButton
            icon="prevChapter"
            accessibilityLabel={t('player.previousTrack')}
            color={playerColors.muted}
            iconSize={20}
            onPress={previousTrack}
          />
        ) : (
          <View style={styles.spacer} />
        )}
        <RoundSkip label={'−15'} a11y={t('player.skipBack', { seconds: 15 })} onPress={() => skipBy(-SKIP_BACK_MS)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={s.playing ? t('player.pause') : t('player.play')}
          onPress={togglePlay}
          disabled={!!s.error}>
          {({ pressed }) => (
            <View style={[styles.playButton, pressed && styles.playPressed]}>
              <Icon name={s.playing ? 'pause' : 'play'} size={30} color={playerColors.bg} />
            </View>
          )}
        </Pressable>
        <RoundSkip label="+30" a11y={t('player.skipForward', { seconds: 30 })} onPress={() => skipBy(SKIP_FORWARD_MS)} />
        {multi ? (
          <IconButton
            icon="nextChapter"
            accessibilityLabel={t('player.nextTrack')}
            color={playerColors.muted}
            iconSize={20}
            onPress={nextTrack}
          />
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
    </SafeAreaView>
  );
}

function RoundSkip({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress}>
      {({ pressed }) => (
        <View style={[styles.skip, pressed && styles.skipPressed]}>
          <Text style={styles.skipLabel} color={playerColors.text}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: playerColors.bg,
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  topRow: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { marginLeft: -10 },
  topLabel: { fontFamily: fonts.medium },
  topSpacer: { width: 34 },
  titles: { gap: 10 },
  heading: { fontFamily: fonts.black, fontSize: 30, lineHeight: 34, letterSpacing: -0.3 },
  sub: { fontSize: 16 },
  error: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  seek: { gap: 2 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontFamily: fonts.medium, fontSize: 14, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spacer: { width: 44, height: 44 },
  playButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: playerColors.text,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: playerColors.muted,
  },
  playPressed: { borderBottomWidth: 1, transform: [{ translateY: 3 }] },
  skip: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: playerColors.ring,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipPressed: { backgroundColor: playerColors.track },
  skipLabel: { fontFamily: fonts.bold, fontSize: 16 },
});
