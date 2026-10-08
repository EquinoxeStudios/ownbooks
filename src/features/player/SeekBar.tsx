import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { playerColors } from '@/ui/tokens';

type SeekBarProps = {
  positionMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
  accessibilityLabel: string;
  /** Text read by screen readers, e.g. "10:18 elapsed, 12:04 remaining". */
  accessibilityValueText: string;
  /** Step for screen-reader increment/decrement gestures. */
  stepMs?: number;
};

const THUMB = 20;

/**
 * Scrubber from the player design: 8pt track, amber fill, white thumb.
 * Dragging previews locally and only seeks on release.
 */
export function SeekBar({
  positionMs,
  durationMs,
  onSeek,
  accessibilityLabel,
  accessibilityValueText,
  stepMs = 30_000,
}: SeekBarProps) {
  const [width, setWidth] = useState(0);
  const [dragMs, setDragMs] = useState<number | null>(null);

  const toMs = (e: GestureResponderEvent) =>
    width > 0 ? Math.min(1, Math.max(0, e.nativeEvent.locationX / width)) * durationMs : 0;

  const shown = dragMs ?? positionMs;
  const fraction = durationMs > 0 ? Math.min(1, Math.max(0, shown / durationMs)) : 0;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: accessibilityValueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const delta = e.nativeEvent.actionName === 'increment' ? stepMs : -stepMs;
        onSeek(Math.min(durationMs, Math.max(0, positionMs + delta)));
      }}
      style={styles.hitArea}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      // Keep the gesture even if the finger drifts vertically off the bar.
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => setDragMs(toMs(e))}
      onResponderMove={(e) => setDragMs(toMs(e))}
      onResponderRelease={(e) => {
        onSeek(toMs(e));
        setDragMs(null);
      }}
      onResponderTerminate={() => setDragMs(null)}>
      <View pointerEvents="none" style={styles.track}>
        <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.thumb, { left: fraction * width - THUMB / 2 }, dragMs != null && styles.thumbActive]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Taller than the visible bar so it's easy to grab.
  hitArea: { height: 44, justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, backgroundColor: playerColors.track, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: playerColors.accent },
  thumb: {
    position: 'absolute',
    top: 12,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: playerColors.text,
  },
  thumbActive: { transform: [{ scale: 1.2 }] },
});
