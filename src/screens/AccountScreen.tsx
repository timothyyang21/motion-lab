import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../tokens/ThemeProvider';
import { typeScale, tabular } from '../tokens/theme';
import { RollingNumber } from '../components/RollingNumber';
import { Sheet } from '../components/Sheet';
import { useTickingPrices, type Instrument } from '../data/instruments';

const BALANCE = 128420.55;

export function AccountScreen() {
  const { theme } = useTheme();
  const instruments = useTickingPrices();
  const [selected, setSelected] = useState<Instrument | null>(null);

  return (
    <View style={[styles.root, { backgroundColor: theme.ground }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[typeScale.caption, { color: theme.textTertiary }, styles.label]}>
          TOTAL BALANCE
        </Text>
        <RollingNumber
          value={BALANCE}
          decimals={2}
          variant="commit"
          prefix="$"
          style={{ ...typeScale.balance, color: theme.textPrimary }}
        />

        <View style={styles.listHeader}>
          <Text style={[typeScale.caption, { color: theme.textTertiary }]}>HOLDINGS</Text>
        </View>

        {instruments.map((instrument) => (
          <Row key={instrument.id} instrument={instrument} onPress={() => setSelected(instrument)} />
        ))}
      </ScrollView>

      <Sheet visible={!!selected} onClose={() => setSelected(null)}>
        <View style={styles.sheetContent}>
          <Text style={[typeScale.sheetTitle, { color: theme.textPrimary }]}>
            {selected?.name ?? ''}
          </Text>
          <Text style={[typeScale.caption, { color: theme.textTertiary }, styles.label]}>
            {selected?.symbol ?? ''}
          </Text>
        </View>
      </Sheet>
    </View>
  );
}

function Row({ instrument, onPress }: { instrument: Instrument; onPress: () => void }) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.hairline, { backgroundColor: theme.hairline }]} />
      <View style={styles.rowInner}>
        <View>
          <Text style={[typeScale.rowLabel, { color: theme.textPrimary }]}>
            {instrument.symbol}
          </Text>
          <Text style={[typeScale.caption, { color: theme.textTertiary }, tabular]}>
            {instrument.holding} {instrument.symbol}
          </Text>
        </View>
        <RollingNumber
          value={instrument.price}
          decimals={instrument.price < 10 ? 4 : 2}
          variant="tick"
          prefix="$"
          style={{ ...typeScale.rowValue, color: theme.textPrimary }}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: 72, paddingHorizontal: 20, paddingBottom: 48 },
  label: { marginBottom: 6 },
  listHeader: { marginTop: 44, marginBottom: 4 },
  row: { position: 'relative' },
  hairline: { height: StyleSheet.hairlineWidth, width: '100%' },
  rowInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  sheetContent: { paddingHorizontal: 20, paddingTop: 16 },
});
