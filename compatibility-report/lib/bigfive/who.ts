import { DOMAINS, canonicalFacets, FACET_INTERPRETATIONS, DomainKey } from "./constants";
import { getFacetScoreLevel, stableStringify } from "./format";
import { buildDeterministicWhoView, DeterministicWhoView } from "./who_bank_renderer";
import { sha256 } from "@/lib/crypto/sha256";
import narrativeVariants from "@/lib/data/narrative_variants.json";

export type CardChoice = 'Compatibility' | 'Versus';
export type FacetState = 'High' | 'Medium' | 'Low';
export type Tone = 'neutral'|'alpha'|'warm'|'calm'|'technical';

export type WhoDerived = {
  polarity: number;
  stabilityMean: number;            // Stability = 6 - Neuroticism mean
  stabilityFlag: boolean;           // Stability >= 3.5 or <= 2.5
  lowestDomainMean: number;         // raw min across O,C,E,A,N (kept for transparency)
  lowsCount: number;                // raw Low count (N-Low counted as Low for telemetry)
  domainMeans: Record<DomainKey, number>;
};

export type WhoAudit = {
  checksum: string;                 // sha256 of canonical payload and rule version
  ruleVersion: string;
  // Added: attest run → who binding
  runHash?: string;                 // 24-char RID-style hash of normalized run payload
  attestation?: string;             // sha256 of { whoChecksum, runHash, versions }
};

export type WhoExport = {
  version: string;
  runId: string | null;
  states: Record<DomainKey, Record<string, FacetState>>;
  raw: Record<DomainKey, Record<string, number>>; // 1-5
  derived: WhoDerived;
  chosen: { card: CardChoice; reasons: string[] };
  narrative: string[];              // 6-10 sentences
  tone: Tone;                       // unified tone for narrative and panels
  lists?: { strengths: string[]; risks: string[]; mediums: string[] };
  listSentences?: { strengths: string[]; risks: string[]; mediums: string[] };
  deterministic?: DeterministicWhoView;
  upsellRec?: { id: 'override'|'compare'|'versus'; title: string; why: string; whyDetailed: string; rejects: string[] };
  audit: WhoAudit;
};

export const WHO_ENGINE_VERSION = "who-engine-0.2.0" as const;
export const WHO_RULE_VERSION  = "who-rule-0.1.0"  as const;

const DOMAIN_TIE_ORDER: DomainKey[] = ['O', 'C', 'E', 'A', 'N']; // S ~ N (Stability = 6 - N)

/* ---------- helpers ---------- */

function mapBucketFromRaw(raw: number): FacetState {
  const lvl = getFacetScoreLevel(raw);
  if (lvl === 'high') return 'High';
  if (lvl === 'low')  return 'Low';
  return 'Medium';
}

function safeFirstNSentences(text: string, n: number): string {
  const parts = (text || '').split(/(?<=\.)\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.slice(0, Math.max(1, Math.min(n, parts.length))).join(' ');
}

function computeDomainMeans(rawByDomain: Record<DomainKey, Record<string, number>>): Record<DomainKey, number> {
  const means: Record<DomainKey, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  for (const d of DOMAIN_TIE_ORDER) {
    const vals = canonicalFacets(d).map(f => rawByDomain[d][f]);
    const mean = vals.reduce((a,b)=> a + (b||0), 0) / vals.length;
    means[d] = Number.isFinite(mean) ? mean : 0;
  }
  return means;
}

function rankAllFacets(
  rawByDomain: Record<DomainKey, Record<string, number>>
): Array<{domain: DomainKey; facet: string; raw: number; distance: number}> {
  const all: Array<{domain: DomainKey; facet: string; raw: number; distance: number}> = [];
  for (const d of DOMAIN_TIE_ORDER) {
    for (const f of canonicalFacets(d)) {
      const raw = rawByDomain[d][f];
      const distance = Math.abs((raw || 0) - 3.0);
      all.push({ domain: d, facet: f, raw, distance });
    }
  }
  return all.sort((a,b)=>{
    if (b.distance !== a.distance) return b.distance - a.distance;
    if (a.domain !== b.domain)     return DOMAIN_TIE_ORDER.indexOf(a.domain) - DOMAIN_TIE_ORDER.indexOf(b.domain);
    const facA = canonicalFacets(a.domain);
    return facA.indexOf(a.facet) - facA.indexOf(b.facet);
  });
}

// raw Low counter (telemetry only)
function countLows(states: Record<DomainKey, Record<string, FacetState>>): number {
  let c = 0;
  for (const d of DOMAIN_TIE_ORDER) {
    for (const f of canonicalFacets(d)) if (states[d][f] === 'Low') c++;
  }
  return c;
}

// effective Low count for decisions (invert N: N-High counts as "low-risk")
function countEffectiveLows(states: Record<DomainKey, Record<string, FacetState>>): number {
  let c = 0;
  for (const d of ['O','C','E','A'] as DomainKey[]) {
    for (const f of canonicalFacets(d)) if (states[d][f] === 'Low') c++;
  }
  for (const f of canonicalFacets('N')) if (states.N[f] === 'High') c++;
  return c;
}

// labeling for strengths/risks/mediums lists
function labelForList(domain: DomainKey, facet: string, state: FacetState): string {
  const tag = DOMAINS[domain].label.split(' ')[0]; // "Openness", "Conscientiousness", ...
  if (domain === 'N') {
    if (state === 'Low')  return `low ${facet.toLowerCase()} (Neuroticism)`;
    if (state === 'High') return `high ${facet.toLowerCase()} (Neuroticism)`;
    return `${facet.toLowerCase()} (Neuroticism)`;
  }
  return `${facet.toLowerCase()} (${tag})`;
}

/* ---------- card picker ---------- */

function pickCard(
  derived: WhoDerived,
  states: Record<DomainKey, Record<string, FacetState>>
): { card: CardChoice; reasons: string[] } {
  // Compatibility when interpersonal signals drive outcomes or social style is a key axis
  const Ehigh = derived.domainMeans.E >= 4.0;
  const Elow  = derived.domainMeans.E <= 2.0;
  const Ahigh = derived.domainMeans.A >= 4.0;
  const Alow  = derived.domainMeans.A <= 2.0;
  if (Ehigh && Alow) return { card: 'Compatibility', reasons: ['SOCIAL_OPPOSITION_E_HIGH_A_LOW'] };
  if (Ahigh && Elow) return { card: 'Compatibility', reasons: ['SOCIAL_OPPOSITION_A_HIGH_E_LOW'] };
  if (derived.polarity <= 0.8) {
    let socialHighs = 0;
    for (const f of canonicalFacets('E')) if (states.E[f] === 'High') socialHighs++;
    for (const f of canonicalFacets('A')) if (states.A[f] === 'High') socialHighs++;
    if (socialHighs >= 4) return { card: 'Compatibility', reasons: ['LOW_POLARITY_WITH_SOCIAL_HIGHS'] };
  }
  // Otherwise Versus (clarify tensions and gaps)
  return { card: 'Versus', reasons: ['DEFAULT_VERSUS'] };
}

/* ---------- narrative ---------- */

function buildNarrative(
  states: Record<DomainKey, Record<string, FacetState>>,
  rawByDomain: Record<DomainKey, Record<string, number>>,
  tone: Tone
): string[] {
  const ranked       = rankAllFacets(rawByDomain);
  const domainMeans  = computeDomainMeans(rawByDomain);
  const highestMean  = Math.max(domainMeans.O, domainMeans.C, domainMeans.E, domainMeans.A, domainMeans.N);
  const lowestMean   = Math.min(domainMeans.O, domainMeans.C, domainMeans.E, domainMeans.A, domainMeans.N);
  const polarity     = highestMean - lowestMean;
  const stabilityMean= 6 - domainMeans.N;

  const sentences: string[] = [];

  // Opening synthesis (tone variants when available)
  const V: any = narrativeVariants as any;
  const openingId = polarity >= 1.0 ? 'polarity_high' : 'polarity_balanced';
  const defaultOpening = polarity >= 1.0
    ? 'You move through life with sharp contrasts. At your best, you bring strong fuel where it counts; at your weak points, you under-invest where structure and patience are needed.'
    : 'You move through life with measured balance. You can bring strengths forward without overplaying them, and your softer spots rarely dominate.';
  const openingVar = V?.opening?.[openingId]?.[tone];
  sentences.push(openingVar || defaultOpening);

  if (stabilityMean >= 3.5) {
    const defaultStab = 'Under stress you stay composed and steady; pressure rarely knocks you off course.';
    const stabVar = V?.stability?.high?.[tone];
    sentences.push(stabVar || defaultStab);
  } else if (stabilityMean <= 2.5) {
    const defaultStab = 'Under stress you can feel destabilized; spikes can pull you off your usual rhythm.';
    const stabVar = V?.stability?.low?.[tone];
    sentences.push(stabVar || defaultStab);
  }
  // No user-facing "Polarity X − Y = Z" sentence (kept in export only)

  // Domain snapshots — brief, behavior-first summaries
  const tag = (d: DomainKey) => DOMAINS[d].label.split(' ')[0];
  for (const d of ['O','C','E','A','N'] as DomainKey[]) {
    const name = tag(d);
    const mean = domainMeans[d];
    const highCut = d === 'C' ? 3.8 : 4.0;
    const lowCut  = d === 'C' ? 2.2 : 2.0;
    const lvl = mean >= highCut ? 'high' : mean <= lowCut ? 'low' : 'medium';
    let defaultLine: string;
    if (d === 'O') {
      if (lvl === 'high') defaultLine = `Your ${name} is pronounced; you actively seek novelty, ideas, and change.`;
      else if (lvl === 'low') defaultLine = `Your ${name} is modest; you prefer proven methods and concrete, workable plans.`;
      else defaultLine = `Your ${name} is balanced; you mix fresh thinking with practical judgment.`;
    } else if (d === 'C') {
      if (lvl === 'high') defaultLine = `Your ${name} is strong; structure, follow-through, and reliability are central to how you operate.`;
      else if (lvl === 'low') defaultLine = `Your ${name} is light; you move flexibly, dislike tight constraints, and work best with autonomy.`;
      else defaultLine = `Your ${name} is steady; you organize when it matters and keep room for flow.`;
    } else if (d === 'E') {
      if (lvl === 'high') defaultLine = `Your ${name} is high; you draw energy from people, pace, and visible momentum.`;
      else if (lvl === 'low') defaultLine = `Your ${name} is low; you conserve energy, prefer depth over crowds, and choose focused settings.`;
      else defaultLine = `Your ${name} is moderate; you can engage widely or work quietly as needed.`;
    } else if (d === 'A') {
      if (lvl === 'high') defaultLine = `Your ${name} is high; you lean toward harmony, good faith, and collaborative moves.`;
      else if (lvl === 'low') defaultLine = `Your ${name} is low; you prioritize candor and self-direction over smoothing edges.`;
      else defaultLine = `Your ${name} is balanced; you can cooperate without losing your stance.`;
    } else { // N
      if (lvl === 'high') defaultLine = `Your ${name} runs high; feelings arrive fast and strong, and stress can bite quickly.`;
      else if (lvl === 'low') defaultLine = `Your ${name} runs low; you keep an even keel and recover quickly under pressure.`;
      else {
        const highFacets = canonicalFacets('N').filter(f => states.N[f] === 'High');
        if (highFacets.length > 0) {
          defaultLine = `Your ${name} is mid-range, with highs in ${highFacets.join('/')}, so signals register without always taking the wheel.`;
        } else {
          defaultLine = `Your ${name} is mid-range; emotions register, but rarely take the wheel.`;
        }
      }
    }
    const varLine = V?.domain?.[d]?.[lvl]?.[tone];
    sentences.push(varLine || defaultLine);
  }

  // Interpersonal style (E × A)
  const Ehigh = domainMeans.E >= 4.0, Elow = domainMeans.E <= 2.0;
  const Ahigh = domainMeans.A >= 4.0, Alow = domainMeans.A <= 2.0;
  let interpersonalKey: string;
  if (Ehigh && Ahigh) interpersonalKey = 'warm_energizing';
  else if (Ehigh && Alow) interpersonalKey = 'forceful_independent';
  else if (Elow && Ahigh) interpersonalKey = 'calm_considerate';
  else if (Elow && Alow) interpersonalKey = 'autonomous_direct';
  else interpersonalKey = 'adaptive_balanced';
  const interpersonalDefault = (
    interpersonalKey === 'warm_energizing' ? 'Interpersonally you come across as warm and energizing—quick to include, quick to encourage.' :
    interpersonalKey === 'forceful_independent' ? 'Interpersonally you read as forceful and independent—comfortable taking the mic and stating hard truths.' :
    interpersonalKey === 'calm_considerate' ? 'Interpersonally you are calm and considerate—selective with attention, easy to be around.' :
    interpersonalKey === 'autonomous_direct' ? 'Interpersonally you favor autonomy and directness—reserved, self-contained, and succinct.' :
    'Interpersonally you adapt—able to be visible when needed and quieter when depth matters.'
  );
  const interpersonalVar = V?.interpersonal?.[interpersonalKey]?.[tone];
  sentences.push(interpersonalVar || interpersonalDefault);

  // Work style (C facets)
  const cHigh = (f: string) => states.C[f] === 'High';
  const cLow  = (f: string) => states.C[f] === 'Low';
  let workKey: string;
  if (cHigh('Self-Discipline') || cHigh('Orderliness') || domainMeans.C >= 3.8) workKey = 'dependable_systems';
  else if (cLow('Orderliness') || domainMeans.C <= 2.2) workKey = 'flexible_lanes';
  else workKey = 'balanced';
  const workDefault = (
    workKey === 'dependable_systems' ? (
      cHigh('Cautiousness') ? 'At work you build dependable systems, maintain pace through friction, and you weigh risks carefully.'
                             : 'At work you build dependable systems, maintain pace through friction, and you move once essentials are set.'
    ) : workKey === 'flexible_lanes' ? (
      (cHigh('Achievement-Striving') ? 'At work you avoid rigid structure, preferring flexible lanes and just-in-time organization. You still push when goals excite you.'
                                     : 'At work you avoid rigid structure, preferring flexible lanes and just-in-time organization. You protect room for spontaneity.')
    ) : 'At work you balance plans with motion—enough structure to finish, enough flexibility to iterate.'
  );
  const workVar = V?.work_style?.[workKey]?.[tone];
  sentences.push(workVar || workDefault);

  // Decision-making (O:Intellect/Liberalism × C:Cautiousness)
  const oIntHigh = states.O['Intellect'] === 'High';
  const oLibHigh = states.O['Liberalism'] === 'High';
  const cCautHigh= states.C['Cautiousness'] === 'High';
  let decisionKey: string | null = null;
  if (oIntHigh && cCautHigh) decisionKey = 'models_and_boundaries';
  else if (oIntHigh && !cCautHigh) decisionKey = 'principles_and_experiments';
  else if (oLibHigh && cCautHigh) decisionKey = 'challenge_with_safeguards';
  else if (oLibHigh) decisionKey = 'challenge_defaults';
  else if (cCautHigh) decisionKey = 'measured_steps';
  if (decisionKey) {
    const decisionDefault = (
      decisionKey === 'models_and_boundaries' ? 'In decisions you analyze models and downside, then commit with clear boundaries.' :
      decisionKey === 'principles_and_experiments' ? 'In decisions you reason quickly from principles and run fast experiments.' :
      decisionKey === 'challenge_with_safeguards' ? 'In decisions you challenge defaults, but proceed deliberately with safeguards.' :
      decisionKey === 'challenge_defaults' ? 'In decisions you question conventions and open new options others miss.' :
      'In decisions you prefer measured steps, factoring risk and second-order effects.'
    );
    const decisionVar = V?.decision_style?.[decisionKey]?.[tone];
    sentences.push(decisionVar || decisionDefault);
  }

  // Stress pattern (N facets)
  const nHigh = (f: string) => states.N[f] === 'High';
  const stressBits: string[] = [];
  if (nHigh('Anxiety')) stressBits.push('worry signals fire early');
  if (nHigh('Anger')) stressBits.push('frustration spikes at blockers');
  if (nHigh('Vulnerability')) stressBits.push('overload can freeze progress');
  if (nHigh('Depression')) stressBits.push('mood can dip and dim drive');
  if (nHigh('Self-Consciousness')) stressBits.push('self-judgment gets loud');
  if (nHigh('Immoderation')) stressBits.push('quick relief can tempt');
  if (stressBits.length) {
    sentences.push(`Under strain ${stressBits.slice(0,3).join(', ')}.`);
  }

  // Top 3 facets → up to 6 sentences total (2 max per facet template)
  const top = ranked.slice(0, 3);
  for (const item of top) {
    const levelKey = states[item.domain][item.facet].toLowerCase() as 'high'|'medium'|'low';
    const interp = (FACET_INTERPRETATIONS as any)[item.domain][item.facet][levelKey] as string;
    sentences.push(safeFirstNSentences(interp, 2));
  }

  // Strengths = High in O/C/E/A + Low in N
  const strengths = ranked
    .filter(r => (r.domain !== 'N' && states[r.domain][r.facet] === 'High') || (r.domain === 'N' && states[r.domain][r.facet] === 'Low'))
    .map(r => labelForList(r.domain, r.facet, states[r.domain][r.facet]));

  // Risks = Low in O/C/E/A + High in N
  const risks = ranked
    .filter(r => (r.domain !== 'N' && states[r.domain][r.facet] === 'Low') || (r.domain === 'N' && states[r.domain][r.facet] === 'High'))
    .map(r => labelForList(r.domain, r.facet, states[r.domain][r.facet]));

  // Mediums (neutral list; N not inverted here)
  const mediums = ranked
    .filter(r => states[r.domain][r.facet] === 'Medium')
    .map(r => labelForList(r.domain, r.facet, 'Medium'));

  // Build descriptive strengths clause using facet templates (top 3)
  function toClause(text: string): string {
    let t = safeFirstNSentences(text, 1).trim();
    if (t.startsWith('You ')) t = t.slice(4);
    if (t.endsWith('.')) t = t.slice(0, -1);
    if (t.length && t[0] === t[0].toUpperCase()) t = t[0].toLowerCase() + t.slice(1);
    return t;
  }
  const strengthItems = ranked.filter(r => (r.domain !== 'N' && states[r.domain][r.facet] === 'High') || (r.domain === 'N' && states[r.domain][r.facet] === 'Low'));
  const topStrengths = strengthItems.slice(0, 3).map(item => {
    const levelKey = (item.domain === 'N' ? 'low' : 'high') as 'high'|'low';
    const interp = (FACET_INTERPRETATIONS as any)[item.domain][item.facet][levelKey] as string;
    return toClause(interp);
  });

  // Do not emit headings in narrative; lists are rendered separately in UI

  // Attach lists to payload via return (set later)

  return sentences.slice(0, 14);
}

/* ---------- main ---------- */

export async function buildWhoFromFullResults(
  fullResults: Array<{domain: DomainKey; payload: any}>,
  suiteHash: string | null
): Promise<WhoExport> {
  // Extract raw per-facet and final buckets
  const rawByDomain: Record<DomainKey, Record<string, number>>   = { O: {}, C: {}, E: {}, A: {}, N: {} } as any;
  const states:      Record<DomainKey, Record<string, FacetState>>= { O: {}, C: {}, E: {}, A: {}, N: {} } as any;

  for (const d of DOMAIN_TIE_ORDER) {
    const r = fullResults.find(x => x.domain === d);
    const facets = canonicalFacets(d);
    for (const f of facets) {
      const raw = r?.payload?.phase2?.A_raw?.[f];
      rawByDomain[d][f] = typeof raw === 'number' ? raw : 3.0;

      // Prefer provided final bucket if present
      const bucket = r?.payload?.final?.bucket?.[f];
      states[d][f] = (bucket === 'High' || bucket === 'Medium' || bucket === 'Low')
        ? bucket
        : mapBucketFromRaw(rawByDomain[d][f]);
    }
  }

  const domainMeans       = computeDomainMeans(rawByDomain);
  const highestMean       = Math.max(domainMeans.O, domainMeans.C, domainMeans.E, domainMeans.A, domainMeans.N);
  const lowestMean        = Math.min(domainMeans.O, domainMeans.C, domainMeans.E, domainMeans.A, domainMeans.N);
  const polarity          = highestMean - lowestMean;
  const stabilityMean     = 6 - domainMeans.N;
  const stabilityFlag     = stabilityMean >= 3.5 || stabilityMean <= 2.5;
  const lowestDomainMean  = lowestMean;         // raw min across O,C,E,A,N (export only)
  const lowsCount         = countLows(states);  // raw low count (export only)

  const derived: WhoDerived = { polarity, stabilityMean, stabilityFlag, lowestDomainMean, lowsCount, domainMeans };
  const chosen   = pickCard(derived, states);

  // Infer tone using same logic as page.tsx
  const inferTone = (): Tone => {
    // Interpersonal key (E×A)
    const Ehigh = domainMeans.E >= 4.0, Elow = domainMeans.E <= 2.0;
    const Ahigh = domainMeans.A >= 4.0, Alow = domainMeans.A <= 2.0;
    let interpersonalKey: string;
    if (Ehigh && Ahigh) interpersonalKey = 'warm_energizing';
    else if (Ehigh && Alow) interpersonalKey = 'forceful_independent';
    else if (Elow && Ahigh) interpersonalKey = 'calm_considerate';
    else if (Elow && Alow) interpersonalKey = 'autonomous_direct';
    else interpersonalKey = 'adaptive_balanced';

    // Tone inference
    if (interpersonalKey === 'forceful_independent' || states.E?.['Assertiveness'] === 'High') return 'alpha';
    if (interpersonalKey === 'warm_energizing') return 'warm';
    if (interpersonalKey === 'calm_considerate') return 'calm';
    if (states.O?.['Intellect'] === 'High' || states.C?.['Cautiousness'] === 'High') return 'technical';
    return 'neutral';
  };
  const tone = inferTone();

  const narrative = buildNarrative(states, rawByDomain, tone);

  // Build lists for UI rendering (headline + bullet list)
  const rankedAll = rankAllFacets(rawByDomain);
  // Strengths: cap Conscientiousness levers to 3–4 core items; prefer Self-Efficacy, Orderliness, Self-Discipline, Cautiousness
  const strengthsRaw = rankedAll
    .filter(r => (r.domain !== 'N' && states[r.domain][r.facet] === 'High') || (r.domain === 'N' && states[r.domain][r.facet] === 'Low'));
  const cPreferred = ['Self-Efficacy','Orderliness','Self-Discipline','Cautiousness'];
  const cPicked: any[] = [];
  for (const name of cPreferred){
    const hit = strengthsRaw.find(r => r.domain==='C' && r.facet===name);
    if (hit) cPicked.push(hit);
    if (cPicked.length>=4) break;
  }
  const nonC = strengthsRaw.filter(r => r.domain!=='C');
  const remainderC = strengthsRaw.filter(r => r.domain==='C' && !cPicked.includes(r));
  const cappedC = cPicked.length ? cPicked : remainderC.slice(0,3);
  const strengthsOrdered = nonC.concat(cappedC);
  const listStrengths = strengthsOrdered.map(r => labelForList(r.domain, r.facet, states[r.domain][r.facet]));
  // Risks: block contradictions when N is mixed (~3.0). If domainMeans.N between 2.7–3.3, avoid mixing low and high N items simultaneously.
  const listRisks = rankedAll
    .filter(r => {
      const isN = r.domain === 'N';
      const isLowN = isN && states[r.domain][r.facet] === 'Low';
      const isHighN = isN && states[r.domain][r.facet] === 'High';
      const neutralN = domainMeans.N >= 2.7 && domainMeans.N <= 3.3;
      if (neutralN && isLowN) return false; // don't list N-low when overall N is mid if N-high risks exist
      return (r.domain !== 'N' && states[r.domain][r.facet] === 'Low') || isHighN;
    })
    .map(r => labelForList(r.domain, r.facet, states[r.domain][r.facet]));
  const listMediums = rankedAll
    .filter(r => states[r.domain][r.facet] === 'Medium')
    .map(r => labelForList(r.domain, r.facet, 'Medium'));

  // Convert lists into user-readable single sentences (12–16 words) while avoiding awkward cutoffs
  function facetToSentence(domain: DomainKey, facet: string, state: FacetState): string {
    const lvl: 'high'|'medium'|'low' = (state === 'High' ? 'high' : state === 'Low' ? 'low' : 'medium');
    const interp = (FACET_INTERPRETATIONS as any)[domain]?.[facet]?.[lvl] as string | undefined;
    if (!interp) return labelForList(domain, facet, state);

    // Use only the first sentence as the base for readability
    let base = safeFirstNSentences(interp, 1).trim();
    base = base.replace(/[\u2014\u2013]/g, '—').replace(/\s+/g, ' ').trim();

    const words = base.split(/\s+/).filter(Boolean);
    const maxWords = 16;
    const minWords = 12;
    let take = words.length;
    if (take > maxWords) take = maxWords;
    // If very short, keep as-is; otherwise, trim to target window
    if (take < minWords && words.length >= minWords) take = minWords;

    let chosen = words.slice(0, take);
    // Avoid ending on conjunctions/prepositions
    const badEnd = new Set(['and','or','but','for','to','of','in','on','at','by','with','from','as','than','that','which','because','so','if','while','when','although']);
    while (chosen.length > 0 && badEnd.has(chosen[chosen.length - 1].toLowerCase())) {
      chosen.pop();
    }
    let sentence = chosen.join(' ');
    // Ensure starts capitalized
    if (sentence.length) sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    // Address the reader explicitly
    if (!/^You\b/.test(sentence)) {
      // lower-case first letter then prefix "You "
      if (sentence.length) sentence = sentence.charAt(0).toLowerCase() + sentence.slice(1);
      sentence = 'You ' + sentence;
      // Re-capitalize the very first Y already uppercased; keep rest as-is
    }
    // Ensure terminal punctuation
    if (!/[.!?]$/.test(sentence)) sentence += '.';
    return sentence;
  }
  const sentenceStrengths = rankedAll
    .filter(r => (r.domain !== 'N' && states[r.domain][r.facet] === 'High') || (r.domain === 'N' && states[r.domain][r.facet] === 'Low'))
    .map(r => facetToSentence(r.domain, r.facet, states[r.domain][r.facet]));
  const sentenceRisks = rankedAll
    .filter(r => (r.domain !== 'N' && states[r.domain][r.facet] === 'Low') || (r.domain === 'N' && states[r.domain][r.facet] === 'High'))
    .map(r => facetToSentence(r.domain, r.facet, states[r.domain][r.facet]));
  const sentenceMediums = rankedAll
    .filter(r => states[r.domain][r.facet] === 'Medium')
    .map(r => facetToSentence(r.domain, r.facet, 'Medium'));

  // Build deterministic view using pre-checksum (same fields as final checksum payload)
  const preChecksum = await sha256(stableStringify({
    version: WHO_ENGINE_VERSION,
    runId:   suiteHash || null,
    states,
    raw:     rawByDomain,
    derived,
    chosen,
    narrative,
    ruleVersion: WHO_RULE_VERSION
  }));

  const deterministic = buildDeterministicWhoView(fullResults, preChecksum);

  // Build Phase-1/Phase-2 lever maps for recommendation logic
  type Phase1Mini = { plus: string[]; minus: string[]; resolver: string[] };
  const p1: Phase1Mini = { plus: [], minus: [], resolver: [] };
  const p2: Record<string, number> = {};
  const leverMap: Record<DomainKey, Record<string,string>> = {
    O: { 'Imagination':'imagination','Artistic Interests':'artistic_interests','Emotionality':'emotionality','Adventurousness':'adventurousness','Intellect':'intellect','Liberalism':'liberalism' },
    C: { 'Self-Efficacy':'self_efficacy','Orderliness':'orderliness','Dutifulness':'dutifulness','Achievement-Striving':'achievement_striving','Self-Discipline':'self_discipline','Cautiousness':'cautiousness' },
    E: { 'Friendliness':'friendliness','Gregariousness':'gregariousness','Assertiveness':'assertiveness','Activity Level':'activity_level','Excitement-Seeking':'excitement_seeking','Cheerfulness':'cheerfulness' },
    A: { 'Trust':'trust','Morality':'morality','Altruism':'altruism','Cooperation':'cooperation','Modesty':'modesty','Sympathy':'sympathy' },
    N: { 'Anxiety':'anxiety','Anger':'anger','Depression':'depression','Self-Consciousness':'self_consciousness','Immoderation':'immoderation','Vulnerability':'vulnerability' }
  };
  const domOf: Record<string,'O'|'C'|'E'|'A'|'S'> = {};
  for (const d of ['O','C','E','A','N'] as DomainKey[]) {
    const entry = fullResults.find(x=>x.domain===d);
    const aRaw = entry?.payload?.phase2?.A_raw as Record<string,number> | undefined;
    if (aRaw) {
      for (const f of canonicalFacets(d)) {
        const lever = (leverMap as any)[d][f];
        if (lever) p2[lever] = aRaw[f] ?? 3.0;
        if (lever) domOf[lever] = (d==='N'?'S':d) as any;
      }
    }
    const ph1 = entry?.payload?.phase1 as any;
    if (ph1) {
      for (const f of canonicalFacets(d)) {
        const lever = (leverMap as any)[d][f];
        if (!lever) continue;
        if ((ph1.p?.[f]||0)===1 && (ph1.m?.[f]||0)===0) p1.plus.push(lever);
        if ((ph1.t?.[f]||0)===1) p1.resolver.push(lever);
        if ((ph1.m?.[f]||0)===1) p1.minus.push(lever);
      }
    }
  }

  const H = 3.5, L = 2.5;
  const b = (x:number) => x>=H?'H':x<=L?'L':'M';
  function domainMeansForTouched(){
    const touched = new Set([...p1.plus, ...p1.resolver, ...p1.minus].map(k=> domOf[k]));
    const means: Record<string, number> = {};
    for (const d of Array.from(touched)){
      const ks = [...p1.plus, ...p1.resolver, ...p1.minus].filter(k=> domOf[k]===d && typeof p2[k]==='number');
      const vals = ks.map(k=> p2[k]);
      means[d!] = vals.length ? vals.reduce((a,c)=>a+c,0)/vals.length : NaN;
    }
    return means;
  }
  const meansTouched = domainMeansForTouched();
  const ds = Object.values(meansTouched).filter(v=>!Number.isNaN(v));
  const spread = ds.length ? Math.max(...ds) - Math.min(...ds) : 0;
  const Amean = meansTouched['A'] ?? 3;
  const Emean = meansTouched['E'] ?? 3;
  const Smean = meansTouched['S'] ?? 3;

  const lows = [...p1.plus, ...p1.resolver, ...p1.minus].filter(k => b(p2[k] ?? 3) === 'L');
  const lowLoad = lows.length;
  const csWeakKeys = new Set([
    'self_discipline','achievement_striving','orderliness',
    'anxiety','anger','depression','self_consciousness','immoderation','vulnerability'
  ]);
  const hasCSWeak = [...p1.plus, ...p1.resolver, ...p1.minus].some(k => csWeakKeys.has(k) && b(p2[k] ?? 3) === 'L');
  const assertivenessHigh = b(p2['assertiveness'] ?? 3) === 'H';
  const sympathyLow = b(p2['sympathy'] ?? 3) === 'L';
  const liberalismHigh = b(p2['liberalism'] ?? 3) === 'H';
  const cautiousLow = b(p2['cautiousness'] ?? 3) === 'L';
  const dutyLow = b(p2['dutifulness'] ?? 3) === 'L';
  let friction = 0;
  if (assertivenessHigh && sympathyLow) friction++;
  if (liberalismHigh && (cautiousLow || dutyLow)) friction++;
  if (Amean <= 2.80) friction++;
  if (Emean >= 3.60 && Smean <= 2.80) friction++;

  let upsellRec: { id: 'override'|'compare'|'versus'; title: string; why: string; whyDetailed: string; rejects: string[] };
  if (lowLoad >= 2 || hasCSWeak){
    const lowList = lows.slice(0,6).map(k=> `${k}`).join(', ');
    const csFlags: string[] = [];
    if (b(p2['self_discipline'] ?? 3)==='L') csFlags.push('self-discipline');
    if (b(p2['achievement_striving'] ?? 3)==='L') csFlags.push('achievement');
    if (b(p2['orderliness'] ?? 3)==='L') csFlags.push('orderliness');
    if (b(p2['anxiety'] ?? 3)==='H') csFlags.push('anxiety');
    if (b(p2['anger'] ?? 3)==='H') csFlags.push('anger');
    if (b(p2['depression'] ?? 3)==='H') csFlags.push('depression');
    const whyDetailed = `You need Override now. You carry ${lowLoad} weak levers: ${lowList}. Your control stack shows strain in ${csFlags.join(', ')||'control levers'}. This mix slows finishes and recovery. Convert these levers into small repeatable actions and quick resets until they hold under load. Do this before you compare with anyone.`;
    upsellRec = { id:'override', title:'Override Premium — $7', why:'You carry real load in control levers. Direct fixes beat comparison.', whyDetailed, rejects:[
      'Not needed now: Compatibility. Fix your weak levers first.',
      'Not needed now: You vs Them. Your gaps need action, not contrast.'
    ]};
  } else if (friction >= 2 || spread >= 1.10){
    const reasons: string[] = [];
    if (assertivenessHigh && sympathyLow) reasons.push('assertiveness × sympathy');
    if (liberalismHigh && (cautiousLow || dutyLow)) reasons.push('liberalism × cautiousness/dutifulness');
    if (Amean <= 2.80) reasons.push('low agreeableness');
    if (Emean >= 3.60 && Smean <= 2.80) reasons.push('high extraversion with low stability');
    const whyDetailed = `You need Compatibility now. Your shape predicts friction in pairs: ${reasons.join(', ')||'interpersonal signals'}. Expect heat on handoffs and shared decisions. Map fit, mixed, or tense and get three moves to test. This is about operating with people you actually work or live with.`;
    upsellRec = { id:'compare', title:'Compatibility — 3 cards for $1.50', why:'Your shape predicts friction in pairs. See fit, mixed, or tense and act on it.', whyDetailed, rejects:[
      'Not needed now: You vs Them. A quick bar match hides the friction you need to see.',
      'Not needed now: Override Premium. Your profile is capable; the issue is interaction.'
    ]};
  } else {
    const whyDetailed = 'You need You vs Them now. Your profile is coherent. No heavy weak-lever load. No strong friction markers. Get a clean side-by-side to choose partners, roles, or lanes fast. Use it to confirm biggest gap and strongest sync at a glance.';
    upsellRec = { id:'versus', title:'You vs Them — 3 cards for $1.50', why:'Your profile is coherent. A clean side-by-side will serve you best.', whyDetailed, rejects:[
      'Not needed now: Compatibility. No strong tension markers.',
      'Not needed now: Override Premium. No heavy weak-lever load.'
    ]};
  }

  const base: WhoExport = {
    version: WHO_ENGINE_VERSION,
    runId: suiteHash || null,
    states,
    raw: rawByDomain,
    derived,
    chosen,
    narrative,
    tone,
    lists: { strengths: listStrengths, risks: listRisks, mediums: listMediums },
    listSentences: { strengths: sentenceStrengths, risks: sentenceRisks, mediums: sentenceMediums },
    deterministic,
    upsellRec,
    audit: { checksum: '', ruleVersion: WHO_RULE_VERSION }
  };

  // checksum over canonical JSON (without checksum field)
  const checksum = await sha256(stableStringify({
    version: base.version,
    runId:   base.runId,
    states:  base.states,
    raw:     base.raw,
    derived: base.derived,
    chosen:  base.chosen,
    narrative: base.narrative,
    tone:    base.tone,
    ruleVersion: WHO_RULE_VERSION
  }));
  base.audit.checksum = checksum;

  // Compute a RID-style run hash and a combined attestation tying run→who
  const runHash = (await sha256(stableStringify(fullResults.map(r => ({ domain: r.domain, payload: r.payload }))))).slice(0,24);
  base.audit.runHash = runHash;
  base.audit.attestation = await sha256(stableStringify({
    whoChecksum: base.audit.checksum,
    runHash,
    versions: { who: WHO_ENGINE_VERSION, rule: WHO_RULE_VERSION }
  }));

  return base;
}
