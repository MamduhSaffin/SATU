export type RateSource = 'manual' | 'cached' | 'remote';

export type CurrencyRateSnapshot = {
  base: string;
  quote: string;
  rate: number;
  capturedAt: number;
  source: RateSource;
};

export function createRateSnapshot(
  base: string,
  quote: string,
  rate: number,
  source: RateSource = 'manual',
  capturedAt = Date.now(),
): CurrencyRateSnapshot {
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Exchange rate must be greater than zero');
  return {
    base: base.toUpperCase(),
    quote: quote.toUpperCase(),
    rate,
    source,
    capturedAt,
  };
}

export function convertUsingRate(
  amount: number,
  from: string,
  to: string,
  snapshot: CurrencyRateSnapshot,
): number {
  if (!Number.isFinite(amount)) throw new Error('Amount must be a valid number');

  const source = from.toUpperCase();
  const target = to.toUpperCase();
  if (source === target) return amount;

  if (source === snapshot.base && target === snapshot.quote) {
    return amount * snapshot.rate;
  }

  if (source === snapshot.quote && target === snapshot.base) {
    return amount / snapshot.rate;
  }

  throw new Error(`Rate snapshot does not support ${source} to ${target}`);
}

export function isRateStale(snapshot: CurrencyRateSnapshot, maxAgeHours = 24): boolean {
  const maxAgeMs = Math.max(1, maxAgeHours) * 60 * 60 * 1000;
  return Date.now() - snapshot.capturedAt > maxAgeMs;
}

export function formatMoney(amount: number, currency: string, locale = 'ms-MY'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amount);
}
