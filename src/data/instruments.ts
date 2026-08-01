import { useEffect, useState } from 'react';

export type Instrument = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  holding: number;
};

export const INSTRUMENTS: Instrument[] = [
  { id: '1', symbol: 'BTC', name: 'Bitcoin', price: 64218.4, holding: 0.412 },
  { id: '2', symbol: 'ETH', name: 'Ethereum', price: 3142.86, holding: 5.03 },
  { id: '3', symbol: 'SOL', name: 'Solana', price: 148.22, holding: 62.5 },
  { id: '4', symbol: 'XRP', name: 'XRP', price: 0.6134, holding: 4200 },
  { id: '5', symbol: 'ADA', name: 'Cardano', price: 0.4471, holding: 3150 },
  { id: '6', symbol: 'DOT', name: 'Polkadot', price: 7.089, holding: 240 },
];

/**
 * Ambient price movement.
 *
 * This exists to give the rolling number its tick configuration and to keep the
 * screen alive behind the sheet. It is not a feature and must never become one.
 */
export function useTickingPrices(): Instrument[] {
  const [instruments, setInstruments] = useState(INSTRUMENTS);

  useEffect(() => {
    const id = setInterval(() => {
      setInstruments((current) =>
        current.map((instrument) => {
          // Roughly one row per tick. Three rows flashing at once reads as a
          // screensaver rather than a market, and it makes the individual
          // flash impossible to actually look at.
          if (Math.random() > 0.18) return instrument;
          const drift = (Math.random() - 0.5) * 0.004;
          return { ...instrument, price: instrument.price * (1 + drift) };
        }),
      );
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return instruments;
}
