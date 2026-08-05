import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../tokens/ThemeProvider';
import { DevBar } from '../dev/DevBar';
import { typeScale, tabular } from '../tokens/theme';
import { RollingNumber } from '../components/RollingNumber';
import { Sheet } from '../components/Sheet';
import { HoldToConfirm } from '../components/HoldToConfirm';
import { useTickingPrices, type Instrument } from '../data/instruments';
import { captureFlicks, type CaptureFlick, type FlickKind } from '../dev/captureFlicks';

const BALANCE = 128420.55;

const DETAIL_ROWS = [
  { label: 'MARKET CAP', value: '1.27T' },
  { label: '24H VOLUME', value: '38.4B' },
  { label: 'CIRCULATING', value: '19.87M' },
  { label: 'MAX SUPPLY', value: '21.00M' },
  { label: 'ALL-TIME HIGH', value: '73,750.07' },
  { label: 'ALL-TIME LOW', value: '67.81' },
  { label: '24H HIGH', value: '64,902.11' },
  { label: '24H LOW', value: '63,140.85' },
  { label: '7D CHANGE', value: '+4.12%' },
  { label: '30D CHANGE', value: '-2.86%' },
  { label: '90D CHANGE', value: '+18.03%' },
  { label: '1Y CHANGE', value: '+61.40%' },
  { label: 'VOLATILITY 30D', value: '2.94%' },
  { label: 'AVG COST', value: '41,208.33' },
  { label: 'BOOK VALUE', value: '16,977.83' },
  { label: 'UNREALISED', value: '+9,472.18' },
  { label: 'REALISED', value: '+1,204.00' },
  { label: 'FEES PAID', value: '318.44' },
  { label: 'FIRST BOUGHT', value: '2021-11-08' },
  { label: 'LAST TRADE', value: '2026-07-14' },
  { label: 'ORDERS', value: '47' },
  { label: 'OPEN ORDERS', value: '2' },
];

const ACTIVITY_ROWS = [
  { date: '2026-07-14', kind: 'Buy', amount: '+0.0240' },
  { date: '2026-07-02', kind: 'Sell', amount: '-0.0115' },
  { date: '2026-06-28', kind: 'Buy', amount: '+0.0500' },
  { date: '2026-06-19', kind: 'Buy', amount: '+0.0075' },
  { date: '2026-06-04', kind: 'Sell', amount: '-0.0330' },
  { date: '2026-05-22', kind: 'Buy', amount: '+0.0410' },
  { date: '2026-05-09', kind: 'Buy', amount: '+0.0180' },
  { date: '2026-04-27', kind: 'Sell', amount: '-0.0092' },
  { date: '2026-04-11', kind: 'Buy', amount: '+0.0625' },
  { date: '2026-03-30', kind: 'Buy', amount: '+0.0208' },
  { date: '2026-03-15', kind: 'Sell', amount: '-0.0471' },
  { date: '2026-02-26', kind: 'Buy', amount: '+0.0350' },
];

export function AccountScreen() {
  const { theme } = useTheme();
  const instruments = useTickingPrices();
  const [selected, setSelected] = useState<Instrument | null>(null);
  const [balance, setBalance] = useState(BALANCE);
  const [naive, setNaive] = useState(false);

  // The nonce is what makes two identical velocities in a row still register
  // as two separate events.
  const [flick, setFlick] = useState<CaptureFlick | null>(null);
  const doFlick = (which: FlickKind) =>
    setFlick((previous) => ({
      velocity: captureFlicks[which],
      nonce: (previous?.nonce ?? 0) + 1,
    }));

  // The system setting is the source of truth; the toggle overrides it so the
  // behaviour is capturable without digging through Accessibility settings.
  const systemReduced = useReducedMotion();
  const [reducedOverride, setReducedOverride] = useState<boolean | null>(null);
  const reduced = reducedOverride ?? systemReduced;

  const handleSelect = useCallback((instrument: Instrument) => setSelected(instrument), []);

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
          reduced={reduced}
          style={{ ...typeScale.balance, color: theme.textPrimary }}
        />

        <View style={styles.listHeader}>
          <Text style={[typeScale.caption, { color: theme.textTertiary }]}>HOLDINGS</Text>
        </View>

        {/*
          onSelect is stable and Row is memoised — see the note on Row. Passing
          `() => setSelected(instrument)` inline here allocates a new function
          every render, which would defeat the memo entirely and quietly undo
          the only measured performance fix in this repo.
        */}
        {instruments.map((instrument) => (
          <Row
            key={instrument.id}
            instrument={instrument}
            reduced={reduced}
            onSelect={handleSelect}
          />
        ))}
      </ScrollView>

      <Sheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        naive={naive}
        reduced={reduced}
        flick={flick}
      >
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
              reduced={reduced}
            />
          </View>

          {/* Exists so the sheet has something to scroll — the handoff needs
              content taller than the sheet to be demonstrable at all. */}
          <View style={styles.detail}>
            <Text style={[typeScale.caption, { color: theme.textTertiary }, styles.section]}>
              STATISTICS
            </Text>
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

            <Text style={[typeScale.caption, { color: theme.textTertiary }, styles.section]}>
              ACTIVITY
            </Text>
            {ACTIVITY_ROWS.map((row) => (
              <View key={row.date} style={styles.detailRow}>
                <View style={[styles.hairline, { backgroundColor: theme.hairline }]} />
                <View style={styles.detailInner}>
                  <View>
                    <Text style={[typeScale.rowLabel, { color: theme.textPrimary }]}>
                      {row.kind}
                    </Text>
                    <Text
                      style={[typeScale.caption, { color: theme.textTertiary }, tabular]}
                    >
                      {row.date}
                    </Text>
                  </View>
                  <Text
                    style={[typeScale.rowValue, { color: theme.textSecondary }, tabular]}
                  >
                    {row.amount} {selected?.symbol ?? ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Sheet>

      {/* Rendered after the sheet so it stays on top when opened: a comparison
          GIF with the mode visible is evidence, one without it is a claim.
          Closed — which is how it starts — it is a single faint dot. */}
      <DevBar
        naive={naive}
        onToggleNaive={() => setNaive((v) => !v)}
        reduced={reduced}
        onToggleReduced={() => setReducedOverride(!reduced)}
        onFlick={doFlick}
      />
    </View>
  );
}

/**
 * Memoised so a tick only re-renders the rows whose price actually moved.
 *
 * The ambient ticker replaces one or two prices every 1800ms but returns a new
 * array each time, so without this all sixteen rows re-rendered on every tick,
 * each rebuilding its RollingNumber and every Char inside it. Unchanged
 * instruments keep their object identity through the ticker's `map`, so a plain
 * reference comparison is enough — and it only holds because `onSelect` is
 * stable. An inline arrow at the call site would make every row look changed.
 *
 * HONEST NOTE ON WHAT THIS DID NOT DO. It was written to fix a measured problem
 * — 12.65% of frames dropped while the app sat completely idle on a Motorola
 * Edge 2024 at 90Hz — and it did not fix it. Three runs after this change:
 * 9.88%, 12.87%, 13.78%, against 12.65% before. Indistinguishable.
 *
 * The cost is not React reconciliation. Covering the list entirely with the
 * sheet doesn't help either (9.05% idle), because RN keeps rendering and
 * animating occluded views. What remains is the per-frame UI-thread work of the
 * flash and roll animations themselves. This stays because doing less work is
 * still right; it is not a performance win and shouldn't be sold as one.
 */
const Row = React.memo(function Row({
  instrument,
  onSelect,
  reduced,
}: {
  instrument: Instrument;
  onSelect: (instrument: Instrument) => void;
  reduced: boolean;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => onSelect(instrument)}
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
          reduced={reduced}
          style={{ ...typeScale.rowValue, color: theme.textPrimary }}
        />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Clears the status bar. It used to be 118 to clear the dev bar as well,
  // which meant a debug control was setting the layout of the screen it exists
  // to inspect. The dev panel is an overlay now and costs this nothing.
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
  section: { marginTop: 28, marginBottom: 4 },
  detailRow: { position: 'relative' },
  detailInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
});
