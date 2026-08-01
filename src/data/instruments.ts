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
  { id: '7', symbol: 'AVAX', name: 'Avalanche', price: 27.415, holding: 88 },
  { id: '8', symbol: 'LINK', name: 'Chainlink', price: 14.302, holding: 310 },
  { id: '9', symbol: 'MATIC', name: 'Polygon', price: 0.5218, holding: 5400 },
  { id: '10', symbol: 'ATOM', name: 'Cosmos', price: 6.744, holding: 420 },
  { id: '11', symbol: 'LTC', name: 'Litecoin', price: 71.68, holding: 26.4 },
  { id: '12', symbol: 'UNI', name: 'Uniswap', price: 8.913, holding: 190 },
  { id: '13', symbol: 'NEAR', name: 'NEAR Protocol', price: 4.226, holding: 640 },
  { id: '14', symbol: 'ALGO', name: 'Algorand', price: 0.1584, holding: 12800 },
  { id: '15', symbol: 'XLM', name: 'Stellar', price: 0.1042, holding: 9600 },
  { id: '16', symbol: 'FIL', name: 'Filecoin', price: 3.871, holding: 505 },
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
          // Roughly one or two rows per tick regardless of list length.
          // Several rows flashing at once reads as a screensaver rather than a
          // market, and makes any individual flash impossible to look at.
          if (Math.random() > 0.09) return instrument;
          const drift = (Math.random() - 0.5) * 0.004;
          return { ...instrument, price: instrument.price * (1 + drift) };
        }),
      );
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return instruments;
}
