import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  cancelAnimation,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { motion } from '../tokens/motion';
import { useTheme } from '../tokens/ThemeProvider';
import { typeScale } from '../tokens/theme';

const HEIGHT = 56;

/**
 * The shimmer band, precomputed once.
 *
 * Opacity follows a half-sine across the band, so it fades in at the leading
 * edge, peaks in the middle, and fades out behind — the shape a real highlight
 * has. A uniform band would read as a white rectangle sliding past, which is
 * the difference between a shimmer and a loading bar.
 */
const SLICES = Array.from({ length: motion.shimmerSlices }, (_, i) => ({
  key: `s${i}`,
  opacity: Math.sin((Math.PI * (i + 0.5)) / motion.shimmerSlices),
}));

type Props = {
  label: string;
  confirmedLabel: string;
  onConfirm: () => void;
  reduced?: boolean;
};

/**
 * Friction at the right moment builds trust.
 *
 * Asymmetric by design: builds slow (~700ms), cancels fast (~150ms). Release
 * early and it snaps away as though it never happened — the cancel should feel
 * like erasure, not like a rewind.
 *
 * The fill inverts rather than tinting. On light ground a pale accent filling a
 * pale button is invisible, so the button's GROUND fills with accent and a
 * clipped copy of the label — tinted for the filled side — is revealed exactly
 * as the fill passes under it.
 */
export function HoldToConfirm({ label, confirmedLabel, onConfirm, reduced = false }: Props) {
  const { theme } = useTheme();
  const [confirmed, setConfirmed] = useState(false);
  const [width, setWidth] = useState(0);

  const progress = useSharedValue(0);
  const morph = useSharedValue(0);
  const shimmer = useSharedValue(0);
  // A dedicated vehicle for the lead haptic. Piggybacking the timer on `morph`
  // works but collides with the commit animation and is a trap for whoever
  // tunes this next.
  const hapticTimer = useSharedValue(0);

  const cancelSpring = reduced
    ? motion.reduced.springs.confirmCancel
    : motion.springs.confirmCancel;

  const buildMs = reduced ? motion.confirmBuildMs * 0.6 : motion.confirmBuildMs;

  const commit = () => {
    setConfirmed(true);
    onConfirm();
  };

  const successHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const hold = Gesture.LongPress()
    .minDuration(buildMs)
    // The finger drifts during a 700ms hold. Cancelling on a few pixels of
    // travel would read as the button being broken, not as a deliberate abort.
    .maxDistance(10000)
    .onBegin(() => {
      // Accelerating, not linear. Commitment should feel like it gathers:
      // slow to start, then pulling toward completion. See the note on
      // confirmFillBezier in motion.ts for the trade-off this accepts.
      const [x1, y1, x2, y2] = motion.confirmFillBezier;
      progress.value = withTiming(1, {
        duration: buildMs,
        easing: Easing.bezier(x1, y1, x2, y2),
      });

      // The haptic leads the visual by a beat. Firing together reads as
      // slightly late; leading reads as responsive. Same event, different
      // perceived latency.
      hapticTimer.value = 0;
      hapticTimer.value = withDelay(
        buildMs - motion.confirmHapticLeadMs,
        withTiming(1, { duration: 0 }, (finished) => {
          if (finished) runOnJS(successHaptic)();
        }),
      );
    })
    .onStart(() => {
      // Morph, not crossfade. Crossfade says two things happened; morph says
      // this thing changed — which is the truthful reading, and the one
      // Farebound needs when a transaction commits.
      morph.value = withSpring(1, cancelSpring);

      // A bloom across the filled button at the moment of commit. Rises fast,
      // settles slow. This is the visual half of the same beat the haptic
      // lands on, and it's what makes the commit feel finished rather than
      // merely over.
      // The shimmer. One pass, left to right, and then it's gone — a highlight
      // crossing the surface rather than the surface changing colour.
      shimmer.value = 0;
      shimmer.value = withTiming(1, {
        duration: reduced ? 0 : motion.shimmerDurationMs,
        // Slightly eased out so it decelerates as it leaves, which reads as
        // light travelling across a surface rather than a bar being dragged.
        easing: Easing.out(Easing.quad),
      });

      runOnJS(commit)();
    })
    .onFinalize((_event, success) => {
      if (!success) {
        // Cancel the pending lead haptic. Without this, releasing at 90% still
        // buzzes ~40ms later — the button says cancelled and the hand says
        // committed, which is the worst possible mismatch.
        cancelAnimation(hapticTimer);
        // Fast cancel. Erasure, not rewind.
        progress.value = withSpring(0, cancelSpring);
      }
    });

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const fillStyle = useAnimatedStyle(() => ({
    width: progress.value * width,
  }));

  // The clipped copy of the label. Its wrapper widens with the fill, so the
  // tinted text is revealed character by character exactly as the fill passes
  // beneath it — rather than the whole label flipping at once.
  const clipStyle = useAnimatedStyle(() => ({
    width: progress.value * width,
  }));

  const bandWidth = width * motion.shimmerBandFraction;

  // Travels from fully off the left edge to fully off the right, so the button
  // is clean at both ends of the sweep.
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: width > 0 ? 1 : 0,
    transform: [
      {
        translateX: interpolate(
          shimmer.value,
          [0, 1],
          [-bandWidth, width],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(morph.value, [0, 1], [1, 0.97], Extrapolation.CLAMP) }],
    borderRadius: interpolate(morph.value, [0, 1], [12, 26], Extrapolation.CLAMP),
  }));

  const text = confirmed ? confirmedLabel : label;

  return (
    <GestureDetector gesture={hold}>
      <Animated.View
        onLayout={onLayout}
        style={[
          styles.container,
          { backgroundColor: theme.surface, borderColor: theme.hairline },
          containerStyle,
        ]}
      >
        <Animated.View style={[styles.fill, { backgroundColor: theme.accent }, fillStyle]} />

        {/* Commit shimmer. Sits above the fill and below the labels, so the
            highlight passes beneath the text rather than washing it out. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.shimmer, { width: bandWidth }, shimmerStyle]}
        >
          {SLICES.map((slice) => (
            <View
              key={slice.key}
              style={{
                flex: 1,
                backgroundColor: theme.sheen,
                opacity: slice.opacity,
              }}
            />
          ))}
        </Animated.View>

        {/* Base label — the unfilled side. */}
        <View style={styles.labelLayer} pointerEvents="none">
          <Animated.Text style={[typeScale.button, { color: theme.textPrimary }]}>
            {text}
          </Animated.Text>
        </View>

        {/* Clipped label — the filled side. Same glyphs, same position, tinted
            for the accent ground so the text stays legible as the fill sweeps. */}
        <Animated.View style={[styles.clip, clipStyle]} pointerEvents="none">
          <View style={[styles.labelLayer, { width }]}>
            <Animated.Text style={[typeScale.button, { color: theme.accentOn }]}>
              {text}
            </Animated.Text>
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HEIGHT,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  shimmer: { position: 'absolute', left: 0, top: 0, bottom: 0, flexDirection: 'row' },
  labelLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
});
