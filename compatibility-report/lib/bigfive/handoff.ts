import { stableStringify } from "./format";
import { sha256 } from "../crypto/sha256";
import { computeSignals, DomainMeans } from "./signals";
import type { DomainKey } from "./constants";
import handback from "../../gzero-handback-1.0.json";

// Minimal types ------------------------------------------------------------------
export interface FacetEntry { domain: DomainKey; line: string; tag: string; }
export interface HandoffPayload {
  type: 'Handoff';
  version: 'gzero-handback-1.0';
  hash: string;                      // sha256 of deterministic input keys
  indices: { T:number; P:number; S:number; delta:number; lead: string; };
  items: Array<FacetEntry>;          // one per domain
}

// Helpers ------------------------------------------------------------------------
const clamp01 = (x:number)=> Math.max(0, Math.min(1, x));
const z = (x:number)=> clamp01((x-1)/4);

function pickTopFacet(raw: Record<string, number>): string {
  // return facet with greatest distance from 3
  let best = Object.keys(raw)[0];
  let bestDelta = 0;
  for (const f of Object.keys(raw)){
    const delta = Math.abs(raw[f] - 3);
    if (delta > bestDelta){ bestDelta = delta; best = f; }
  }
  return best;
}

export async function buildHandoff(fullResults: Array<{domain: DomainKey; payload:any}>, suiteHash: string): Promise<HandoffPayload>{
  // Compute domain means 1–5
  const means: DomainMeans = { O:0,C:0,E:0,A:0,N:0 } as any;
  const facetRaw: Record<DomainKey, Record<string, number>> = {} as any;
  for (const r of fullResults){
    const rawPhase2 = r.payload?.phase2?.A_raw ?? {}; // {facet:number}
    facetRaw[r.domain] = rawPhase2;
    const vals = Object.values(rawPhase2) as number[];
    means[r.domain] = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 3;
  }
  const signals = computeSignals(means);

  const indices = { T:signals.T, P:signals.P, S:signals.S, delta:signals.motionBalance, lead:signals.leadLabel } as const;

  // Build mirror lines per domain using template
  const tmpl = (handback as any).templates.mirror as Record<string,string>;
  const items: Array<FacetEntry> = [];
  (Object.keys(means) as DomainKey[]).forEach(d=>{
    const rawMap = (facetRaw[d]||{}) as Record<string, number>;
    // Stabilizer selection rules:
    // - O/C/E/A: prefer a High positive lever; fallback to next-highest positive; never pick a Low as stabilizer
    // - N: prefer Low Anxiety; else pick the lowest negative facet and prefix with "Low "
    let chosenFacet = '';
    if (d !== 'N'){
      const positives = Object.keys(rawMap).filter(f=> !['Anxiety','Anger','Depression','Immoderation','Vulnerability','Self-Consciousness'].includes(f));
      const sorted = positives.sort((a,b)=> (rawMap[b]??3) - (rawMap[a]??3));
      const firstHigh = sorted.find(f=> (rawMap[f]??3) >= 3.5);
      chosenFacet = firstHigh || sorted[0] || Object.keys(rawMap)[0] || '';
    } else {
      const anxiety = rawMap['Anxiety'];
      if (typeof anxiety === 'number' && anxiety <= 2.5){
        chosenFacet = 'Low Anxiety';
      } else {
        const negatives = ['Anxiety','Anger','Depression','Immoderation','Vulnerability','Self-Consciousness'];
        const lowest = negatives
          .filter(f=> f in rawMap)
          .sort((a,b)=> (rawMap[a]??3) - (rawMap[b]??3))[0];
        chosenFacet = lowest ? `Low ${lowest}` : 'Low Anxiety';
      }
    }

    const tplKey = indices.lead; // pursuit/threat/balanced
    const lineTemplate = tmpl[tplKey] || "{facet}";
    const line = lineTemplate.replace('{facet}', chosenFacet);
    const tagKey = (d==='N' && chosenFacet.startsWith('Low ')) ? chosenFacet.slice(4) : chosenFacet;
    const tag = (handback as any).domains[d]?.tags?.High?.[tagKey] || '';
    items.push({ domain:d, line, tag });
  });

  // Build hash input array (fixed order)
  const hashInput = {
    domain_means: means,
    topFacet: items.map(i=>i.line),
    indices,
    suiteHash
  };
  const checksum = await sha256(stableStringify(hashInput));

  return { type:'Handoff', version:'gzero-handback-1.0', hash:checksum, indices, items };
}
