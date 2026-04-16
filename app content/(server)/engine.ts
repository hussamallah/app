// Server-only engine facade. Wraps existing logic and content providers.
import crypto from "node:crypto";
import {
  DOMAINS, canonicalFacets, P1_PROMPTS, ANCHORS, CONFIRM, type DomainKey
} from "@/lib/bigfive/constants";
import {
  anchorsBudget, applyConfirmersBucket, baseBucket, computePrior,
  shortlistResolver, triggersForConfirmers
} from "@/lib/bigfive/logic";
import { stableStringify, toPercentFromRaw } from "@/lib/bigfive/format";

export const VERSION = "server-engine-1.0";

export function domainOrder(): DomainKey[] { return ['E','C','A','O','N']; }
export function facetsOf(domain: DomainKey){ return canonicalFacets(domain); }
export function domainLabel(domain: DomainKey){ return DOMAINS[domain].label; }
export function p1Prompts(domain: DomainKey){ return P1_PROMPTS[domain]; }
export function anchorPrompt(domain: DomainKey, facet: string, idx: number){
  const arr = (ANCHORS as any)[domain]?.[facet] as string[] | undefined;
  if (!arr || !arr[idx]) {
    console.warn(`Missing anchor statement for ${domain}.${facet}[${idx}]`);
    return `Rate ${facet} (item ${idx+1}) - Statement not available`;
  }
  return arr[idx];
}
export function confirmQuestion(domain: DomainKey, facet: string){
  return (CONFIRM as any)[domain]?.[facet] || `Quick check on ${facet}`;
}

export { shortlistResolver, computePrior, anchorsBudget, triggersForConfirmers, baseBucket, applyConfirmersBucket, toPercentFromRaw };
export type Phase3Answer = { facet:string; answer:'Yes'|'No'|'Maybe' };

export function finalizeDomain(
  A_raw: Record<string,number>,
  prior: Record<string,number>,
  asked: Phase3Answer[],
  domain: DomainKey,
  facets: string[]
){
  const A_pct = Object.fromEntries(facets.map(f=> [f, Math.round(toPercentFromRaw(A_raw[f])*10)/10]));
  const initial = Object.fromEntries(facets.map(f=> [f, baseBucket(A_raw[f], prior[f])])) as Record<string,'High'|'Medium'|'Low'>;
  const bucket = applyConfirmersBucket(initial, A_raw, prior, asked);
  const order = facets.slice().sort((a,b)=> {
    const rank = { High:3, Medium:2, Low:1 } as const;
    if (rank[bucket[a]] !== rank[bucket[b]]) return rank[bucket[a]] - rank[bucket[b]];
    if (A_raw[b] !== A_raw[a]) return A_raw[b] - A_raw[a];
    return facets.indexOf(a) - facets.indexOf(b);
  });
  const domain_mean_raw = Math.round((facets.reduce((s,f)=> s + (A_raw[f] ?? 3), 0)/6)*100)/100;
  const domain_mean_pct = Math.round((toPercentFromRaw(domain_mean_raw))*10)/10;
  return { A_pct, bucket, order, domain_mean_raw, domain_mean_pct };
}

export function resultHashFromRuns(runs: Array<{domain:DomainKey; payload:any}>): string {
  const normalized = runs.map(r=> ({ domain: r.domain, payload: r.payload }));
  const json = stableStringify(normalized);
  return crypto.createHash('sha256').update(Buffer.from(json,'utf8')).digest('hex').slice(0, 24);
}

export type ReplayDomain = {
  domain: DomainKey;
  label: string;
  phase1: { plus: string[]; minus: string[]; resolver: string[]; prompts: { q1: string; q2: string; q3: string } };
  phase2: Array<{ facet: string; idx: number; prompt: string; value: number }>;
  phase3: Array<{ facet: string; question: string; answer: 'Yes'|'No'|'Maybe' }>;
};

export function replay(results: Array<{ domain: DomainKey; payload: any }>): ReplayDomain[] {
  const out: ReplayDomain[] = [];
  for (const r of results){
    const d = r.domain;
    const label = domainLabel(d);
    const facets = facetsOf(d);
    const p1 = r.payload?.phase1 || {};
    const p2 = r.payload?.phase2 || {};
    const p3 = r.payload?.phase3 || {};

    const plus = facets.filter(f => (p1.p?.[f]||0) === 1);
    const minus = facets.filter(f => (p1.m?.[f]||0) === 1);
    const resolver = facets.filter(f => (p1.t?.[f]||0) === 1);

    const phase2: Array<{ facet: string; idx: number; prompt: string; value: number }> = [];
    const answers: Array<{facet:string; idx:number; value:number}> = Array.isArray(p2.answers) ? p2.answers : [];
    for (const a of answers){
      const prompt = anchorPrompt(d, a.facet, a.idx);
      phase2.push({ facet: a.facet, idx: a.idx, prompt, value: a.value });
    }

    const phase3: Array<{ facet: string; question: string; answer: 'Yes'|'No'|'Maybe' }> = [];
    const asked: Array<{facet:string; answer:'Yes'|'No'|'Maybe'}> = Array.isArray(p3.asked) ? p3.asked : [];
    for (const it of asked){
      const question = confirmQuestion(d, it.facet);
      phase3.push({ facet: it.facet, question, answer: it.answer });
    }

    out.push({
      domain: d,
      label,
      phase1: { plus, minus, resolver, prompts: p1Prompts(d) },
      phase2,
      phase3
    });
  }
  return out;
}
