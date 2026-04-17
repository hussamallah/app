// Data contract: load deterministic facts from localStorage
export type Bucket = "High" | "Medium" | "Low";
export type Domain = "O" | "C" | "E" | "A" | "N";

export interface FacetState {
  [facet: string]: Bucket;
}

export interface DomainFinal {
  domain: Domain;
  mean_raw: number; // 1..5
  mean_pct: number; // 0..100
  bucket: FacetState; // facet -> H/M/L
}

export interface GZFacts {
  suiteHash: string;
  domains: Record<Domain, DomainFinal>;
}

export function loadFacts(): GZFacts {
  const raw = localStorage.getItem("gz_full_results");
  const hash = localStorage.getItem("gz_full_hash") || "unknown";
  if (!raw) throw new Error("No results in localStorage");
  
  const parsed = JSON.parse(raw) as Array<{ domain: Domain; payload: any }>;
  const map: Record<Domain, DomainFinal> = {} as any;
  
  for (const r of parsed) {
    const d = r.domain as Domain;
    const f = r.payload.final;
    map[d] = {
      domain: d,
      mean_raw: Number(f.domain_mean_raw),
      mean_pct: Number(f.domain_mean_pct),
      bucket: f.bucket,
    };
  }
  
  return { suiteHash: hash, domains: map };
}
