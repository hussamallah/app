export function stableStringify(obj: any): string {
  const seen = new WeakSet();
  const stringify = (x: any): string => {
    if (x === null || typeof x !== 'object') return JSON.stringify(x);
    if (seen.has(x)) throw new TypeError('circular');
    seen.add(x);
    if (Array.isArray(x)) return '[' + x.map(v => stringify(v)).join(',') + ']';
    const keys = Object.keys(x).sort();
    return '{' + keys.map(k => JSON.stringify(k)+':'+stringify((x as any)[k])).join(',') + '}';
  };
  return stringify(obj);
}

export function toPercentFromRaw(raw: number): number {
  const pct = ((raw - 1) / 4) * 100;
  return Math.round(pct * 10) / 10;
}

export function getScoreLevel(domainMeanRaw: number): 'high'|'neutral'|'low' {
  if (domainMeanRaw >= 4.0) return 'high';
  if (domainMeanRaw <= 2.0) return 'low';
  return 'neutral';
}

export function getFacetScoreLevel(facetRaw: number): 'high'|'medium'|'low' {
  if (facetRaw >= 4.0) return 'high';
  if (facetRaw <= 2.0) return 'low';
  return 'medium';
}


