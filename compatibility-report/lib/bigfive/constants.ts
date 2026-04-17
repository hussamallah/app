import { contentLoader, type DomainKey } from '../data/contentLoader';

export type { DomainKey };

export const VERSION = "gz-domainspec-1.3.0" as const;

// Generate DOMAINS from data loader
const domainDescriptions = contentLoader.getDomainDescriptions();
const facetDescriptions = contentLoader.getFacetDescriptions();

export const DOMAINS: Record<DomainKey, { label: string; facets: string[] }> = {
  O: { 
    label: domainDescriptions.O.label, 
    facets: Object.keys(facetDescriptions.O) 
  },
  C: {
    label: domainDescriptions.C.label, 
    facets: Object.keys(facetDescriptions.C) 
  },
  E: {
    label: domainDescriptions.E.label, 
    facets: Object.keys(facetDescriptions.E) 
  },
  A: {
    label: domainDescriptions.A.label, 
    facets: Object.keys(facetDescriptions.A) 
  },
  N: {
    label: domainDescriptions.N.label, 
    facets: Object.keys(facetDescriptions.N) 
  }
};

export const DOMAIN_DESCRIPTIONS: Record<DomainKey, any> = domainDescriptions;

export const FACET_DESCRIPTIONS: Record<DomainKey, Record<string, string>> = facetDescriptions;

export const FACET_INTERPRETATIONS: Record<DomainKey, Record<string, {high:string;medium:string;low:string}>> = contentLoader.getFacetInterpretations();

export const P1_PROMPTS: Record<DomainKey, {q1:string;q2:string;q3:string}> = contentLoader.getAssessmentPrompts();

export const FACET_HINTS: Record<DomainKey, Record<string,string>> = contentLoader.getFacetHints();

export const ANCHORS: Record<DomainKey, Record<string, string[]>> = contentLoader.getAnchorStatements();

export const CONFIRM: Record<DomainKey, Record<string,string>> = contentLoader.getConfirmationQuestions();

export function canonicalFacets(domain: DomainKey): string[] {
  return DOMAINS[domain].facets.slice();
}
