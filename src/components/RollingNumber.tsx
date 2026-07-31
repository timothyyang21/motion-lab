import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, type TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  interpolateColor,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { motion } from '../tokens/motion';
import { useTheme } from '../tokens/ThemeProvider';
import { tabular } from '../tokens/theme';
import { formatDigits, rollDirection } from '../lib/digits';

type Variant = 'tick' | 'commit';

type Props = {
  value: number;
  decimals?: number;
  variant?: Variant;
  prefix?: string;
  style?: TextStyle;
  reduced?: boolean;
};

/**
 * One component, two configurations.
 *
 *   'tick'   — fast, ambient, forgettable by design. Flashes and decays.
 *   'commit' — slow, singular, meant to land. No flash; the weight does the work.
 *
 * Same mechanism, opposite emotional job. That the difference is a prop rather
 * than a second component is the point: motion is a system, not a pile of
 * one-off animations.
 */
export function RollingNumber({
  value,
  decimals = 2,
  variant = 'tick',
  prefix,
  style,
  reduced = false,
}: Props) {
  const previous = useRef(value);
  const direction = rollDirection(previous.current, value);
  const chars = formatDigits(value, decimals);

  // Flash progress: 0 = resting, 1 = fully flashed. Only 'tick' uses it.
  const flash = useSharedValue(0);
  const flashSign = useSharedValue(0);

  useEffect(() => {
    if (variant === 'tick' && direction !== 0) {
      flashSign.value = direction;
      const decay = reduced ? motion.reduced.tickDecayMs : motion.tickDecayMs;
      // Snap to flashed, then decay out. It decays — it never persists.
      flash.value = withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(0, { duration: decay, easing: Easing.out(Easing.quad) }),
      );
    }
    previous.current = value;
  }, [value, variant, direction, reduced, flash, flashSign]);

  const stagger = reduced ? motion.reduced.digitStaggerMs : motion.digitStaggerMs;

  return (
    <View style={styles.row}>
      {prefix ? (
        <Char
          char={prefix}
          index={0}
          direction={0}
          stagger={0}
          variant={variant}
          style={style}
          reduced={reduced}
          flash={flash}
          flashSign={flashSign}
        />
      ) : null}
      {chars.map((char, index) => (
        <Char
          key={`${index}-${chars.length}`}
          char={char}
          index={index}
          direction={direction}
          stagger={stagger}
          variant={variant}
          style={style}
          reduced={reduced}
          flash={flash}
          flashSign={flashSign}
        />
      ))}
    </View>
  );
}

function Char({
  char,
  index,
  direction,
  stagger,
  variant,
  style,
  reduced,
  flash,
  flashSign,
}: {
  char: string;
  index: number;
  direction: 1 | -1 | 0;
  stagger: number;
  variant: Variant;
  style?: TextStyle;
  reduced: boolean;
  flash: SharedValue<number>;
  flashSign: SharedValue<number>;
}) {
  const { theme } = useTheme();
  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);
  const previousChar = useRef(char);

  const fontSize = style?.fontSize ?? 15;
  const lineHeight = fontSize * 1.25;

  useEffect(() => {
    if (previousChar.current === char || direction === 0) {
      previousChar.current = char;
      return;
    }
    previousChar.current = char;

    // Separators never roll — only digits carry motion.
    if (!/\d/.test(char)) return;

    const travel = reduced ? lineHeight * motion.reduced.travelScale : lineHeight;
    const duration = variant === 'commit' ? 260 : 160;

    // Enter from the direction of travel: a rising value comes up from below.
    offset.value = -direction * travel;
    opacity.value = 0;

    offset.value = withDelay(
      index * stagger,
      withTiming(0, { duration, easing: Easing.out(Easing.cubic) }),
    );
    opacity.value = withDelay(index * stagger, withTiming(1, { duration: duration * 0.7 }));
  }, [char, direction, index, stagger, variant, reduced, lineHeight, offset, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    const color =
      variant === 'tick'
        ? interpolateColor(
            flash.value,
            [0, 1],
            [
              (style?.color as string) ?? theme.textPrimary,
              flashSign.value >= 0 ? theme.flashUp : theme.flashDown,
            ],
          )
        : ((style?.color as string) ?? theme.textPrimary);

    return {
      color,
      opacity: opacity.value,
      transform: [{ translateY: offset.value }],
    };
  });

  return (
    <View style={{ height: lineHeight, overflow: 'hidden', justifyContent: 'center' }}>
      <Animated.Text style={[style, tabular, animatedStyle]}>{char}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
