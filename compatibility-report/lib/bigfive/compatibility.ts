import { DOMAIN_WEIGHTS, SYNERGY_THRESHOLDS, OVERALL_SCORE_BANDS } from './compatibility_config';
import type { GZProfile } from './types';
import { OVERRIDES, ROUTINES, SCENARIOS } from './prescriptions';

// Scoring rules (deterministic)

export function calculateDomainCompatScore(a_raw: number, b_raw: number): number {
  const score = 100 - (Math.abs(a_raw - b_raw) / 4) * 100;
  return Math.max(0, Math.min(100, score));
}

export function getSynergyLabel(delta: number, domain: string): string {
  const absDelta = Math.abs(delta);
  if (domain === 'N' && absDelta >= 0.8 && absDelta <= 1.2) {
    return 'Watch';
  }
  if (absDelta <= SYNERGY_THRESHOLDS.align) {
    return 'Align';
  }
  if (absDelta <= SYNERGY_THRESHOLDS.complement) {
    return 'Complement';
  }
  return 'Tension';
}

export function generatePrescriptions(compatData: any) {
  const prescriptions = {
    overrides: new Set(),
    routines: new Set(),
    scenarios: {
      work: new Set(),
      relationship: new Set(),
    },
  };

  const { domains, facets } = compatData;

  // Domain-based triggers
  if (domains.E?.synergy === 'Tension') {
    prescriptions.overrides.add(OVERRIDES.BOUNDARY_PROTOCOL);
    SCENARIOS.relationship.forEach(s => prescriptions.scenarios.relationship.add(s.guardrail));
  }
  if (domains.N?.synergy === 'Tension' || domains.N?.synergy === 'Watch') {
    prescriptions.overrides.add(OVERRIDES.STRESS_RESET);
  }
  if (domains.C?.synergy === 'Tension') {
    prescriptions.routines.add(ROUTINES.CADENCE_CONTRACT);
    prescriptions.routines.add(ROUTINES.DECISION_SLA);
    SCENARIOS.work.forEach(s => prescriptions.scenarios.work.add(s.guardrail));
  }
  if (domains.A?.synergy === 'Tension') {
      prescriptions.overrides.add(OVERRIDES.BOUNDARY_PROTOCOL);
  }

  // Facet-based triggers
  if (facets.conflict_pairs.some((p: any) => p.facet === 'A:Modesty')) {
    prescriptions.overrides.add(OVERRIDES.BOUNDARY_PROTOCOL);
  }

  return {
    overrides: Array.from(prescriptions.overrides),
    routines: Array.from(prescriptions.routines),
    scenarios: {
      work: Array.from(prescriptions.scenarios.work),
      relationship: Array.from(prescriptions.scenarios.relationship),
    },
  };
}

export function calculateOverallScore(domainScores: Record<string, { score_pct: number }>): { score: number, band: string } {
  const weightedSum = Object.entries(domainScores).reduce((acc, [domain, { score_pct }]) => {
    const weight = (DOMAIN_WEIGHTS as any)[domain as keyof typeof DOMAIN_WEIGHTS] || 1;
    return acc + score_pct * weight;
  }, 0);

  const totalWeight = Object.values(DOMAIN_WEIGHTS).reduce((acc, weight) => acc + weight, 0);
  const score = Math.round(weightedSum / totalWeight);

  let band = 'Caution';
  if (score >= OVERALL_SCORE_BANDS.strong) {
    band = 'Strong';
  } else if (score >= OVERALL_SCORE_BANDS.moderate) {
    band = 'Moderate';
  }

  return { score, band };
}

export function analyzeFacetPairs(a: GZProfile, b: GZProfile) {
  const align_pairs: any[] = [];
  const conflict_pairs: any[] = [];

  const HIGH_THRESHOLD = 4;
  const LOW_THRESHOLD = 2;

  const allFacetKeys = new Set([...Object.keys(a.facets), ...Object.keys(b.facets)]);

  for (const facetKey of allFacetKeys) {
    const a_score = a.facets[facetKey];
    const b_score = b.facets[facetKey];

    if (a_score === undefined || b_score === undefined) continue;

    const a_is_high = a_score >= HIGH_THRESHOLD;
    const b_is_high = b_score >= HIGH_THRESHOLD;
    const a_is_low = a_score <= LOW_THRESHOLD;
    const b_is_low = b_score <= LOW_THRESHOLD;

    if ((a_is_high && b_is_high) || (a_is_low && b_is_low)) {
      align_pairs.push({
        facet: facetKey,
        a: a_score,
        b: b_score,
        impact: "shared trait", // Placeholder
      });
    } else if ((a_is_high && b_is_low) || (a_is_low && b_is_high)) {
      conflict_pairs.push({
        facet: facetKey,
        a: a_score,
        b: b_score,
        risk: "potential friction", // Placeholder
      });
    }
  }

  // TODO: Implement top_levers logic
  return {
    align_pairs,
    conflict_pairs,
    top_levers: [],
  };
}

export function computeCompatibility(a: GZProfile, b: GZProfile) {
  const compat = {
    overall: {
      score_pct: 0,
      band: '',
      rationale: [] as string[],
    },
    domains: {} as any,
    facets: {} as any,
  };

  const domainScores: Record<string, { score_pct: number }> = {};

  for (const domain of ['O', 'C', 'E', 'A', 'N']) {
    const a_domain = a.domains[domain as keyof typeof a.domains];
    const b_domain = b.domains[domain as keyof typeof b.domains];
    if (a_domain && b_domain) {
      const delta = b_domain.raw - a_domain.raw;
      const score_pct = calculateDomainCompatScore(a_domain.raw, b_domain.raw);
      const synergy = getSynergyLabel(delta, domain);
      
      compat.domains[domain] = {
        a_raw: a_domain.raw,
        b_raw: b_domain.raw,
        delta: delta,
        synergy: synergy,
        score_pct: score_pct,
        notes: [], // TODO: Add notes logic
      };
      domainScores[domain] = { score_pct };
    }
  }
  
  const overall = calculateOverallScore(domainScores);
  compat.overall.score_pct = overall.score;
  compat.overall.band = overall.band;
  
  // Rationale based on synergy
  const rationale: string[] = [];
  const domainSynergies = Object.entries(compat.domains).map(([domain, data]) => ({domain, ...data as any}));
  domainSynergies.sort((x, y) => y.score_pct - x.score_pct);

  for (const item of domainSynergies.slice(0, 3)) {
    if (item.synergy === 'Align') rationale.push(`High ${item.domain} alignment`);
    if (item.synergy === 'Complement') rationale.push(`Complementary ${item.domain}`);
    if (item.synergy === 'Tension') rationale.push(`Manage ${item.domain} mismatch`);
  }
  compat.overall.rationale = rationale;


  compat.facets = analyzeFacetPairs(a, b);
  const prescriptions = generatePrescriptions(compat);

  return { compat, prescriptions };
}

export function buildPairNarrative(meansA: any, meansB: any, notes: string[]): string {
  if (!meansA || !meansB) return '';
  
  const narratives = [];
  
  // Generate narrative based on domain differences
  const domains = ['O', 'C', 'E', 'A', 'N'];
  for (const domain of domains) {
    const aScore = meansA[domain];
    const bScore = meansB[domain];
    
    if (aScore !== undefined && bScore !== undefined) {
      const diff = Math.abs(aScore - bScore);
      if (diff > 1.5) {
        narratives.push(`${domain} shows significant difference (${aScore.toFixed(1)} vs ${bScore.toFixed(1)})`);
      }
    }
  }
  
  // Add notes if available
  if (notes && notes.length > 0) {
    narratives.push(...notes.slice(0, 2)); // Limit to first 2 notes
  }
  
  return narratives.join('. ') + (narratives.length > 0 ? '.' : '');
}


