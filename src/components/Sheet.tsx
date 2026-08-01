import React, { useEffect } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  cancelAnimation,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { motion } from '../tokens/motion';
import { useTheme } from '../tokens/ThemeProvider';
import {
  projectDestination,
  nearestDetent,
  thresholdDetent,
  rubberBand,
} from '../lib/projection';

const SCREEN_H = Dimensions.get('window').height;

/**
 * Detents expressed as translateY — distance from the top of the screen.
 * Larger translateY = further down = less sheet visible.
 * Sorted ascending, so index 0 is the tallest detent.
 */
const DETENTS = motion.detentFractions
  .map((fraction) => SCREEN_H * (1 - fraction))
  .sort((a, b) => a - b);

const CLOSED = SCREEN_H;
const TOP = DETENTS[0];
const PEEK = DETENTS[DETENTS.length - 1];
const STOPS = [...DETENTS, CLOSED];

/**
 * The sheet is built taller than the tallest detent needs.
 *
 * Rubber-banding moves the sheet's top edge ABOVE the top detent, which drags
 * its bottom edge up off the bottom of the screen — exposing the scrim behind
 * it as a strip of the wrong colour. Only visible on a hard drag, which is
 * exactly the gesture the capture is built around.
 *
 * 400px comfortably covers the rubber band's practical range; it asymptotes
 * long before that. The overhang simply hangs below the screen.
 */
const OVERHANG = 400;

type Props = {
  visible: boolean;
  onClose: () => void;
  naive?: boolean;
  reduced?: boolean;
  children?: React.ReactNode;
};

export function Sheet({ visible, onClose, naive = false, reduced = false, children }: Props) {
  const { theme } = useTheme();

  const translateY = useSharedValue(CLOSED);
  const gestureStart = useSharedValue(0);
  const lastDetent = useSharedValue(CLOSED);

  const spring = reduced ? motion.reduced.springs.sheetSettle : motion.springs.sheetSettle;
  // Entering and dismissing cover the full screen height. Settling into a
  // detent covers a couple of hundred points. Same spring for both makes the
  // long move feel slow, so presentation gets its own, stiffer one.
  const presentSpring = reduced
    ? motion.reduced.springs.sheetSettle
    : motion.springs.sheetPresent;

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(PEEK, presentSpring);
      lastDetent.value = PEEK;
    } else {
      translateY.value = withSpring(CLOSED, presentSpring);
      lastDetent.value = CLOSED;
    }
  }, [visible, presentSpring, translateY, lastDetent]);

  const fireHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      // Interruption.
      //
      // Read the CURRENT position off the animated value and cancel the
      // in-flight animation, so the gesture picks up exactly where the sheet
      // is rather than where it started. The failure everyone ships is
      // re-seeding position but dropping velocity, which makes the sheet stop
      // dead under the finger and then lurch.
      cancelAnimation(translateY);
      gestureStart.value = translateY.value;
    })
    .onUpdate((event) => {
      const raw = gestureStart.value + event.translationY;

      if (raw < TOP) {
        // Rubber band past the topmost detent. Resistance, not a wall.
        const overshoot = TOP - raw;
        translateY.value = TOP - rubberBand(overshoot, SCREEN_H, motion.rubberBandFactor);
      } else {
        translateY.value = raw;
      }
    })
    .onEnd((event) => {
      // The whole argument, in four lines.
      //
      // Tuned: project where this flick would come to rest, then snap to the
      // detent nearest THAT. A hard throw lands somewhere different from a
      // gentle nudge, because it should.
      //
      // Naive: cross a velocity threshold, move exactly one detent. A hard
      // throw and a gentle nudge land identically, which is what feels wrong.
      const target = naive
        ? thresholdDetent(translateY.value, event.velocityY, STOPS)
        : nearestDetent(
            projectDestination(translateY.value, event.velocityY, motion.decelerationRate),
            STOPS,
          );

      // Haptic on detent COMMIT only — never on crossing. Crossing haptics
      // turn a drag into a cattle grid.
      if (target !== lastDetent.value) {
        lastDetent.value = target;
        runOnJS(fireHaptic)();
      }

      if (target === CLOSED) {
        runOnJS(onClose)();
      }

      // Pass the release velocity into the spring so the animation continues
      // the finger's motion instead of starting a new one from rest.
      translateY.value = withSpring(target, { ...spring, velocity: event.velocityY });
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  /**
   * Backdrop opacity is DERIVED from sheet position, not animated in parallel.
   *
   * Parallel animation drifts the moment the sheet is interrupted — two
   * animations with different velocities disagreeing about where they are.
   * Derivation cannot drift, because there is only one source of truth.
   *
   * Note the input range ascends: TOP is a SMALLER translateY than CLOSED, so
   * the ranges are written top-first and the output inverted. Writing it the
   * intuitive way round returns garbage silently.
   */
  const backdropOpacity = useDerivedValue(() =>
    interpolate(translateY.value, [TOP, CLOSED], [1, 0], Extrapolation.CLAMP),
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <>
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }, backdropStyle]}
      />
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SCREEN_H - TOP + OVERHANG,
              backgroundColor: theme.surfaceRaised,
              // Static shadow. NEVER animate shadowRadius or shadowOpacity —
              // it forces a shadow re-rasterisation every frame and is the
              // single most reliable way to drop frames on cheap Android.
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: Platform.OS === 'ios' ? 0.12 : 0,
              shadowRadius: 24,
              elevation: 16,
            },
            sheetStyle,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.accent }]} />
          {children}
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
    opacity: 0.5,
  },
});
