import { canonicalFacets, DomainKey } from "./constants";
import { getFacetScoreLevel } from "./format";
import BANK from "@/who_you_are_bank.json";

type Phase1 = { p: Record<string, number>; m: Record<string, number>; t: Record<string, number> };
type Phase2 = Record<string, number>;

type DisplayItem = {
  domain: DomainKey;
  leverKey: string; // snake_case in bank
  facetName: string; // canonical Big Five facet name
  cls: 'plus'|'minus'|'resolver';
  raw: number; // 1..5
  bucket: 'H'|'M'|'L';
};

const DOMAIN_ORDER_BANK: Array<DomainKey|'S'> = ['O','C','E','A','S'];

const N_TO_S: Record<DomainKey|'S', 'O'|'C'|'E'|'A'|'S'> = { O:'O', C:'C', E:'E', A:'A', N:'S', S:'S' } as any;

const FACET_TO_LEVER: Record<DomainKey, Record<string,string>> = {
  O: {
    'Imagination':'imagination',
    'Artistic Interests':'artistic_interests',
    'Emotionality':'emotionality',
    'Adventurousness':'adventurousness',
    'Intellect':'intellect',
    'Liberalism':'liberalism'
  },
  C: {
    'Self-Efficacy':'self_efficacy',
    'Orderliness':'orderliness',
    'Dutifulness':'dutifulness',
    'Achievement-Striving':'achievement_striving',
    'Self-Discipline':'self_discipline',
    'Cautiousness':'cautiousness'
  },
  E: {
    'Friendliness':'friendliness',
    'Gregariousness':'gregariousness',
    'Assertiveness':'assertiveness',
    'Activity Level':'activity_level',
    'Excitement-Seeking':'excitement_seeking',
    'Cheerfulness':'cheerfulness'
  },
  A: {
    'Trust':'trust',
    'Morality':'morality',
    'Altruism':'altruism',
    'Cooperation':'cooperation',
    'Modesty':'modesty',
    'Sympathy':'sympathy'
  },
  N: {
    'Anxiety':'anxiety',
    'Anger':'anger',
    'Depression':'depression',
    'Self-Consciousness':'self_consciousness',
    'Immoderation':'immoderation',
    'Vulnerability':'vulnerability'
  }
};

// Normalize capitalized/spaced keys to snake_case
const CANON: Record<string, string> = {
  'Self-Discipline': 'self_discipline',
  'Achievement-Striving': 'achievement_striving',
  'Artistic Interests': 'artistic_interests',
  'Activity Level': 'activity_level',
  'Self-Consciousness': 'self_consciousness',
  'Self-Efficacy': 'self_efficacy',
  'Excitement-Seeking': 'excitement_seeking'
};

function k(x: string): string {
  return CANON[x] ?? x.toLowerCase().replace(/\s+/g, '_');
}

// Guardrails: H >= 3.5, L <= 2.5
const H = 3.5;
const L = 2.5;

function toBucketLetter(raw: number): 'H'|'M'|'L' {
  return raw >= H ? 'H' : raw <= L ? 'L' : 'M';
}

function byDomainOrder(a: DisplayItem, b: DisplayItem): number {
  const aD = N_TO_S[a.domain];
  const bD = N_TO_S[b.domain];
  const d = DOMAIN_ORDER_BANK.indexOf(aD) - DOMAIN_ORDER_BANK.indexOf(bD);
  if (d !== 0) return d;
  const facs = canonicalFacets(a.domain);
  return facs.indexOf(a.facetName) - facs.indexOf(b.facetName);
}

// FIX 1: Pick top domains by Phase-2 means, not Phase-1 order
function topDomainsByMean(
  fullResults: Array<{domain: DomainKey; payload: any}>,
  phase1Items: DisplayItem[]
): { first: DomainKey | 'S'; second: DomainKey | 'S' } {
  const means = computeDomainMeans(fullResults);
  
  // Map N to S for display
  const meansWithS: Record<'O'|'C'|'E'|'A'|'S', number> = {
    O: means.O,
    C: means.C,
    E: means.E,
    A: means.A,
    S: 6 - means.N // Stability = 6 - Neuroticism
  };
  
  // Tiebreak preference: A > O > C > E > S
  const tie = ['A', 'O', 'C', 'E', 'S'];
  
  const ranked = (Object.entries(meansWithS) as Array<['O'|'C'|'E'|'A'|'S', number]>)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]; // Higher mean first
      return tie.indexOf(a[0]) - tie.indexOf(b[0]); // Tiebreak by preference
    });
  
  return { 
    first: ranked[0]?.[0] ?? 'A', 
    second: ranked[1]?.[0] ?? ranked[0]?.[0] ?? 'O' 
  };
}

// FIX 2: Pick strongest lever from Phase-2 highs, tiebreak by Phase-1 weight
function strongestLever(
  phase1Items: DisplayItem[],
  fullResults: Array<{domain: DomainKey; payload: any}>
): string {
  if (phase1Items.length === 0) return 'imagination';
  
  // Build Phase-2 map
  const p2: Record<string, number> = {};
  for (const d of ['O','C','E','A','N'] as DomainKey[]) {
    const r = fullResults.find(x => x.domain === d);
    const A_raw = r?.payload?.phase2?.A_raw as Record<string, number> | undefined;
    if (!A_raw) continue;
    for (const f of canonicalFacets(d)) {
      const lever = FACET_TO_LEVER[d][f];
      if (lever) p2[k(lever)] = A_raw[f] ?? 3.0;
    }
  }
  
  // Weight function: plus=2, resolver=1, minus=0
  const weight = (leverKey: string): number => {
    const item = phase1Items.find(it => k(it.leverKey) === k(leverKey));
    if (!item) return 0;
    if (item.cls === 'plus') return 2;
    if (item.cls === 'resolver') return 1;
    return 0;
  };
  
  // Get all levers from phase1Items
  const levers = phase1Items.map(it => k(it.leverKey));
  
  // Sort by Phase-2 score (descending), then by Phase-1 weight (descending)
  const sorted = levers.sort((a, b) => {
    const scoreA = p2[a] ?? 3.0;
    const scoreB = p2[b] ?? 3.0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return weight(b) - weight(a);
  });
  
  return sorted[0] ?? 'imagination';
}

function listPhase1Items(fullResults: Array<{domain: DomainKey; payload: any}>): DisplayItem[] {
  const out: DisplayItem[] = [];
  for (const d of ['O','C','E','A','N'] as DomainKey[]) {
    const r = fullResults.find(x => x.domain === d);
    if (!r) continue;
    const p1: Phase1 | undefined = r.payload?.phase1;
    const A_raw: Record<string, number> | undefined = r.payload?.phase2?.A_raw;
    if (!p1 || !A_raw) continue;
    const facets = canonicalFacets(d);
    // plus in this domain
    for (const f of facets) if ((p1.p?.[f] || 0) === 1 && (p1.m?.[f] || 0) === 0) {
      const raw = A_raw[f] ?? 3.0;
      out.push({ domain: d, leverKey: FACET_TO_LEVER[d][f], facetName: f, cls:'plus', raw, bucket: toBucketLetter(raw) });
    }
    // resolver
    for (const f of facets) if ((p1.t?.[f] || 0) === 1) {
      const raw = A_raw[f] ?? 3.0;
      out.push({ domain: d, leverKey: FACET_TO_LEVER[d][f], facetName: f, cls:'resolver', raw, bucket: toBucketLetter(raw) });
    }
    // minus
    for (const f of facets) if ((p1.m?.[f] || 0) === 1) {
      const raw = A_raw[f] ?? 3.0;
      out.push({ domain: d, leverKey: FACET_TO_LEVER[d][f], facetName: f, cls:'minus', raw, bucket: toBucketLetter(raw) });
    }
  }
  return out.sort(byDomainOrder);
}

function computeDomainMeans(fullResults: Array<{domain: DomainKey; payload: any}>): Record<DomainKey, number> {
  const means: Record<DomainKey, number> = { O:0, C:0, E:0, A:0, N:0 } as any;
  for (const d of ['O','C','E','A','N'] as DomainKey[]) {
    const r = fullResults.find(x => x.domain === d);
    const A_raw: Record<string, number> | undefined = r?.payload?.phase2?.A_raw;
    if (!A_raw) { means[d] = 3.0; continue; }
    const vals = canonicalFacets(d).map(f => A_raw[f] ?? 3.0);
    means[d] = vals.reduce((a,b)=>a+b,0) / vals.length;
  }
  return means;
}

function toSummaryBucketLetter(mean: number): 'H'|'M'|'L' {
  const lvl = getFacetScoreLevel(mean);
  return (lvl === 'high' ? 'H' : (lvl === 'low' ? 'L' : 'M'));
}

function replaceTokens(template: string, tokens: Record<string,string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => tokens[k] ?? `{${k}}`);
}

export type DeterministicWhoView = {
  headline: string;
  bodyLines: string[];           // legacy granular lines
  verdict: string;
  upsellLines: string[];
  cleanParagraphs?: string[];    // condensed domain paragraphs
};

export function buildDeterministicWhoView(
  fullResults: Array<{domain: DomainKey; payload: any}>,
  checksum: string
): DeterministicWhoView {
  const items = listPhase1Items(fullResults);
  const means = computeDomainMeans(fullResults);

  // FIX 1 & 2: Use Phase-2 means for top domains and strongest lever
  const { first: topDomain, second: secondDomain } = topDomainsByMean(fullResults, items);
  const topLever = strongestLever(items, fullResults);

  const bankTopDomainName = (BANK.domains as any)[topDomain].name as string;
  const bankSecondDomainName = (BANK.domains as any)[secondDomain].name as string;
  
  // Find the domain for topLever to get its label
  let topLeverDomain: 'O'|'C'|'E'|'A'|'S' = topDomain as 'O'|'C'|'E'|'A'|'S';
  const topLeverItem = items.find(it => k(it.leverKey) === k(topLever));
  if (topLeverItem) {
    topLeverDomain = N_TO_S[topLeverItem.domain];
  }
  
  const bankTopLeverLabel = (BANK.domains as any)[topLeverDomain].levers[k(topLever)]?.label ?? 'Signal';

  const hParts = (BANK.rendering.headline as string[]).map(line =>
    replaceTokens(line, { top_domain: bankTopDomainName, second_domain: bankSecondDomainName, top_lever: bankTopLeverLabel })
  );
  const headline = hParts.join(' ');

  // Body lines (granular, with context markers) — kept for compatibility
  const bodyLines: string[] = [];
  const seenDomain = new Set<DomainKey>();
  for (const it of items) {
    const bankDomain = N_TO_S[it.domain];
    const opener = (BANK.context_markers as any)[it.cls] as string;
    const leverText = (BANK.domains as any)[bankDomain].levers[it.leverKey][it.bucket] as string;
    bodyLines.push(`${opener} ${leverText}`);
    if (!seenDomain.has(it.domain)) {
      seenDomain.add(it.domain);
      const mean = means[it.domain];
      const b = toSummaryBucketLetter(mean);
      const domainSummary = (BANK.domains as any)[bankDomain].summary[b] as string;
      bodyLines.push(domainSummary);
    }
  }

  // FIX 4: Clean paragraphs with correct domain text rules
  // - For each lever in Phase-1, print only its H/M/L line
  // - After finishing a domain, print exactly one domain summary based on mean
  // - Never append the Plus tagline to a domain summary
  const domainToItems = new Map<DomainKey, DisplayItem[]>();
  for (const it of items) {
    if (!domainToItems.has(it.domain)) domainToItems.set(it.domain, []);
    domainToItems.get(it.domain)!.push(it);
  }
  const cleanParagraphs: string[] = [];
  for (const d of (['O','C','E','A','N'] as DomainKey[])) {
    const list = domainToItems.get(d);
    if (!list || list.length === 0) continue;
    const bankDomain = N_TO_S[d];
    const added = new Set<string>();
    const lines: string[] = [];

    // Print lever sentences for each Phase-1 lever (dedup by lever key)
    for (const it of list) {
      const normalizedKey = k(it.leverKey);
      if (added.has(normalizedKey)) continue;
      added.add(normalizedKey);
      const text = (BANK.domains as any)[bankDomain].levers[normalizedKey]?.[it.bucket] as string | undefined;
      if (text && text.trim()) lines.push(text.trim());
    }

    // Domain summary based on mean (exactly one)
    const mean = means[d];
    const b = toSummaryBucketLetter(mean);
    const domainSummary = (BANK.domains as any)[bankDomain].summary[b] as string;
    if (domainSummary && domainSummary.trim()) lines.push(domainSummary.trim());

    if (lines.length > 0) {
      cleanParagraphs.push(lines.join(' '));
    }
  }

  // Verdict (using normalized keys)
  const strongest = items.slice().sort((a,b)=> (b.raw - a.raw) || byDomainOrder(a,b))[0];
  const effortful = items.slice().sort((a,b)=> (a.raw - b.raw) || byDomainOrder(a,b))[0];
  const cleanDomain = (['O','C','E','A','N'] as DomainKey[])
    .map(d => ({ d, dist: Math.abs((means[d] ?? 3.0) - 3.0) }))
    .sort((a,b)=> (b.dist - a.dist) || DOMAIN_ORDER_BANK.indexOf(N_TO_S[a.d]) - DOMAIN_ORDER_BANK.indexOf(N_TO_S[b.d]))[0].d;
  const strongestLabel = strongest ? (BANK.domains as any)[N_TO_S[strongest.domain]].levers[k(strongest.leverKey)]?.label ?? 'Signal' : 'Signal';
  const cleanDomainName = (BANK.domains as any)[N_TO_S[cleanDomain]].name as string;
  const effortfulLabel = effortful ? (BANK.domains as any)[N_TO_S[effortful.domain]].levers[k(effortful.leverKey)]?.label ?? 'Lever' : 'Lever';
  const verdict = replaceTokens(BANK.rendering.verdict_template as string, {
    strongest_lever: strongestLabel,
    clean_domain: cleanDomainName,
    effortful_lever: effortfulLabel,
    code: String(checksum).slice(0,8)
  });

  // Upsell (using normalized keys)
  const upsellLines: string[] = [];
  // conditions
  const hasResolver = items.some(i => i.cls === 'resolver');
  const nearMid = items.find(i => i.raw >= 2.60 && i.raw <= 3.60);
  
  // Get domains sorted by mean for top two (not from Phase-1 order)
  const { first: upsellTopDomain, second: upsellSecondDomain } = topDomainsByMean(fullResults, items);
  const meansForUpsell = computeDomainMeans(fullResults);
  const topTwoOpposite = (
    ((meansForUpsell[upsellTopDomain === 'S' ? 'N' : upsellTopDomain as DomainKey] >= 3.8) && 
     (meansForUpsell[upsellSecondDomain === 'S' ? 'N' : upsellSecondDomain as DomainKey] <= 2.2)) ||
    ((meansForUpsell[upsellSecondDomain === 'S' ? 'N' : upsellSecondDomain as DomainKey] >= 3.8) && 
     (meansForUpsell[upsellTopDomain === 'S' ? 'N' : upsellTopDomain as DomainKey] <= 2.2))
  );
  const liberalismHigh = items.some(i => i.domain==='O' && k(i.leverKey)==='liberalism' && i.bucket==='H');
  const cautiousHigh = items.some(i => i.domain==='C' && k(i.leverKey)==='cautiousness' && i.bucket==='H');

  const precisionCond = hasResolver || Boolean(nearMid);
  const habitCond = items.some(i => 
    i.domain==='C' && 
    (k(i.leverKey)==='self_discipline' || k(i.leverKey)==='achievement_striving' || k(i.leverKey)==='orderliness') && 
    i.bucket==='L'
  );
  const pairCond = topTwoOpposite || (liberalismHigh && cautiousHigh);

  const catalog = (BANK.addons as any).catalog as Array<any>;
  const renderText = (BANK.addons as any).render_text as any;

  function titleFor(addon: any): string {
    const tokens: Record<string,string> = {};
    if (addon.id === 'precision_card') {
      const target = items.find(i=> i.cls==='resolver') ?? nearMid ?? items[0];
      const label = target ? (BANK.domains as any)[N_TO_S[target.domain]].levers[k(target.leverKey)]?.label ?? 'Signal' : 'Signal';
      tokens['lever'] = label;
    }
    if (addon.id === 'pair_dynamics') {
      tokens['top_domain'] = bankTopDomainName;
      tokens['second_domain'] = bankSecondDomainName;
    }
    return replaceTokens(addon.title as string, tokens);
  }

  function reasonFor(addon: any): string {
    let reason = addon.not_needed_because as string;
    if (addon.id === 'precision_card') {
      const strongestItem = items.slice().sort((a,b)=> (b.raw - a.raw) || byDomainOrder(a,b))[0];
      const label = strongestItem ? (BANK.domains as any)[N_TO_S[strongestItem.domain]].levers[k(strongestItem.leverKey)]?.label ?? 'Signal' : 'Signal';
      reason = replaceTokens(reason, { lever: label });
    }
    return reason;
  }

  // pick chosen by deterministic order
  let chosenId: string;
  if (precisionCond) chosenId = 'precision_card';
  else if (habitCond) chosenId = 'habit_builder';
  else chosenId = 'pair_dynamics';

  for (const addon of catalog) {
    const t = titleFor(addon);
    if (addon.id === chosenId) {
      upsellLines.push(replaceTokens(renderText.recommend as string, { title: t }));
    } else {
      upsellLines.push(replaceTokens(renderText.reject as string, { title: t, reason: reasonFor(addon) }));
    }
  }

  return { headline, bodyLines, verdict, upsellLines, cleanParagraphs };
}


