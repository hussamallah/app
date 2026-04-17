import domainDescriptions from './domain_descriptions.json';
import facetDescriptions from './facet_descriptions.json';
import facetInterpretations from './facet_interpretations.json';
import assessmentPrompts from './assessment_prompts.json';
import facetHints from './facet_hints.json';
import anchorStatements from './anchor_statements.json';
import confirmationQuestions from './confirmation_questions.json';
import { 
  DomainKey, 
  DomainDescriptions, 
  FacetDescriptions, 
  FacetInterpretations, 
  AssessmentPrompts, 
  FacetHints, 
  AnchorStatements, 
  ConfirmationQuestions,
  ValidationResult
} from './types';

// Re-export types for convenience
export type { DomainKey } from './types';
import { contentValidator } from './validator';

// Content loader class
export class ContentLoader {
  private static instance: ContentLoader;
  
  private constructor() {}
  
  public static getInstance(): ContentLoader {
    if (!ContentLoader.instance) {
      ContentLoader.instance = new ContentLoader();
    }
    return ContentLoader.instance;
  }
  
  // Domain descriptions with validation
  public getDomainDescriptions(): DomainDescriptions {
    const data = domainDescriptions as DomainDescriptions;
    const validation = contentValidator.validateDomainDescriptions(data);
    if (!validation.isValid) {
      console.error('Domain descriptions validation failed:', validation.errors);
      throw new Error(`Domain descriptions validation failed: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.warn('Domain descriptions validation warnings:', validation.warnings);
    }
    return data;
  }
  
  public getDomainDescription(domain: DomainKey): DomainDescriptions[DomainKey] {
    return this.getDomainDescriptions()[domain];
  }
  
  // Facet descriptions with validation
  public getFacetDescriptions(): FacetDescriptions {
    const data = facetDescriptions as FacetDescriptions;
    const validation = contentValidator.validateFacetDescriptions(data);
    if (!validation.isValid) {
      console.error('Facet descriptions validation failed:', validation.errors);
      throw new Error(`Facet descriptions validation failed: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.warn('Facet descriptions validation warnings:', validation.warnings);
    }
    return data;
  }
  
  public getFacetDescription(domain: DomainKey, facet: string): string {
    return this.getFacetDescriptions()[domain]?.[facet] || '';
  }
  
  // Facet interpretations with validation
  public getFacetInterpretations(): FacetInterpretations {
    const data = facetInterpretations as FacetInterpretations;
    const validation = contentValidator.validateFacetInterpretations(data);
    if (!validation.isValid) {
      console.error('Facet interpretations validation failed:', validation.errors);
      throw new Error(`Facet interpretations validation failed: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.warn('Facet interpretations validation warnings:', validation.warnings);
    }
    return data;
  }
  
  public getFacetInterpretation(domain: DomainKey, facet: string, level: 'high' | 'medium' | 'low'): string {
    return this.getFacetInterpretations()[domain]?.[facet]?.[level] || '';
  }
  
  // Assessment prompts with validation
  public getAssessmentPrompts(): AssessmentPrompts {
    const data = assessmentPrompts as AssessmentPrompts;
    const validation = contentValidator.validateAssessmentPrompts(data);
    if (!validation.isValid) {
      console.error('Assessment prompts validation failed:', validation.errors);
      throw new Error(`Assessment prompts validation failed: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.warn('Assessment prompts validation warnings:', validation.warnings);
    }
    return data;
  }
  
  public getAssessmentPrompt(domain: DomainKey, question: 'q1' | 'q2' | 'q3'): string {
    return this.getAssessmentPrompts()[domain]?.[question] || '';
  }
  
  // Facet hints with validation
  public getFacetHints(): FacetHints {
    const data = facetHints as FacetHints;
    const validation = contentValidator.validateFacetHints(data);
    if (!validation.isValid) {
      console.error('Facet hints validation failed:', validation.errors);
      throw new Error(`Facet hints validation failed: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.warn('Facet hints validation warnings:', validation.warnings);
    }
    return data;
  }
  
  public getFacetHint(domain: DomainKey, facet: string): string {
    return this.getFacetHints()[domain]?.[facet] || '';
  }
  
  // Anchor statements with validation
  public getAnchorStatements(): AnchorStatements {
    const data = anchorStatements as AnchorStatements;
    const validation = contentValidator.validateAnchorStatements(data);
    if (!validation.isValid) {
      console.error('Anchor statements validation failed:', validation.errors);
      throw new Error(`Anchor statements validation failed: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.warn('Anchor statements validation warnings:', validation.warnings);
    }
    return data;
  }
  
  public getAnchorStatementsForFacet(domain: DomainKey, facet: string): [string, string] | null {
    const statements = this.getAnchorStatements()[domain]?.[facet];
    if (statements && statements.length >= 2) {
      return [statements[0], statements[1]];
    }
    return null;
  }
  
  // Confirmation questions with validation
  public getConfirmationQuestions(): ConfirmationQuestions {
    const data = confirmationQuestions as ConfirmationQuestions;
    const validation = contentValidator.validateConfirmationQuestions(data);
    if (!validation.isValid) {
      console.error('Confirmation questions validation failed:', validation.errors);
      throw new Error(`Confirmation questions validation failed: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.warn('Confirmation questions validation warnings:', validation.warnings);
    }
    return data;
  }
  
  public getConfirmationQuestion(domain: DomainKey, facet: string): string {
    return this.getConfirmationQuestions()[domain]?.[facet] || '';
  }
  
  // Utility methods
  public getAllDomains(): DomainKey[] {
    return ['O', 'C', 'E', 'A', 'N'];
  }
  
  public getFacetsForDomain(domain: DomainKey): string[] {
    const descriptions = this.getFacetDescriptions()[domain];
    return descriptions ? Object.keys(descriptions) : [];
  }
  
  // Enhanced validation methods
  public validateAllContent(): ValidationResult {
    const results: ValidationResult[] = [
      contentValidator.validateDomainDescriptions(domainDescriptions),
      contentValidator.validateFacetDescriptions(facetDescriptions),
      contentValidator.validateFacetInterpretations(facetInterpretations),
      contentValidator.validateAssessmentPrompts(assessmentPrompts),
      contentValidator.validateFacetHints(facetHints),
      contentValidator.validateAnchorStatements(anchorStatements),
      contentValidator.validateConfirmationQuestions(confirmationQuestions)
    ];

    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  // Legacy validation method for backward compatibility
  public validateContent(): { isValid: boolean; errors: string[] } {
    const validation = this.validateAllContent();
    return {
      isValid: validation.isValid,
      errors: validation.errors
    };
  }
}

// Export singleton instance
export const contentLoader = ContentLoader.getInstance();

// Export individual getters for convenience
export const getDomainDescriptions = () => contentLoader.getDomainDescriptions();
export const getFacetDescriptions = () => contentLoader.getFacetDescriptions();
export const getFacetInterpretations = () => contentLoader.getFacetInterpretations();
export const getAssessmentPrompts = () => contentLoader.getAssessmentPrompts();
export const getFacetHints = () => contentLoader.getFacetHints();
export const getAnchorStatements = () => contentLoader.getAnchorStatements();
export const getConfirmationQuestions = () => contentLoader.getConfirmationQuestions();