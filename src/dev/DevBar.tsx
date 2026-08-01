import React from 'react';
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
 * It stays visible on top of the sheet on purpose. A comparison GIF with the
 * mode chip in frame is evidence; one without it is a claim.
 */
export function DevBar({ naive, onToggleNaive, reduced, onToggleReduced }: Props) {
  const { theme, scheme, setOverride } = useTheme();

  return (
    <View style={[styles.bar, { borderColor: theme.hairline, backgroundColor: theme.surface }]}>
      <Chip active={naive} label={naive ? 'NAIVE' : 'TUNED'} onPress={onToggleNaive} />
      <Chip
        active={scheme === 'dark'}
        label={scheme === 'dark' ? 'DARK' : 'LIGHT'}
        onPress={() => setOverride(scheme === 'dark' ? 'light' : 'dark')}
      />
      <Chip active={reduced} label="REDUCED" onPress={onToggleReduced} />
    </View>
  );
}

function Chip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
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
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 62,
    right: 16,
    flexDirection: 'row',
    gap: 6,
    padding: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
