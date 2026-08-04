import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../tokens/ThemeProvider';
import { typeScale } from '../tokens/theme';

type Props = {
  naive: boolean;
  onToggleNaive: () => void;
  reduced: boolean;
  onToggleReduced: () => void;
};

/**
 * A capture affordance, not a feature.
 *
 * The naive/tuned toggle means the README's side-by-side comparison is provably
 * the same build, the same device, and the same hand — and capture day becomes
 * record-flip-record rather than record-edit-rebuild-record.
 *
 * CLOSED BY DEFAULT. It used to open as a row of chips pinned over the top of
 * the screen, which cost twice: it covered the sheet's title whenever the sheet
 * was up, and AccountScreen carried 118px of padding whose only job was to get
 * out of its way. A debug control that deforms the layout of the thing being
 * debugged is measuring itself.
 *
 * So it rests as a dot and opens as a panel. Open, it still sits ON TOP of the
 * sheet on purpose: a comparison GIF with the mode visible is evidence, one
 * without it is a claim. Closed, it costs the screen nothing.
 *
 * Every control NAMES THE STATE IT IS CURRENTLY IN, and fills in when that
 * state is a departure from the lab's default — so TUNED / LIGHT / FULL read as
 * outlines, and NAIVE / DARK / REDUCED read as filled. A control labelled for
 * its action instead — one saying REDUCED whether or not reduced motion is on —
 * is ambiguous in a still frame, which is the single thing this exists to
 * survive. Chips share a minimum width so toggling never re-flows the panel.
 */
export function DevBar({ naive, onToggleNaive, reduced, onToggleReduced }: Props) {
  const { theme, scheme, setOverride } = useTheme();
  const [open, setOpen] = useState(false);

  // Closed, it's a nearly invisible dot rather than nothing at all — at GIF
  // scale it reads as a speck, but it can't be lost mid-shoot either.
  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={24}
        style={[styles.dot, { backgroundColor: theme.textTertiary }]}
      />
    );
  }

  return (
    <View style={[styles.panel, { borderColor: theme.hairline, backgroundColor: theme.surface }]}>
      <Setting
        label="MODE"
        value={naive ? 'NAIVE' : 'TUNED'}
        active={naive}
        onPress={onToggleNaive}
      />
      <Setting
        label="THEME"
        value={scheme === 'dark' ? 'DARK' : 'LIGHT'}
        active={scheme === 'dark'}
        onPress={() => setOverride(scheme === 'dark' ? 'light' : 'dark')}
      />
      <Setting
        label="MOTION"
        value={reduced ? 'REDUCED' : 'FULL'}
        active={reduced}
        onPress={onToggleReduced}
      />
      <Pressable
        onPress={() => setOpen(false)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.close,
          { borderColor: theme.hairline, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Text style={[typeScale.caption, { color: theme.textTertiary }]}>HIDE</Text>
      </Pressable>
    </View>
  );
}

function Setting({
  label,
  value,
  active,
  onPress,
}: {
  label: string;
  value: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.settingRow}>
      <Text style={[typeScale.caption, { color: theme.textTertiary }]}>{label}</Text>
      <Pressable
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [
          styles.chip,
          {
            borderColor: theme.hairline,
            backgroundColor: active ? theme.accent : 'transparent',
            opacity: pressed ? 0.6 : 1,
          },
        ]}
      >
        <Text style={[typeScale.caption, { color: active ? theme.accentOn : theme.textTertiary }]}>
          {value}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 62,
    right: 16,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  dot: {
    position: 'absolute',
    top: 70,
    right: 22,
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    /*
     * Sized to the longest value — REDUCED, 7 caps at caption metrics (12px,
     * 0.2 tracking) ≈ 58px, plus 18px of horizontal padding. Centred, because
     * the shorter values now sit in a box built for a longer one.
     */
    minWidth: 76,
    alignItems: 'center',
  },
  close: {
    marginTop: 2,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
});
