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
      // Linear. An eased fill lies about progress — it implies the wait is
      // shorter or longer than it actually is, and the hand can feel the lie.
      progress.value = withTiming(1, {
        duration: buildMs,
        easing: Easing.linear,
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
