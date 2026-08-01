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

  useEffect(() => {
    previous.current = value;
  }, [value]);

  const stagger = reduced ? motion.reduced.digitStaggerMs : motion.digitStaggerMs;

  return (
    <View style={styles.row}>
      {/*
        The prefix never rolls and never flashes. A currency symbol turning
        green is noise — it didn't change, and colouring it makes the flash
        about the row rather than about the digits that moved.
      */}
      {prefix ? <Static char={prefix} style={style} /> : null}
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
        />
      ))}
    </View>
  );
}

function Static({ char, style }: { char: string; style?: TextStyle }) {
  const { theme } = useTheme();
  const fontSize = style?.fontSize ?? 15;
  return (
    <View style={{ height: fontSize * 1.25, justifyContent: 'center' }}>
      <Animated.Text
        style={[style, tabular, { color: (style?.color as string) ?? theme.textPrimary }]}
      >
        {char}
      </Animated.Text>
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
}: {
  char: string;
  index: number;
  direction: 1 | -1 | 0;
  stagger: number;
  variant: Variant;
  style?: TextStyle;
  reduced: boolean;
}) {
  const { theme } = useTheme();
  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);
  // Flash is per-character, not per-number. Only the digits that actually
  // changed carry colour — which is what makes a tick read as information
  // rather than as decoration.
  const flash = useSharedValue(0);
  const flashSign = useSharedValue(0);
  const previousChar = useRef(char);

  const fontSize = style?.fontSize ?? 15;
  const lineHeight = fontSize * 1.25;

  useEffect(() => {
    const changed = previousChar.current !== char;
    previousChar.current = char;

    if (!changed || direction === 0) return;

    // Separators never roll and never flash — only digits carry motion.
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

    if (variant === 'tick') {
      flashSign.value = direction;
      const attack = reduced ? 0 : motion.tickAttackMs;
      const decay = reduced ? motion.reduced.tickDecayMs : motion.tickDecayMs;
      // Rise, then decay. The rise is short but non-zero — snapping straight
      // to full colour is what reads as garish. Decays, never persists.
      flash.value = withDelay(
        index * stagger,
        withSequence(
          withTiming(1, { duration: attack, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: decay, easing: Easing.out(Easing.quad) }),
        ),
      );
    }
  }, [
    char,
    direction,
    index,
    stagger,
    variant,
    reduced,
    lineHeight,
    offset,
    opacity,
    flash,
    flashSign,
  ]);

  const baseColor = (style?.color as string) ?? theme.textPrimary;

  const animatedStyle = useAnimatedStyle(() => {
    const color =
      variant === 'tick'
        ? interpolateColor(
            flash.value,
            [0, 1],
            [baseColor, flashSign.value >= 0 ? theme.flashUp : theme.flashDown],
          )
        : baseColor;

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
