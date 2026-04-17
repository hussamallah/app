export type DomainKey = 'O' | 'C' | 'E' | 'A' | 'N';

export interface DomainProfile {
  raw: number;
  pct: number;
  bucket: 'High' | 'Med' | 'Low';
}

export interface GZProfile {
  rid: string;
  profile_hash: string;
  domains: Record<DomainKey, DomainProfile>;
  facets: Record<string, number>;
  archetype: {
    id: string;
    confidence: number;
  };
}
