// Comprehensive TypeScript types for all content files

export type DomainKey = 'O' | 'C' | 'E' | 'A' | 'N';
export type FacetLevel = 'high' | 'medium' | 'low';
export type QuestionKey = 'q1' | 'q2' | 'q3';

// Domain description types
export interface DomainDescription {
  label: string;
  shortDescription: string;
  fullDescription: string;
  results: {
    low: string;
    neutral: string;
    high: string;
  };
}

export type DomainDescriptions = {
  [K in DomainKey]: DomainDescription;
};

// Facet description types
export type FacetDescriptions = {
  [K in DomainKey]: Record<string, string>;
};

// Facet interpretation types
export interface FacetInterpretation {
  high: string;
  medium: string;
  low: string;
}

export type FacetInterpretations = {
  [K in DomainKey]: Record<string, FacetInterpretation>;
};

// Assessment prompt types
export interface AssessmentPrompt {
  q1: string;
  q2: string;
  q3: string;
}

export type AssessmentPrompts = {
  [K in DomainKey]: AssessmentPrompt;
};

// Facet hints types
export type FacetHints = {
  [K in DomainKey]: Record<string, string>;
};

// Anchor statements types
export type AnchorStatements = {
  [K in DomainKey]: Record<string, string[]>;
};

// Confirmation questions types
export type ConfirmationQuestions = {
  [K in DomainKey]: Record<string, string>;
};

// Validation result types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Content validation interface
export interface ContentValidator {
  validateDomainDescriptions(data: any): ValidationResult;
  validateFacetDescriptions(data: any): ValidationResult;
  validateFacetInterpretations(data: any): ValidationResult;
  validateAssessmentPrompts(data: any): ValidationResult;
  validateFacetHints(data: any): ValidationResult;
  validateAnchorStatements(data: any): ValidationResult;
  validateConfirmationQuestions(data: any): ValidationResult;
  validateAll(): ValidationResult;
}

// Expected facet names for each domain
export const EXPECTED_FACETS: Record<DomainKey, string[]> = {
  O: ['Imagination', 'Artistic Interests', 'Emotionality', 'Adventurousness', 'Intellect', 'Liberalism'],
  C: ['Self-Efficacy', 'Orderliness', 'Dutifulness', 'Achievement-Striving', 'Self-Discipline', 'Cautiousness'],
  E: ['Friendliness', 'Gregariousness', 'Assertiveness', 'Activity Level', 'Excitement-Seeking', 'Cheerfulness'],
  A: ['Trust', 'Morality', 'Altruism', 'Cooperation', 'Modesty', 'Sympathy'],
  N: ['Anxiety', 'Anger', 'Depression', 'Self-Consciousness', 'Immoderation', 'Vulnerability']
};

// Validation rules
export const VALIDATION_RULES = {
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 2000,
  MIN_INTERPRETATION_LENGTH: 50,
  MAX_INTERPRETATION_LENGTH: 1000,
  MIN_PROMPT_LENGTH: 20,
  MAX_PROMPT_LENGTH: 200,
  MIN_HINT_LENGTH: 10,
  MAX_HINT_LENGTH: 100,
  MIN_ANCHOR_LENGTH: 10,
  MAX_ANCHOR_LENGTH: 150,
  MIN_CONFIRMATION_LENGTH: 20,
  MAX_CONFIRMATION_LENGTH: 200
} as const;
