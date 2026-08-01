import React, { useEffect, useRef, useState } from 'react';
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

function slotHeight(style?: TextStyle) {
  return (style?.fontSize ?? 15) * 1.25;
}

function Static({ char, style }: { char: string; style?: TextStyle }) {
  const { theme } = useTheme();
  return (
    <View style={{ height: slotHeight(style), justifyContent: 'center' }}>
      <Animated.Text
        style={[style, tabular, { color: (style?.color as string) ?? theme.textPrimary }]}
      >
        {char}
      </Animated.Text>
    </View>
  );
}

/**
 * A single character slot.
 *
 * The slot renders BOTH the outgoing and incoming glyph and translates them
 * past each other, so it is never empty. The earlier version faded a single
 * glyph out and back in, which left a hole in the number on every tick and
 * made the whole thing read as blank rather than solid. An odometer wheel
 * never shows a gap; neither should this.
 *
 * Direction follows value direction: rising numbers roll upward, so the new
 * glyph enters from below and the old one leaves through the top.
 */
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
  const previousChar = useRef(char);

  // `from` is the glyph leaving, `to` is the glyph arriving. When they match,
  // the slot is at rest and only one glyph is rendered.
  const [pair, setPair] = useState({ from: char, to: char });

  // 0 = mid-roll start, 1 = settled. Starts settled.
  const roll = useSharedValue(1);
  const flash = useSharedValue(0);
  const flashSign = useSharedValue(0);
  // Captured for the worklet so a mid-roll direction change can't invert the
  // glyphs that are already travelling.
  const rollDir = useSharedValue(0);

  const height = slotHeight(style);

  useEffect(() => {
    const from = previousChar.current;
    if (from === char) return;
    previousChar.current = char;

    // Separators never roll and never flash — only digits carry motion.
    if (direction === 0 || !/\d/.test(char)) {
      setPair({ from: char, to: char });
      return;
    }

    if (reduced && !motion.reduced.rollDigits) {
      // Swap in place. The flash below still says what changed and which way.
      setPair({ from: char, to: char });
    } else {
      setPair({ from, to: char });
      rollDir.value = direction;

      roll.value = 0;
      roll.value = withDelay(
        index * stagger,
        withTiming(1, {
          duration: motion.digitRollMs[variant],
          easing: Easing.out(Easing.cubic),
        }),
      );
    }

    if (variant === 'tick') {
      flashSign.value = direction;
      const attack = reduced ? 0 : motion.tickAttackMs;
      const decay = reduced ? motion.reduced.tickDecayMs : motion.tickDecayMs;
      // Rise, then decay. The rise is short but non-zero — snapping straight
      // to colour is what reads as a light switch. The peak stops short of
      // full saturation on purpose.
      const hold = reduced ? 0 : motion.tickHoldMs;
      // Rise, hold, decay — three plain steps. The hold is a timing to the
      // same value, not a nested withDelay: nesting a delay inside a sequence
      // is fragile and can kill the sequence outright.
      flash.value = withDelay(
        index * stagger,
        withSequence(
          withTiming(motion.tickFlashPeak, {
            duration: attack,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(motion.tickFlashPeak, { duration: hold }),
          // Still decays — never persists.
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
    roll,
    rollDir,
    flash,
    flashSign,
  ]);

  const baseColor = (style?.color as string) ?? theme.textPrimary;

  const colorStyle = useAnimatedStyle(() => ({
    color:
      variant === 'tick'
        ? interpolateColor(
            flash.value,
            [0, 1],
            [baseColor, flashSign.value >= 0 ? theme.flashUp : theme.flashDown],
          )
        : baseColor,
  }));

  // Arriving glyph: starts one slot away in the direction of travel, ends at 0.
  const incomingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - roll.value) * rollDir.value * height }],
  }));

  // Departing glyph: starts at 0, exits through the opposite edge.
  const outgoingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -roll.value * rollDir.value * height }],
  }));

  const rolling = pair.from !== pair.to;

  return (
    <View style={{ height, overflow: 'hidden', justifyContent: 'center' }}>
      {rolling ? (
        <Animated.Text
          style={[style, tabular, styles.outgoing, colorStyle, outgoingStyle]}
        >
          {pair.from}
        </Animated.Text>
      ) : null}
      <Animated.Text style={[style, tabular, colorStyle, incomingStyle]}>
        {pair.to}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  // Overlays the slot so the two glyphs occupy the same space. Safe because
  // tabular numerals guarantee every digit has the same advance width.
  outgoing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
