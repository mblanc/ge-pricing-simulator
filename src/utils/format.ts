export function formatCurrencyMillions(usd: number, decimals = 1): string {
  const abs = Math.abs(usd);
  const sign = usd < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(decimals)}M`;
  }
  if (abs >= 10_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatCurrencyExact(usd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(usd);
}

export function formatTokensMillions(tokensM: number): string {
  if (tokensM >= 1_000_000) {
    return `${(tokensM / 1_000_000).toFixed(1)}T`;
  }
  if (tokensM >= 1_000) {
    return `${(tokensM / 1_000).toFixed(1)}B`;
  }
  return `${tokensM.toFixed(1)}M`;
}

export function formatPct(ratio: number, decimals = 1): string {
  return `${(ratio * 100).toFixed(decimals)}%`;
}

export function formatDeltaPct(ratio: number): string {
  const absPct = Math.abs(ratio * 100).toFixed(1);
  if (ratio < -0.0005) {
    return `▼ ${absPct}%`;
  }
  if (ratio > 0.0005) {
    return `▲ ${absPct}%`;
  }
  return `0.0%`;
}
