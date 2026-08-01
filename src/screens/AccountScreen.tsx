import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../tokens/ThemeProvider';
import { typeScale, tabular } from '../tokens/theme';
import { RollingNumber } from '../components/RollingNumber';
import { Sheet } from '../components/Sheet';
import { HoldToConfirm } from '../components/HoldToConfirm';
import { useTickingPrices, type Instrument } from '../data/instruments';

const BALANCE = 128420.55;

const DETAIL_ROWS = [
  { label: 'MARKET CAP', value: '1.27T' },
  { label: '24H VOLUME', value: '38.4B' },
  { label: 'CIRCULATING', value: '19.87M' },
  { label: 'ALL-TIME HIGH', value: '73,750.07' },
  { label: 'ALL-TIME LOW', value: '67.81' },
  { label: '7D CHANGE', value: '+4.12%' },
  { label: '30D CHANGE', value: '-2.86%' },
  { label: '1Y CHANGE', value: '+61.40%' },
  { label: 'AVG COST', value: '41,208.33' },
  { label: 'UNREALISED', value: '+9,472.18' },
  { label: 'REALISED', value: '+1,204.00' },
  { label: 'FEES PAID', value: '318.44' },
  { label: 'FIRST BOUGHT', value: '2021-11-08' },
  { label: 'LAST TRADE', value: '2026-07-14' },
  { label: 'ORDERS', value: '47' },
];

export function AccountScreen() {
  const { theme } = useTheme();
  const instruments = useTickingPrices();
  const [selected, setSelected] = useState<Instrument | null>(null);
  const [balance, setBalance] = useState(BALANCE);

  const handleConfirm = () => {
    // Let the bloom finish before the sheet leaves. Dismissing mid-flash reads
    // as though the confirmation was skipped rather than acknowledged — and it
    // wastes the one moment the screen is allowed to be vivid.
    setTimeout(() => {
      setSelected(null);
      setBalance((current) => current - 2480.5);
    }, 780);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.ground }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[typeScale.caption, { color: theme.textTertiary }, styles.label]}>
          TOTAL BALANCE
        </Text>
        <RollingNumber
          value={balance}
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

          <View style={styles.confirmWrap}>
            <HoldToConfirm
              key={selected?.id ?? 'none'}
              label="Hold to sell"
              confirmedLabel="Sold"
              onConfirm={handleConfirm}
            />
          </View>

          {/* Exists so the sheet has something to scroll — the handoff needs
              content taller than the sheet to be demonstrable at all. */}
          <View style={styles.detail}>
            {DETAIL_ROWS.map((row) => (
              <View key={row.label} style={styles.detailRow}>
                <View style={[styles.hairline, { backgroundColor: theme.hairline }]} />
                <View style={styles.detailInner}>
                  <Text style={[typeScale.caption, { color: theme.textTertiary }]}>
                    {row.label}
                  </Text>
                  <Text
                    style={[typeScale.rowValue, { color: theme.textSecondary }, tabular]}
                  >
                    {row.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
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
  confirmWrap: { marginTop: 28 },
  detail: { marginTop: 36 },
  detailRow: { position: 'relative' },
  detailInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
});
